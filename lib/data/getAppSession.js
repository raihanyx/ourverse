import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getVerifiedClaims, claimsToUser } from '@/lib/supabase/jwks'
import { redirect } from 'next/navigation'

/**
 * Stage 1 — auth only.
 *
 * Returns the verified user plus the couple_id already carried in auth metadata,
 * WITHOUT touching the users table. That omission is the point: callers that also
 * need profile rows should fetch them in the same Promise.all as their own page
 * data, so the session lookup stops being a separate serial round-trip.
 *
 * React-cached, so multiple components in one render share a single auth call.
 *
 * coupleId is null for accounts pre-dating the metadata write — callers fall
 * back to getAppSession() via resolveCoupleId() in that case.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()

  // Verified locally against the cached JWKS — no Auth-server round-trip.
  const user = claimsToUser(await getVerifiedClaims(supabase))

  if (!user) redirect('/login')

  return { supabase, user, coupleId: user.user_metadata?.couple_id ?? null }
})

/** Both members of a couple in one query — cheaper than two filtered queries. */
export function coupleMembersQuery(supabase, coupleId) {
  return supabase
    .from('users')
    .select('id, couple_id, name, base_currency')
    .eq('couple_id', coupleId)
}

/** Split the two-row result of coupleMembersQuery into profile + partner. */
export function splitMembers(rows, userId) {
  return {
    profile: rows?.find(r => r.id === userId) ?? null,
    partner: rows?.find(r => r.id !== userId) ?? null,
  }
}

/**
 * Full session — user + profile + partner.
 *
 * Convenience wrapper for pages with no other data to fetch. Pages that DO fetch
 * their own data should call getAuthUser() and put coupleMembersQuery() into
 * their own Promise.all instead, to avoid a serial round-trip.
 */
export const getAppSession = cache(async () => {
  const { supabase, user, coupleId } = await getAuthUser()

  if (coupleId) {
    const { data: rows } = await coupleMembersQuery(supabase, coupleId)
    const { profile, partner } = splitMembers(rows, user.id)
    if (profile?.couple_id) return { user, profile, partner }
  }

  // Fallback: accounts pre-dating the metadata write — sequential queries
  const { data: profile } = await supabase
    .from('users')
    .select('id, couple_id, name, base_currency')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: partner } = await supabase
    .from('users')
    .select('id, name')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  return { user, profile, partner: partner ?? null }
})

/**
 * couple_id for a page that will fetch its own data. Free on the fast path;
 * legacy accounts pay for the old lookup.
 */
export async function resolveCoupleId(metaCoupleId) {
  if (metaCoupleId) return metaCoupleId
  const { profile } = await getAppSession()
  return profile.couple_id
}
