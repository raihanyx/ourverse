import { createClient } from '@/lib/supabase/server'

/**
 * Auth helper for server actions that need couple_id.
 *
 * Fast path: reads couple_id from auth user metadata (written at couple creation/join,
 * no extra DB query). Falls back to a users table query for accounts that pre-date
 * the metadata write, or if metadata is missing for any reason.
 *
 * Returns { supabase, user, coupleId } on success, or { error } on failure.
 */
export async function getActionContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Fast path — couple_id in auth metadata, no DB query needed
  let coupleId = user.user_metadata?.couple_id

  // Fallback — query users table (accounts pre-dating metadata write)
  if (!coupleId) {
    const { data: profile } = await supabase
      .from('users')
      .select('couple_id')
      .eq('id', user.id)
      .single()
    coupleId = profile?.couple_id
  }

  if (!coupleId) return { error: 'No couple space found.' }

  return { supabase, user, coupleId }
}
