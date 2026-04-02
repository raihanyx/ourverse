import { createClient } from '@/lib/supabase/server'
import { getAppSession } from '@/lib/data/getAppSession'
import PageTransition from '@/app/components/PageTransition'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const { profile, partner } = await getAppSession()
  const supabase = await createClient()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  // Use first day of next month to get a clean upper bound
  const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, '0')}-01`

  const [
    { data: entries },
    { data: memories },
    { data: couple },
  ] = await Promise.all([
    supabase
      .from('calendar_entries')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .gte('date', monthStart)
      .lt('date', nextMonth)
      .order('date', { ascending: true }),
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .gte('date', monthStart)
      .lt('date', nextMonth)
      .order('date', { ascending: true }),
    supabase
      .from('couples')
      .select('anniversary_date')
      .eq('id', profile.couple_id)
      .single(),
  ])

  return (
    <PageTransition>
      <CalendarClient
        initialEntries={entries ?? []}
        initialMemories={memories ?? []}
        anniversaryDate={couple?.anniversary_date ?? null}
        currentUserId={profile.id}
        coupleId={profile.couple_id}
        partnerName={partner?.name ?? null}
        initialYear={year}
        initialMonth={month}
      />
    </PageTransition>
  )
}
