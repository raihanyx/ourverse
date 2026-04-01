import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import { sumByCurrency } from '@/lib/currency'
import { fetchRates, computeUnifiedTotal } from '@/lib/exchangeRates'
import RealtimeRefresh from './RealtimeRefresh'
import BalanceCard from './BalanceCard'
import TogetherCard from './TogetherCard'
import InviteCodeBadge from './InviteCodeBadge'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Dashboard | Ourverse',
}

export default async function DashboardPage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  // Fetch couple info + unpaid expenses + total count + live rates in parallel
  const [
    { data: couple },
    { data: unpaidExpenses },
    { count: totalExpenseCount },
    ratesResult,
  ] = await Promise.all([
    supabase
      .from('couples')
      .select('invite_code, anniversary_date, created_at')
      .eq('id', profile.couple_id)
      .single(),
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
          Hey, {profile.name}
        </h1>
        {partner && (
          <p className="text-[#A07060] dark:text-[#D4A090] text-sm mt-0.5 flex items-center gap-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#E8675A] flex-shrink-0" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
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
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-4 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider">
          Your couple space
        </h2>

        <div>
          <p className="text-xs text-[#A07060] dark:text-[#D4A090] mb-2">Invite code</p>
          <InviteCodeBadge code={couple?.invite_code} />
        </div>

        {memberSince && (
          <p className="text-xs text-[#C4A89E] dark:text-[#A07868]">On Ourverse since {memberSince}</p>
        )}
      </div>
    </div>
    </PageTransition>
  )
}
