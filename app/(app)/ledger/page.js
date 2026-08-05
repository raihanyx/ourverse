import { redirect } from 'next/navigation'
import {
  getAuthUser,
  resolveCoupleId,
  coupleMembersQuery,
  splitMembers,
} from '@/lib/data/getAppSession'
import { fetchRates } from '@/lib/exchangeRates'
import LedgerClient from './LedgerClient'
import PageTransition from '@/app/components/PageTransition'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ledger | Ourverse',
}

export default async function LedgerPage() {
  // Auth, then one parallel batch. profile/partner used to be a serial stage in
  // front of the expenses query; folding them in removes a round-trip.
  const { supabase, user, coupleId: metaCoupleId } = await getAuthUser()
  const coupleId = await resolveCoupleId(metaCoupleId)

  const [{ data: members }, { data: expenses }, ratesResult] = await Promise.all([
    coupleMembersQuery(supabase, coupleId),
    supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    fetchRates(),
  ])

  const { profile, partner } = splitMembers(members, user.id)
  if (!profile?.couple_id) redirect('/onboarding')

  return (
    <PageTransition>
      <LedgerClient
        initialExpenses={expenses ?? []}
        currentUserId={user.id}
        currentUserName={profile.name}
        partnerId={partner?.id ?? null}
        partnerName={partner?.name ?? 'your partner'}
        coupleId={coupleId}
        baseCurrency={profile?.base_currency ?? 'IDR'}
        rates={ratesResult?.rates ?? null}
      />
    </PageTransition>
  )
}
