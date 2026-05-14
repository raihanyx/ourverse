'use server'

import { getActionContext } from '@/lib/data/getActionContext'
import { revalidatePath } from 'next/cache'
import { pickQuestion } from '@/lib/questions'

function yesterdayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

export async function getOrCreateDailyConversation(localDate) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return { error: 'Invalid date' }

  const question = pickQuestion(coupleId, localDate)

  // Race-safe: ON CONFLICT (couple_id, date) DO NOTHING
  await supabase
    .from('daily_conversations')
    .upsert(
      { couple_id: coupleId, date: localDate, question: question.text },
      { onConflict: 'couple_id,date', ignoreDuplicates: true }
    )

  const { data: conversation } = await supabase
    .from('daily_conversations')
    .select('id, date, question')
    .eq('couple_id', coupleId)
    .eq('date', localDate)
    .single()

  if (!conversation) return { error: 'Could not load conversation' }

  const [{ data: answers }, { data: couple }] = await Promise.all([
    supabase
      .from('daily_answers')
      .select('user_id, text, answered_at')
      .eq('conversation_id', conversation.id),
    supabase
      .from('couples')
      .select('streak, last_completed_date')
      .eq('id', coupleId)
      .single(),
  ])

  const myAnswer = answers?.find(a => a.user_id === user.id) ?? null
  const partnerAnswer = answers?.find(a => a.user_id !== user.id) ?? null

  let streak = couple?.streak ?? 0
  let streakBroke = false
  let previousStreak = 0
  const yesterdayStr = yesterdayOf(localDate)

  if (streak > 0 && couple?.last_completed_date && couple.last_completed_date < yesterdayStr) {
    previousStreak = streak
    streakBroke = true
    await supabase
      .from('couples')
      .update({ streak: 0 })
      .eq('id', coupleId)
    streak = 0
  }

  return {
    conversation: {
      id: conversation.id,
      date: conversation.date,
      question: conversation.question,
      emoji: question.emoji,
    },
    myAnswer,
    partnerAnswer,
    streak,
    streakBroke,
    previousStreak,
  }
}

export async function submitAnswer(conversationId, text, localDate) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  const trimmed = text?.trim()
  if (!trimmed) return { error: 'Answer cannot be empty' }
  if (trimmed.length > 1000) return { error: 'Answer too long (max 1000 characters)' }

  const { data: conv } = await supabase
    .from('daily_conversations')
    .select('id, date')
    .eq('id', conversationId)
    .eq('couple_id', coupleId)
    .single()
  if (!conv) return { error: 'Conversation not found' }

  const { data: existing } = await supabase
    .from('daily_answers')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()
  if (existing) return { error: 'Already answered' }

  const { data: newAnswer, error: insertErr } = await supabase
    .from('daily_answers')
    .insert({
      conversation_id: conversationId,
      couple_id: coupleId,
      user_id: user.id,
      text: trimmed,
    })
    .select('user_id, text, answered_at')
    .single()

  if (insertErr) return { error: 'Failed to save answer' }

  const { count } = await supabase
    .from('daily_answers')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  const yesterdayStr = yesterdayOf(localDate)
  let newStreak

  if (count === 2) {
    const { data: couple } = await supabase
      .from('couples')
      .select('streak, last_completed_date')
      .eq('id', coupleId)
      .single()

    newStreak = couple?.last_completed_date === yesterdayStr
      ? (couple?.streak ?? 0) + 1
      : 1

    await supabase
      .from('couples')
      .update({ streak: newStreak, last_completed_date: localDate, last_any_answer_date: localDate })
      .eq('id', coupleId)
  } else {
    await supabase
      .from('couples')
      .update({ last_any_answer_date: localDate })
      .eq('id', coupleId)
  }

  revalidatePath('/dashboard')

  return { success: true, answer: newAnswer, newStreak }
}
