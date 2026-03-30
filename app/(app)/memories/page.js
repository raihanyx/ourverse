import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageTransition from '@/app/components/PageTransition'
import MemoriesClient from './MemoriesClient'

export default async function MemoriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .eq('couple_id', profile.couple_id)
    .order('date', { ascending: false })

  return (
    <PageTransition>
      <MemoriesClient initialMemories={memories ?? []} coupleId={profile.couple_id} />
    </PageTransition>
  )
}
