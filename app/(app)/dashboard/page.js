import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  getAuthUser,
  resolveCoupleId,
  coupleMembersQuery,
  splitMembers,
} from '@/lib/data/getAppSession'
import { sumByCurrency } from '@/lib/currency'
import { fetchRates, computeUnifiedTotal } from '@/lib/exchangeRates'
import RealtimeRefresh from './RealtimeRefresh'
import BalanceCard from './BalanceCard'
import TogetherCard from './TogetherCard'
import InviteCodeBadge from './InviteCodeBadge'
import RecentExpenses from './RecentExpenses'
import DailyConversation, { DailyConversationFallback } from './DailyConversation'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Dashboard | Ourverse',
}

export default async function DashboardPage() {
  // Auth first, then EVERYTHING else in one parallel batch. The profile/partner
  // rows used to be a separate serial stage in front of this — folding them in
  // removes a full network round-trip from every dashboard load.
  const { supabase, user, coupleId: metaCoupleId } = await getAuthUser()
  const coupleId = await resolveCoupleId(metaCoupleId)

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
  const serverLocalDate = new Date().toLocaleDateString('en-CA')

  const [
    { data: members },
    { data: couple },
    { data: unpaidExpenses },
    { data: recentExpenses },
    ratesResult,
  ] = await Promise.all([
    coupleMembersQuery(supabase, coupleId),
    supabase
      .from('couples')
      .select('invite_code, anniversary_date, created_at')
      .eq('id', coupleId)
      .single(),
    supabase
      .from('expenses')
      .select('amount, currency, paid_by_user_id')
      .eq('couple_id', coupleId)
      .eq('is_paid', false),
    supabase
      .from('expenses')
      .select('id, name, amount, currency, category, date, paid_by_user_id')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(3),
    fetchRates(),
  ])

  const { profile, partner } = splitMembers(members, user.id)
  if (!profile?.couple_id) redirect('/onboarding')

  const expenses = unpaidExpenses ?? []
  // The recent-3 query already answers "are there any expenses?", so the
  // dedicated count query it replaced was a wasted round-trip.
  const hasAnyExpenses = (recentExpenses?.length ?? 0) > 0
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
            <p className="text-[12px] text-[#B19A8B] dark:text-[#7A5848] mb-0.5">{todayLabel}</p>
            <h1 className="text-[22px] font-bold text-[#2A1810] dark:text-[#FAF3F1] tracking-[-0.4px]">
              Hey, {profile.name} 👋
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#FCE3DC] dark:bg-[#3D1E18] flex items-center justify-center border border-[#D8513E]/20 dark:border-[#E8675A]/20 flex-shrink-0">
            <span className="text-[15px] font-bold text-[#D8513E] dark:text-[#E8675A]">
              {profile.name?.[0]?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Daily Conversation — streamed: it is the slowest query on the page,
            so the rest of the dashboard must not wait behind it. */}
        <div className="mt-2">
          <Suspense fallback={<DailyConversationFallback />}>
            <DailyConversation
              partnerName={partnerName}
              myInitial={profile.name?.[0]?.toUpperCase() ?? '?'}
              partnerInitial={partner?.name?.[0]?.toUpperCase() ?? '?'}
              serverLocalDate={serverLocalDate}
            />
          </Suspense>
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
