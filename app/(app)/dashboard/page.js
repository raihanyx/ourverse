import { createClient } from '@/lib/supabase/server'
import { formatAmount, sumByCurrency } from '@/lib/currency'
import { fetchRates, computeUnifiedTotal } from '@/lib/exchangeRates'
import Link from 'next/link'
import CurrencySettings from './CurrencySettings'
import RealtimeRefresh from './RealtimeRefresh'

export const metadata = {
  title: 'Dashboard — Ourverse',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('name, couple_id, base_currency, couples(invite_code, anniversary_date, created_at)')
    .eq('id', user.id)
    .single()

  const { data: partner } = await supabase
    .from('users')
    .select('id, name')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  // Fetch unpaid expenses + total count + live rates in parallel
  const [
    { data: unpaidExpenses },
    { count: totalExpenseCount },
    ratesResult,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, currency, paid_by_user_id')
      .eq('couple_id', profile.couple_id)
      .eq('is_paid', false),
    supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', profile.couple_id),
    fetchRates(),
  ])

  const expenses = unpaidExpenses ?? []
  const hasAnyExpenses = (totalExpenseCount ?? 0) > 0
  const rates = ratesResult?.rates ?? null
  const couple = profile?.couples
  const baseCurrency = profile?.base_currency ?? 'IDR'

  // Two-sided balance
  const theyOweMe = expenses.filter(e => e.paid_by_user_id === user.id)
  const iOweThem = expenses.filter(e => e.paid_by_user_id !== user.id)

  const theyOweMeTotals = sumByCurrency(theyOweMe)
  const iOweThemTotals = sumByCurrency(iOweThem)

  const theyOweMeEntries = Object.entries(theyOweMeTotals).filter(([, v]) => v > 0)
  const iOweThemEntries = Object.entries(iOweThemTotals).filter(([, v]) => v > 0)

  // Unified totals in base currency (null if rates unavailable)
  const theyOweMeUnified = computeUnifiedTotal(theyOweMeTotals, baseCurrency, rates)
  const iOweThemUnified = computeUnifiedTotal(iOweThemTotals, baseCurrency, rates)

  const partnerName = partner?.name ?? 'your partner'
  const balanceSettled = hasAnyExpenses && theyOweMeEntries.length === 0 && iOweThemEntries.length === 0
  const noExpensesYet = !hasAnyExpenses

  const memberSince = couple?.created_at
    ? new Date(couple.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-5">
      <RealtimeRefresh coupleId={profile.couple_id} />

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Hey, {profile?.name}
        </h1>
        {partner && (
          <p className="text-gray-400 text-sm mt-0.5">
            Connected with {partner.name}
          </p>
        )}
      </div>

      {/* Balance card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Balance
          </h2>
          <Link
            href="/ledger"
            className="text-xs text-violet-600 font-medium hover:underline"
          >
            View ledger →
          </Link>
        </div>

        {noExpensesYet ? (
          <div>
            <p className="text-sm text-gray-400 mb-1">No expenses logged yet.</p>
            <Link href="/ledger" className="text-sm text-violet-600 font-medium hover:underline">
              Add your first one →
            </Link>
          </div>
        ) : balanceSettled ? (
          <p className="text-sm font-medium text-gray-400">
            You&apos;re all settled up ✓
          </p>
        ) : (
          <div className="space-y-1.5">
            {theyOweMeEntries.length > 0 && (
              <p className="text-sm font-medium text-gray-800 break-words">
                {partnerName} owes you{' '}
                {theyOweMeEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
              </p>
            )}
            {iOweThemEntries.length > 0 && (
              <p className="text-sm font-medium text-gray-800 break-words">
                You owe {partnerName}{' '}
                {iOweThemEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
              </p>
            )}
            {/* Converted totals in base currency — only shown when rates are available */}
            {(theyOweMeUnified !== null || iOweThemUnified !== null) && (
              <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                {theyOweMeUnified !== null && theyOweMeEntries.length > 0 && (
                  <p>≈ {partnerName} owes you {formatAmount(theyOweMeUnified, baseCurrency)}</p>
                )}
                {iOweThemUnified !== null && iOweThemEntries.length > 0 && (
                  <p>≈ You owe {partnerName} {formatAmount(iOweThemUnified, baseCurrency)}</p>
                )}
                <p className="text-gray-300">at current rates · updated hourly</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Couple space card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Your couple space
        </h2>

        <div>
          <p className="text-xs text-gray-400 mb-0.5">Invite code</p>
          <p className="text-2xl font-bold tracking-[0.2em] font-mono text-violet-700">
            {couple?.invite_code}
          </p>
        </div>

        {memberSince && (
          <p className="text-xs text-gray-300">Together since {memberSince}</p>
        )}

        <CurrencySettings current={baseCurrency} />
      </div>
    </div>
  )
}
