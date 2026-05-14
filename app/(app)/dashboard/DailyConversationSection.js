'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDailyConversation } from '@/app/actions/daily'
import DailyConversationCard from './DailyConversationCard'
import DailyConversationAnswer from './DailyConversationAnswer'
import DailyConversationResults from './DailyConversationResults'

export default function DailyConversationSection({
  coupleId,
  userId,
  partnerName,
  myInitial,
  partnerInitial,
}) {
  const [dcData, setDcData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [toast, setToast] = useState(null)
  const supabase = useRef(createClient())

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA')

    getOrCreateDailyConversation(localDate)
    .then(data => {
      if (!data || data.error) {
        console.error('[DailyConversation] action error:', data?.error ?? 'no data returned')
        setLoading(false)
        return
      }
      setDcData(data)
      setLoading(false)

      if (data.streakBroke && data.previousStreak > 0) {
        const key = `dc_broke_${localDate}`
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1')
          setToast(`Streak ended at ${data.previousStreak} 🔥. Start a new one today!`)
          setTimeout(() => setToast(null), 5000)
        }
      }
    })
    .catch(err => {
      console.error('[DailyConversation] server action threw:', err)
      setLoading(false)
    })
  }, [])

  // Realtime: listen for partner's answer and update local state
  useEffect(() => {
    const convId = dcData?.conversation?.id
    if (!convId) return

    const channel = supabase.current
      .channel(`dc_${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'daily_answers',
        filter: `conversation_id=eq.${convId}`,
      }, payload => {
        if (payload.new.user_id !== userId) {
          setDcData(prev => prev ? {
            ...prev,
            partnerAnswer: {
              text: payload.new.text,
              answered_at: payload.new.answered_at,
              user_id: payload.new.user_id,
            },
          } : prev)
        }
      })
      .subscribe()

    return () => supabase.current.removeChannel(channel)
  }, [dcData?.conversation?.id, userId])

  function handleAnswerSubmit({ answer, newStreak }) {
    setDcData(prev => prev ? {
      ...prev,
      myAnswer: answer,
      ...(newStreak !== undefined ? { streak: newStreak } : {}),
    } : prev)
    setShowAnswer(false)
    setShowResults(true)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 rounded-full bg-[#3A2418] w-36" />
          <div className="h-6 rounded-full bg-[#3A2418] w-14" />
        </div>
        <div className="h-[130px] rounded-[22px] bg-[#2A1C18]" />
      </div>
    )
  }

  if (!dcData) return null

  return (
    <>
      {/* Streak-broke toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: 0, right: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center',
          padding: '0 16px', pointerEvents: 'none',
        }}>
          <div style={{
            background: '#3D1E18', color: '#FAF3F1', borderRadius: 12,
            padding: '10px 16px', fontSize: 13, fontWeight: 500,
            border: '1px solid rgba(232,103,90,0.27)',
            maxWidth: 320, textAlign: 'center',
          }}>
            {toast}
          </div>
        </div>
      )}

      <DailyConversationCard
        conversation={dcData.conversation}
        myAnswer={dcData.myAnswer}
        partnerAnswer={dcData.partnerAnswer}
        streak={dcData.streak}
        myInitial={myInitial}
        partnerInitial={partnerInitial}
        onAnswer={() => setShowAnswer(true)}
        onResults={() => setShowResults(true)}
      />

      {showAnswer && (
        <DailyConversationAnswer
          dc={dcData}
          onBack={() => setShowAnswer(false)}
          onSubmit={handleAnswerSubmit}
        />
      )}

      <DailyConversationResults
        open={showResults}
        onClose={() => setShowResults(false)}
        dc={{
          question: dcData.conversation.question,
          myAnswer: dcData.myAnswer,
          partnerAnswer: dcData.partnerAnswer,
        }}
        partnerName={partnerName}
        myInitial={myInitial}
        partnerInitial={partnerInitial}
      />
    </>
  )
}
