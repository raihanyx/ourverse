import { loadDailyConversation } from '@/lib/data/getDailyConversation'
import { coupleMembersQuery, splitMembers } from '@/lib/data/coupleMembers'
import { sumByCurrency } from '@/lib/currency'
import { computeUnifiedTotal } from '@/lib/exchangeRates'
import { timed } from '@/lib/perf'

/**
 * Everything the dashboard shows, fetched from the BROWSER straight to
 * Supabase (RLS-scoped, same policies the server used). No Vercel function is
 * involved, so a cold server cannot delay it. Exchange rates come from
 * /api/rates, which is CDN-cached (ISR).
 *
 * Throws if any core query fails, so the caller keeps showing the snapshot
 * instead of replacing good data with empty data.
 *
 * `perfQ` (optional) collects per-request timings for the [perf] report.
 */
export async function fetchDashboardRaw(supabase, { userId, coupleId, localDate }, perfQ = {}) {
  const [members, couple, unpaid, recent, rates, daily] = await Promise.all([
    timed('members', coupleMembersQuery(supabase, coupleId), perfQ),
    timed('couple', supabase
      .from('couples')
      .select('invite_code, anniversary_date')
      .eq('id', coupleId)
      .single(), perfQ),
    timed('unpaid', supabase
      .from('expenses')
      .select('amount, currency, paid_by_user_id')
      .eq('couple_id', coupleId)
      .eq('is_paid', false), perfQ),
    timed('recent', supabase
      .from('expenses')
      .select('id, name, amount, currency, category, date, paid_by_user_id')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(3), perfQ),
    // Rates are optional — a failure just hides the converted totals.
    timed('rates', fetch('/api/rates')
      .then(r => (r.ok ? r.json() : null))
      .then(j => j?.rates ?? null)
      .catch(() => null), perfQ),
    timed('daily', loadDailyConversation({ supabase, user: { id: userId }, coupleId }, localDate)
      .catch(() => null), perfQ),
  ])

  for (const res of [members, couple, unpaid, recent]) {
    if (res.error) throw res.error
  }

  const { profile, partner } = splitMembers(members.data, userId)

  return {
    profile,
    partner,
    couple: couple.data,
    unpaid: unpaid.data ?? [],
    recent: recent.data ?? [],
    rates,
    daily: daily && !daily.error ? daily : null,
    dailyDate: localDate,
  }
}

/** Derive what the dashboard renders from the raw rows. Pure. */
export function buildDashboardView(raw, userId) {
  const baseCurrency = raw.profile?.base_currency ?? 'IDR'
  const theyOweMeTotals = sumByCurrency(raw.unpaid.filter(e => e.paid_by_user_id === userId))
  const iOweThemTotals = sumByCurrency(raw.unpaid.filter(e => e.paid_by_user_id !== userId))
  const theyOweMeEntries = Object.entries(theyOweMeTotals).filter(([, v]) => v > 0)
  const iOweThemEntries = Object.entries(iOweThemTotals).filter(([, v]) => v > 0)
  const hasAnyExpenses = raw.recent.length > 0

  return {
    profile: raw.profile,
    partnerName: raw.partner?.name ?? 'your partner',
    partnerInitial: raw.partner?.name?.[0]?.toUpperCase() ?? '?',
    myInitial: raw.profile?.name?.[0]?.toUpperCase() ?? '?',
    couple: raw.couple,
    recent: raw.recent,
    baseCurrency,
    theyOweMeEntries,
    iOweThemEntries,
    theyOweMeUnified: computeUnifiedTotal(theyOweMeTotals, baseCurrency, raw.rates),
    iOweThemUnified: computeUnifiedTotal(iOweThemTotals, baseCurrency, raw.rates),
    noExpensesYet: !hasAnyExpenses,
    balanceSettled: hasAnyExpenses && theyOweMeEntries.length === 0 && iOweThemEntries.length === 0,
  }
}
