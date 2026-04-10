import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const getAppSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fast path: couple_id in user metadata — run profile + partner in parallel
  const coupleId = user.user_metadata?.couple_id
  let profile, partner

  if (coupleId) {
    const [profileResult, partnerResult] = await Promise.all([
      supabase.from('users').select('id, couple_id, name, base_currency').eq('id', user.id).single(),
      supabase.from('users').select('id, name').eq('couple_id', coupleId).neq('id', user.id).single(),
    ])
    profile = profileResult.data
    partner = partnerResult.data
  } else {
    // Fallback: accounts pre-dating metadata write — sequential queries
    const { data: profileData } = await supabase
      .from('users')
      .select('id, couple_id, name, base_currency')
      .eq('id', user.id)
      .single()
    profile = profileData

    if (profile?.couple_id) {
      const { data: partnerData } = await supabase
        .from('users')
        .select('id, name')
        .eq('couple_id', profile.couple_id)
        .neq('id', user.id)
        .single()
      partner = partnerData
    }
  }

  if (!profile?.couple_id) redirect('/onboarding')

  return { user, profile, partner: partner ?? null }
})
