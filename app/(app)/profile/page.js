import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'Profile | Ourverse',
}

function formatDuration(anniversaryDate) {
  if (!anniversaryDate) return null
  const start = new Date(anniversaryDate + 'T00:00:00')
  const now = new Date()
  if (start > now) return null

  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (months < 0) { years--; months += 12 }

  if (years > 0 && months > 0) return `${years}y ${months}m`
  if (years > 0) return `${years}y`
  if (months > 0) return `${months}m`
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return `${days}d`
}

export default async function ProfilePage() {
  const { user, profile, partner } = await getAppSession()
  const supabase = await createClient()

  const { data: couple } = await supabase
    .from('couples')
    .select('invite_code, anniversary_date')
    .eq('id', profile.couple_id)
    .single()

  const duration = formatDuration(couple?.anniversary_date ?? null)

  return (
    <PageTransition>
      <ProfileClient
        name={profile?.name ?? ''}
        email={user.email}
        partnerName={partner?.name ?? null}
        inviteCode={couple?.invite_code ?? null}
        duration={duration}
        baseCurrency={profile?.base_currency ?? 'IDR'}
      />
    </PageTransition>
  )
}
