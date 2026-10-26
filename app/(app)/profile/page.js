import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import { userTodayISO } from '@/lib/data/userToday'
import PageTransition from '@/app/components/PageTransition'
import ProfileClient from './ProfileClient'

export const metadata = {
  title: 'Profile | Ourverse',
}

// `todayStr` is the user's YYYY-MM-DD — the server clock is UTC, a day behind
// UTC+7 until 07:00.
function formatDuration(anniversaryDate, todayStr) {
  if (!anniversaryDate) return null
  const start = new Date(anniversaryDate + 'T00:00:00')
  const now = new Date(todayStr + 'T00:00:00')
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

  const [{ data: couple }, today] = await Promise.all([
    supabase
      .from('couples')
      .select('invite_code, anniversary_date')
      .eq('id', profile.couple_id)
      .single(),
    userTodayISO(),
  ])

  const duration = formatDuration(couple?.anniversary_date ?? null, today)

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
