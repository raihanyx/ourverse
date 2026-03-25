import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LedgerClient from './LedgerClient'

export const metadata = {
  title: 'Ledger — Ourverse',
}

export default async function LedgerPage() {
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
    .select('*')
    .eq('couple_id', profile.couple_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <LedgerClient
      initialExpenses={expenses ?? []}
      currentUserId={user.id}
      currentUserName={profile.name}
      partnerId={partner?.id ?? null}
      partnerName={partner?.name ?? 'your partner'}
      coupleId={profile.couple_id}
    />
  )
}
