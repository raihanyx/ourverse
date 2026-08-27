import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import ShoppingClient from './ShoppingClient'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Shopping | Ourverse' }

export default async function ShoppingPage() {
  const { profile, partner } = await getAppSession()
  const supabase = await createClient()

  // Open items are unbounded; bought items are capped so the section can't grow
  // forever. Both land in one client array, split on is_bought at render. The
  // bought window doubles as the corpus the add-input's recent-purchase hint
  // matches against, so it is deliberately deeper than the section needs.
  const [{ data: open }, { data: bought }] = await Promise.all([
    supabase
      .from('shopping_items')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('is_bought', false)
      .order('sort_at', { ascending: false }),
    supabase
      .from('shopping_items')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('is_bought', true)
      .order('bought_at', { ascending: false })
      .limit(50),
  ])

  return (
    <PageTransition>
      <ShoppingClient
        initialItems={[...(open ?? []), ...(bought ?? [])]}
        coupleId={profile.couple_id}
        currentUserId={profile.id}
        partnerName={partner?.name ?? null}
      />
    </PageTransition>
  )
}
