// Shared by server pages (via getAppSession.js) and the browser dashboard
// loader — no server-only imports here.

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
