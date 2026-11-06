import { coupleMembersQuery, splitMembers } from '@/lib/data/coupleMembers'

/**
 * Everything /ledger shows, fetched from the BROWSER straight to Supabase
 * (RLS-scoped, the same policies the server page used). No Vercel function is
 * involved, so a cold server cannot delay it. Exchange rates come from
 * /api/rates, which is CDN-cached (ISR).
 *
 * Throws if a core query fails, so the caller keeps showing the snapshot
 * instead of replacing good data with empty data.
 */
export async function fetchLedgerRaw(supabase, { userId, coupleId }) {
  const [members, expenses, rates] = await Promise.all([
    coupleMembersQuery(supabase, coupleId),
    supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    // Rates are optional — a failure just hides the converted totals.
    fetch('/api/rates')
      .then(r => (r.ok ? r.json() : null))
      .then(j => j?.rates ?? null)
      .catch(() => null),
  ])

  if (members.error) throw members.error
  if (expenses.error) throw expenses.error

  const { profile, partner } = splitMembers(members.data, userId)
  return { profile, partner, expenses: expenses.data ?? [], rates }
}
