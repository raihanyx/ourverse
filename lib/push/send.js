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
    await supabase.from('push_subscriptions').delete().in('id', stale)
  }

  return { sent, failed }
}
