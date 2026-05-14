import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import { sumByCurrency } from '@/lib/currency'
import { fetchRates, computeUnifiedTotal } from '@/lib/exchangeRates'
import RealtimeRefresh from './RealtimeRefresh'
import BalanceCard from './BalanceCard'
import TogetherCard from './TogetherCard'
import InviteCodeBadge from './InviteCodeBadge'
import RecentExpenses from './RecentExpenses'
import DailyConversationSection from './DailyConversationSection'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Dashboard | Ourverse',
}

export default async function DashboardPage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  const [
    { data: couple },
    { data: unpaidExpenses },
    { count: totalExpenseCount },
    { data: recentExpenses },
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
    supabase
      .from('expenses')
      .select('id, name, amount, currency, category, date, paid_by_user_id')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false })
      .limit(3),
    fetchRates(),
  ])

  const expenses = unpaidExpenses ?? []
  const hasAnyExpenses = (totalExpenseCount ?? 0) > 0
  const rates = ratesResult?.rates ?? null
  const baseCurrency = profile?.base_currency ?? 'IDR'

  const theyOweMe = expenses.filter(e => e.paid_by_user_id === user.id)
  const iOweThem = expenses.filter(e => e.paid_by_user_id !== user.id)

  const theyOweMeTotals = sumByCurrency(theyOweMe)
  const iOweThemTotals = sumByCurrency(iOweThem)

  const theyOweMeEntries = Object.entries(theyOweMeTotals).filter(([, v]) => v > 0)
  const iOweThemEntries = Object.entries(iOweThemTotals).filter(([, v]) => v > 0)

  const theyOweMeUnified = computeUnifiedTotal(theyOweMeTotals, baseCurrency, rates)
  const iOweThemUnified = computeUnifiedTotal(iOweThemTotals, baseCurrency, rates)

  const partnerName = partner?.name ?? 'your partner'
  const balanceSettled = hasAnyExpenses && theyOweMeEntries.length === 0 && iOweThemEntries.length === 0
  const noExpensesYet = !hasAnyExpenses

  return (
    <PageTransition>
      <div>
        <RealtimeRefresh coupleId={profile.couple_id} />

        {/* Greeting bar */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] mb-0.5">{todayLabel}</p>
            <h1 className="text-[22px] font-bold text-[#1C1210] dark:text-[#FAF3F1] tracking-[-0.4px]">
              Hey, {profile.name} 👋
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center border border-[#C2493A]/20 dark:border-[#E8675A]/20 flex-shrink-0">
            <span className="text-[15px] font-bold text-[#C2493A] dark:text-[#E8675A]">
              {profile.name?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Daily Conversation */}
        <div className="mt-2">
          <DailyConversationSection
            coupleId={profile.couple_id}
            userId={user.id}
            partnerName={partnerName}
            myInitial={profile.name?.[0]?.toUpperCase() ?? '?'}
            partnerInitial={partner?.name?.[0]?.toUpperCase() ?? '?'}
          />
        </div>

        {/* Balance section */}
        <div className="mt-4">
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
        </div>

        {/* Together hero */}
        <div className="mt-6">
          <TogetherCard
            anniversaryDate={couple?.anniversary_date ?? null}
            coupleId={profile.couple_id}
          />
        </div>

        {/* Recent expenses */}
        {recentExpenses && recentExpenses.length > 0 && (
          <div className="mt-6">
            <RecentExpenses
              expenses={recentExpenses}
              userId={user.id}
              partnerName={partnerName}
            />
          </div>
        )}

        {/* Invite code */}
        <div className="mt-6">
          <InviteCodeBadge code={couple?.invite_code} />
        </div>
      </div>
    </PageTransition>
  )
}
