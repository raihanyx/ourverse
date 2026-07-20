import webpush from 'web-push'

let configured = false

function ensureConfigured() {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subject) {
    console.warn('[push] VAPID env vars missing; skipping send')
    return false
  }
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

/**
 * Fetch a user's push subscriptions and send a notification.
 * Caller is responsible for RLS visibility (recipient must be in same couple).
 * @param {object} supabase - Authenticated server Supabase client
 * @param {string} recipientUserId - User to push to
 * @param {{title:string, body:string, url?:string, tag?:string}} payload
 */
export async function sendPushToUser(supabase, recipientUserId, payload) {
  return sendPushToUserImpl(supabase, recipientUserId, payload)
}

/**
 * Notify the *other* member of a couple — never the actor themselves.
 * `buildPayload` receives the actor's display name so callers can phrase the body.
 * Safe to fire inside `after()`: it never throws.
 * @param {object} supabase - Authenticated server Supabase client
 * @param {string} actorUserId - Whoever performed the action (must NOT be notified)
 * @param {string} coupleId
 * @param {(actorName: string) => {title:string, body:string, url?:string, tag?:string}} buildPayload
 */
export async function notifyPartner(supabase, actorUserId, coupleId, buildPayload) {
  try {
    if (!actorUserId || !coupleId) return { sent: 0, failed: 0 }

    const { data: members } = await supabase
      .from('users')
      .select('id, name')
      .eq('couple_id', coupleId)

    const partner = members?.find(m => m.id !== actorUserId)
    // Belt and braces: never push to the actor's own devices
    if (!partner?.id || partner.id === actorUserId) return { sent: 0, failed: 0 }

    const actorName = members.find(m => m.id === actorUserId)?.name?.trim() || 'Your partner'

    return await sendPushToUserImpl(supabase, partner.id, buildPayload(actorName))
  } catch (err) {
    console.warn('[push] notifyPartner failed', err?.message)
    return { sent: 0, failed: 0 }
  }
}

async function sendPushToUserImpl(supabase, recipientUserId, payload) {
  if (!ensureConfigured()) return { sent: 0, failed: 0 }
  if (!recipientUserId) return { sent: 0, failed: 0 }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', recipientUserId)

  if (error || !subs || subs.length === 0) return { sent: 0, failed: 0 }

  const json = JSON.stringify(payload)
  const stale = []
  let sent = 0
  let failed = 0

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        )
        sent++
      } catch (err) {
        failed++
        const code = err?.statusCode
        if (code === 404 || code === 410) stale.push(s.id)
        else console.warn('[push] send failed', code, err?.body || err?.message)
      }
    })
  )

  if (stale.length > 0) {
    // Must go through the RPC: the sender is not the owner of these rows, and the
    // delete policy is `user_id = auth.uid()`, so a direct delete silently no-ops.
    // prune_push_subscriptions is SECURITY DEFINER, scoped to the caller's couple.
    const { error: pruneError } = await supabase.rpc('prune_push_subscriptions', {
      p_ids: stale,
    })
    if (pruneError) console.warn('[push] prune failed', pruneError.message)
  }

  return { sent, failed }
}
