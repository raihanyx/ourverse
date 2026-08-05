import { getAuthUser, resolveCoupleId } from '@/lib/data/getAppSession'
import { loadDailyConversation } from '@/lib/data/getDailyConversation'
import DailyConversationSection from './DailyConversationSection'

/** Skeleton shown while the daily conversation streams in. */
export function DailyConversationFallback() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] w-36" />
        <div className="h-6 rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] w-14" />
      </div>
      <div className="h-[130px] rounded-[22px] bg-white dark:bg-[#2A1C18]" />
    </div>
  )
}

/**
 * Streamed inside <Suspense> so the rest of the dashboard paints without waiting
 * on this. getAuthUser() is React-cached, so this adds no extra auth round-trip.
 */
export default async function DailyConversation({
  partnerName,
  myInitial,
  partnerInitial,
  serverLocalDate,
}) {
  const { supabase, user, coupleId: metaCoupleId } = await getAuthUser()
  const coupleId = await resolveCoupleId(metaCoupleId)

  let initialData = null
  try {
    const result = await loadDailyConversation({ supabase, user, coupleId }, serverLocalDate)
    initialData = result && !result.error ? result : null
  } catch (err) {
    console.error('[Dashboard] daily prefetch failed:', err)
  }

  return (
    <DailyConversationSection
      coupleId={coupleId}
      userId={user.id}
      partnerName={partnerName}
      myInitial={myInitial}
      partnerInitial={partnerInitial}
      initialData={initialData}
      initialDate={serverLocalDate}
    />
  )
}
