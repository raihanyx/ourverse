import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaidExpensesClient from './PaidExpensesClient'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Paid expenses | Ourverse',
}

export default async function PaidExpensesPage({ searchParams }) {
  const { tab } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: partner } = await supabase
    .from('users')
    .select('id, name')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, paid_by_user_id, is_paid, name, amount, currency, category, date, notes, created_at')
    .eq('couple_id', profile.couple_id)
    .eq('is_paid', true)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <PageTransition>
      <PaidExpensesClient
        expenses={expenses ?? []}
        currentUserId={user.id}
        partnerId={partner?.id ?? null}
        partnerName={partner?.name ?? 'your partner'}
        initialTab={tab === 'i_owe' ? 'i_owe' : 'owe_me'}
      />
    </PageTransition>
  )
}
