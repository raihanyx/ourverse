import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchRates } from '@/lib/exchangeRates'
import LedgerClient from './LedgerClient'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Ledger | Ourverse',
}

export default async function LedgerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, couple_id, base_currency')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: partner } = await supabase
    .from('users')
    .select('id, name')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

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
