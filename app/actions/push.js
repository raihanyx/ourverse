'use server'

import { getActionContext } from '@/lib/data/getActionContext'

export async function savePushSubscription(sub) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
    return { error: 'Invalid subscription payload' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        couple_id: coupleId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        user_agent: sub.userAgent ?? null,
      },
      { onConflict: 'endpoint' }
    )

  if (error) return { error: 'Failed to save subscription' }
  return { success: true }
}

export async function deletePushSubscription(endpoint) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user } = ctx

  if (!endpoint) return { error: 'Missing endpoint' }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return { error: 'Failed to remove subscription' }
  return { success: true }
}
