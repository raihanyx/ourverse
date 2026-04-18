import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PaidExpensesClient from './PaidExpensesClient'
import PageTransition from '@/app/components/PageTransition'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Paid expenses | Ourverse',
}

export default async function PaidExpensesPage({ searchParams }) {
  const { tab } = await searchParams
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

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
        coupleId={profile.couple_id}
        initialTab={tab === 'i_owe' ? 'i_owe' : 'owe_me'}
      />
    </PageTransition>
  )
}
