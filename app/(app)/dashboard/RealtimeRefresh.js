'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeRefresh({ coupleId }) {
  const router = useRouter()
  const lastVisibilityRefresh = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couples' },
        (payload) => {
          if (payload.new?.id !== coupleId) return
          router.refresh()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId, router])

  // Fallback: refresh when user returns to the tab, in case realtime missed an event
  // Time-gated to 30s to avoid hammering the server on rapid tab switches
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastVisibilityRefresh.current < 30_000) return
      lastVisibilityRefresh.current = now
      router.refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [router])

  return null
}
