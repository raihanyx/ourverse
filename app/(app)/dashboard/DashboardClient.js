'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/currency'
import { fetchDashboardRaw, buildDashboardView } from '@/lib/data/dashboardData'
import { readDashboardSnapshot, writeDashboardSnapshot, clearDashboardSnapshot } from '@/lib/dashboardSnapshot'
import PageTransition from '@/app/components/PageTransition'
import PerfBeacon from '@/app/components/PerfBeacon' // [perf]
import BalanceCard from './BalanceCard'
import TogetherCard from './TogetherCard'
import InviteCodeBadge from './InviteCodeBadge'
import RecentExpenses from './RecentExpenses'
import DailyConversationSection from './DailyConversationSection'
import DashboardLoading from './loading'

/**
 * The dashboard is the PWA's launch screen (manifest start_url), so it must
 * never wait on the server to appear.
 *
 * - page.js is static: Vercel serves the HTML from its CDN, and proxy.js skips
 *   /dashboard, so no function (and no cold start) sits in front of it.
 * - On mount it shows the last-seen data from the device (lib/dashboardSnapshot)
 *   immediately, or the skeleton on a first-ever open.
 * - It then loads fresh data from the browser straight to Supabase (RLS) and
 *   swaps it in. Realtime + tab focus keep it fresh while open.
 *
 * Measured before this change: 3-11s from tap to dashboard on a cold Vercel
 * instance (docs/audits/launch-performance-2026-10-28.md).
 */

const subscribeNoop = () => () => {}
const serverSnapshot = () => null

function DailySkeleton() {
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

export default function DashboardClient() {
  const router = useRouter()

  // Device snapshot. null during prerender/hydration (no localStorage on the
  // server), then the stored value right after — no hydration mismatch.
  const snapshot = useSyncExternalStore(subscribeNoop, readDashboardSnapshot, serverSnapshot)

  // Fresh data from this session; wins over the snapshot once it arrives.
  const [fresh, setFresh] = useState(null)
  // Set once auth resolves to a different user than the snapshot's owner.
  const [sessionUserId, setSessionUserId] = useState(null)
  const [perfPage, setPerfPage] = useState(null) // [perf]

  const loading = useRef(false)
  const rerun = useRef(false)
  const perfSent = useRef(false) // [perf]
  const perfFirstDataAt = useRef(null) // [perf] when anything (snapshot or fresh) first rendered

  const load = useCallback(async () => {
    if (loading.current) {
      rerun.current = true
      return
    }
    loading.current = true
    const perfT0 = performance.now() // [perf]
    const perfHadSnapshot = !!readDashboardSnapshot() // [perf]
    try {
      const supabase = createClient()
      // Local cookie read; only touches the network when the access token has
      // expired and needs refreshing (about once a day).
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!session) {
        // Offline / Supabase unreachable: keep showing the snapshot.
        if (error && isAuthRetryableFetchError(error)) return
        clearDashboardSnapshot()
        router.replace('/login')
        return
      }
      const user = session.user
      setSessionUserId(user.id)
      const perfAuthMs = performance.now() - perfT0 // [perf]

      let coupleId = user.user_metadata?.couple_id ?? null
      if (!coupleId) {
        const { data: row } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
        coupleId = row?.couple_id ?? null
      }
      if (!coupleId) {
        router.replace('/onboarding')
        return
      }

      const perfQ = {} // [perf]
      const raw = await fetchDashboardRaw(
        supabase,
        { userId: user.id, coupleId, localDate: todayISO() },
        perfQ,
      )
      // Keep the last good rates if the rates endpoint had nothing this time.
      if (!raw.rates) raw.rates = readDashboardSnapshot()?.raw?.rates ?? null

      const next = { v: 1, userId: user.id, coupleId, savedAt: Date.now(), raw }
      writeDashboardSnapshot(next)
      setFresh(next)

      // [perf] first fresh load of this document only
      if (!perfSent.current) {
        perfSent.current = true
        setPerfPage({
          mode: 'static-shell',
          hadSnapshot: perfHadSnapshot,
          shownAt: perfFirstDataAt.current,
          authMs: Math.round(perfAuthMs),
          freshAt: Math.round(performance.now()),
          q: perfQ,
        })
      }
    } catch (err) {
      // Network or query failure: keep whatever is on screen.
      console.error('[dashboard] refresh failed:', err)
    } finally {
      loading.current = false
      if (rerun.current) {
        rerun.current = false
        load()
      }
    }
  }, [router])

  // Initial load.
  useEffect(() => {
    load()
  }, [load])

  const current = fresh ?? snapshot
  // Never show another account's data, e.g. after switching users.
  const data = current && (!sessionUserId || current.userId === sessionUserId) ? current : null
  const coupleId = data?.coupleId ?? null

  // [perf] time from navigation start until real content (not skeleton) is on screen
  useEffect(() => {
    if (data && perfFirstDataAt.current === null) perfFirstDataAt.current = Math.round(performance.now())
  }, [data])

  // Realtime: partner adds/settles an expense or sets the anniversary.
  useEffect(() => {
    if (!coupleId) return
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-' + coupleId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, payload => {
        const row = payload.new ?? payload.old
        if (row?.couple_id === coupleId) load()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples' }, payload => {
        if (payload.new?.id === coupleId) load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId, load])

  // Backstop for missed realtime events: refresh on return to the app.
  // Cheap now — it goes straight to Supabase, not through Vercel.
  useEffect(() => {
    let last = 0
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 30_000) return
      last = Date.now()
      load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (!data) return <DashboardLoading />

  const view = buildDashboardView(data.raw, data.userId)
  const today = todayISO()
  const todayLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
  // A snapshot from yesterday must not show yesterday's question.
  const daily = data.raw.dailyDate === today ? data.raw.daily : null

  return (
    <PageTransition>
      <div>
        {perfPage && <PerfBeacon page={perfPage} />}

        {/* Greeting bar */}
        <div className="flex items-start justify-between pb-2">
          <div>
            <p className="text-[12px] text-[#B19A8B] dark:text-[#7A5848] mb-0.5">{todayLabel}</p>
            <h1 className="text-[22px] font-bold text-[#2A1810] dark:text-[#FAF3F1] tracking-[-0.4px]">
              Hey, {view.profile?.name} 👋
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#FCE3DC] dark:bg-[#3D1E18] flex items-center justify-center border border-[#D8513E]/20 dark:border-[#E8675A]/20 flex-shrink-0">
            <span className="text-[15px] font-bold text-[#D8513E] dark:text-[#E8675A]">
              {view.myInitial}
            </span>
          </div>
        </div>

        {/* Daily Conversation */}
        <div className="mt-2">
          {daily ? (
            <DailyConversationSection
              // Remount only when the conversation itself changed, so a
              // background refresh never resets an open answer sheet.
              key={`${daily.conversation.id}:${!!daily.myAnswer}:${!!daily.partnerAnswer}:${daily.streak}`}
              coupleId={data.coupleId}
              userId={data.userId}
              partnerName={view.partnerName}
              myInitial={view.myInitial}
              partnerInitial={view.partnerInitial}
              initialData={daily}
              initialDate={today}
            />
          ) : (
            <DailySkeleton />
          )}
        </div>

        {/* Balance section */}
        <div className="mt-4">
          <BalanceCard
            theyOweMeEntries={view.theyOweMeEntries}
            iOweThemEntries={view.iOweThemEntries}
            theyOweMeUnified={view.theyOweMeUnified}
            iOweThemUnified={view.iOweThemUnified}
            baseCurrency={view.baseCurrency}
            partnerName={view.partnerName}
            noExpensesYet={view.noExpensesYet}
            balanceSettled={view.balanceSettled}
          />
        </div>

        {/* Together hero */}
        <div className="mt-6">
          <TogetherCard
            anniversaryDate={view.couple?.anniversary_date ?? null}
            coupleId={data.coupleId}
            onSaved={load}
          />
        </div>

        {/* Recent expenses */}
        {view.recent.length > 0 && (
          <div className="mt-6">
            <RecentExpenses
              expenses={view.recent}
              userId={data.userId}
              partnerName={view.partnerName}
              today={today}
            />
          </div>
        )}

        {/* Invite code */}
        <div className="mt-6">
          <InviteCodeBadge code={view.couple?.invite_code} />
        </div>
      </div>
    </PageTransition>
  )
}
