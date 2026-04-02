import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import BucketClient from './BucketClient'

export default async function BucketPage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  const [{ data: items }, { count: memoriesCount }, { data: calEntries }] = await Promise.all([
    supabase
      .from('bucket_items')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('couple_id', profile.couple_id),
    supabase
      .from('calendar_entries')
      .select('bucket_item_id, date')
      .eq('couple_id', profile.couple_id)
      .not('bucket_item_id', 'is', null),
  ])

  const calendarDates = Object.fromEntries(
    (calEntries ?? []).map(e => [e.bucket_item_id, e.date])
  )

  return (
    <PageTransition>
      <BucketClient
        initialItems={items ?? []}
        initialCalendarDates={calendarDates}
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
