import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageTransition from '@/app/components/PageTransition'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'Profile | Ourverse',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <PageTransition>
      <ProfileClient name={profile?.name ?? ''} email={user.email} />
    </PageTransition>
  )
}
