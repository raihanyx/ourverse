import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import MemoriesClient from './MemoriesClient'

export default async function MemoriesPage() {
  const { profile } = await getAppSession()
  const supabase = await createClient()

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
