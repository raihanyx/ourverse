import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from './OnboardingClient'

export const metadata = {
  title: 'Connect | Ourverse',
}

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id, name')
    .eq('id', user.id)
    .single()

  // Already coupled — skip onboarding
  if (profile?.couple_id) redirect('/dashboard')

  return <OnboardingClient userName={profile?.name} />
}
