import { createClient } from '@/lib/supabase/server'
import { formatAmount, sumByCurrency } from '@/lib/currency'
import { fetchRates, computeUnifiedTotal } from '@/lib/exchangeRates'
import RealtimeRefresh from './RealtimeRefresh'
import BalanceCard from './BalanceCard'
import TogetherCard from './TogetherCard'
import PageTransition from '@/app/components/PageTransition'

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
    <PageTransition>
    <div className="space-y-5">
      <RealtimeRefresh coupleId={profile.couple_id} />

      <div>
        <h1 className="text-[22px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
          Hey, {profile?.name}
        </h1>
        {partner && (
          <p className="text-[#A07060] dark:text-[#D4A090] text-sm mt-0.5">
            Connected with {partner.name}
          </p>
        )}
      </div>

      {/* Balance card */}
      <BalanceCard
        theyOweMeEntries={theyOweMeEntries}
        iOweThemEntries={iOweThemEntries}
        theyOweMeUnified={theyOweMeUnified}
        iOweThemUnified={iOweThemUnified}
        baseCurrency={baseCurrency}
        partnerName={partnerName}
        noExpensesYet={noExpensesYet}
        balanceSettled={balanceSettled}
      />

      <TogetherCard
        anniversaryDate={couple?.anniversary_date ?? null}
        coupleId={profile.couple_id}
      />

      {/* Couple space card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-4">
        <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider">
          Your couple space
        </h2>

        <div>
          <p className="text-xs text-[#A07060] dark:text-[#D4A090] mb-0.5">Invite code</p>
          <p className="text-2xl font-bold tracking-[0.2em] font-mono text-[#C2493A] dark:text-[#F0907F]">
            {couple?.invite_code}
          </p>
        </div>

        {memberSince && (
          <p className="text-xs text-[#C4A89E] dark:text-[#A07868]">On Ourverse since {memberSince}</p>
        )}
      </div>
    </div>
    </PageTransition>
  )
}
