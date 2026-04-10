import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import { fetchRates } from '@/lib/exchangeRates'
import LedgerClient from './LedgerClient'
import PageTransition from '@/app/components/PageTransition'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ledger | Ourverse',
}

export default async function LedgerPage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  // Fetch expenses and live rates in parallel
  const [{ data: expenses }, ratesResult] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    fetchRates(),
  ])

  return (
    <PageTransition>
      <LedgerClient
        initialExpenses={expenses ?? []}
        currentUserId={user.id}
        currentUserName={profile.name}
        partnerId={partner?.id ?? null}
        partnerName={partner?.name ?? 'your partner'}
        coupleId={profile.couple_id}
        baseCurrency={profile?.base_currency ?? 'IDR'}
        rates={ratesResult?.rates ?? null}
      />
    </PageTransition>
  )
}
