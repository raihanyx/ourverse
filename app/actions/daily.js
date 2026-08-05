'use server'

import { getActionContext } from '@/lib/data/getActionContext'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { loadDailyConversation } from '@/lib/data/getDailyConversation'
import { notifyPartner } from '@/lib/push/send'

function yesterdayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

/**
 * Client-callable entry point. Server components should import
 * loadDailyConversation directly and pass the auth context they already hold —
 * calling this action from a server render costs an extra getUser() round-trip.
 */
export async function getOrCreateDailyConversation(localDate) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  return loadDailyConversation(ctx, localDate)
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

  // Notify the partner only — runs after the response so it never delays the answer
  after(() =>
    notifyPartner(supabase, user.id, coupleId, (actorName) => ({
      title: 'Ourverse',
      body: `${actorName} answered today's daily conversation`,
      url: '/dashboard',
      tag: `daily-${conversationId}`,
    }))
  )

  revalidatePath('/dashboard')

  return { success: true, answer: newAnswer, newStreak }
}
