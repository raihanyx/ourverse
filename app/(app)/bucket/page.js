import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import BucketClient from './BucketClient'

export default async function BucketPage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  const [{ data: items }, { count: memoriesCount }] = await Promise.all([
    supabase
      .from('bucket_items')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', profile.couple_id),
  ])

  return (
    <PageTransition>
      <BucketClient
        initialItems={items ?? []}
        currentUserId={profile.id}
        currentUserName={profile.name}
        partnerId={partner?.id ?? null}
        partnerName={partner?.name ?? null}
        coupleId={profile.couple_id}
        memoriesCount={memoriesCount ?? 0}
      />
    </PageTransition>
  )
}
