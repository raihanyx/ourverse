import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageTransition from '@/app/components/PageTransition'
import BucketClient from './BucketClient'

export default async function BucketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, couple_id, base_currency')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  const { data: coupleUsers } = await supabase
    .from('users')
    .select('id, name')
    .eq('couple_id', profile.couple_id)

  const partner = coupleUsers?.find(u => u.id !== user.id) ?? null

  const { data: items } = await supabase
    .from('bucket_items')
    .select('*')
    .eq('couple_id', profile.couple_id)
    .order('created_at', { ascending: false })

  return (
    <PageTransition>
      <BucketClient
        initialItems={items ?? []}
        currentUserId={profile.id}
        currentUserName={profile.name}
        partnerId={partner?.id ?? null}
        partnerName={partner?.name ?? null}
        coupleId={profile.couple_id}
      />
    </PageTransition>
  )
}
