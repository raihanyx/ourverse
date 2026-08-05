import { createClient } from '@/lib/supabase/server'
import { getVerifiedClaims, claimsToUser } from '@/lib/supabase/jwks'

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

  // Locally verified — no Auth-server round-trip in front of every mutation.
  // Authorization is still enforced by RLS in Postgres regardless.
  const user = claimsToUser(await getVerifiedClaims(supabase))
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
