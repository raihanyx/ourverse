import { pickQuestion } from '@/lib/questions'

function yesterdayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

/**
 * Core daily-conversation load, taking an already-resolved auth context.
 *
 * Split out of the server action so server components can pass the context they
 * already have instead of paying for a second getUser() round-trip.
 *
 * ctx: { supabase, user, coupleId }
 */
export async function loadDailyConversation(ctx, localDate) {
  const { supabase, user, coupleId } = ctx

  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return { error: 'Invalid date' }

  // Read first. The row already exists for every open after the day's first, so
  // the common path is one round-trip; only the first open pays for the insert.
  let { data: conversation } = await supabase
    .from('daily_conversations')
    .select('id, date, question')
    .eq('couple_id', coupleId)
    .eq('date', localDate)
    .maybeSingle()

  const question = pickQuestion(coupleId, localDate)

  if (!conversation) {
    // Race-safe: ON CONFLICT (couple_id, date) DO NOTHING
    await supabase
      .from('daily_conversations')
      .upsert(
        { couple_id: coupleId, date: localDate, question: question.text },
        { onConflict: 'couple_id,date', ignoreDuplicates: true }
      )

    const { data: created } = await supabase
      .from('daily_conversations')
      .select('id, date, question')
      .eq('couple_id', coupleId)
      .eq('date', localDate)
      .maybeSingle()

    conversation = created
  }

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
    await supabase.from('couples').update({ streak: 0 }).eq('id', coupleId)
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
