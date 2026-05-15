'use client'

import { useState, useRef, useEffect } from 'react'
import { submitAnswer } from '@/app/actions/daily'

export default function DailyConversationAnswer({ dc, onBack, onSubmit }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [error, setError] = useState(null)
  const taRef = useRef(null)
  const localDate = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    const t = setTimeout(() => taRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  async function handleSubmit() {
    const v = text.trim()
    if (!v || submitting) return
    setSubmitting(true)
    setError(null)
    const result = await submitAnswer(dc.conversation.id, v, localDate)
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onSubmit({ answer: result.answer, newStreak: result.newStreak })
  }

  const canSend = !!text.trim() && !submitting

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'radial-gradient(circle at 30% -10%, rgba(192,80,90,0.4) 0%, transparent 50%), linear-gradient(180deg, #2A1018 0%, #1A0810 60%, #14060B 100%)',
      display: 'flex', flexDirection: 'column',
      animation: 'dcSlideUp 280ms cubic-bezier(0.32,0.72,0,1)',
    }}>
      <style>{`@keyframes dcSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {/* Top bar */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        paddingLeft: 20, paddingRight: 20, paddingBottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A0810" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={() => setShowInfo(true)}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#C89080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} />
            <line x1={12} y1={16} x2={12} y2={12} />
            <line x1={12} y1={8} x2="12.01" y2={8} />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px 0' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#7A5848',
          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14,
        }}>
          Daily Conversation
        </p>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: '#FAF3F1',
          lineHeight: 1.25, letterSpacing: '-0.4px', margin: 0,
        }}>
          {dc.conversation.question}
        </h1>
      </div>

      <div style={{ flex: 1 }} />

      {/* Error */}
      {error && (
        <p style={{ textAlign: 'center', color: '#F0907F', fontSize: 13, padding: '0 20px 8px' }}>
          {error}
        </p>
      )}

      {/* Input bar */}
      <div style={{
        padding: `14px 16px`,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder="Write your answer"
          style={{
            flex: 1, minHeight: 40, padding: '10px 14px',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: '#FAF3F1', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', resize: 'none', lineHeight: 1.4,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: canSend ? '#E8675A' : 'rgba(255,255,255,0.12)',
            border: 'none', cursor: canSend ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, padding: 0, transition: 'background 150ms',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1={12} y1={19} x2={12} y2={5} />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>

      {/* "How it works" sheet */}
      {showInfo && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(10,6,5,0.7)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: '#2A1C18',
              borderRadius: '24px 24px 0 0',
              paddingTop: 10, paddingLeft: 20, paddingRight: 20,
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 26px)',
            }}
          >
            <div style={{ width: 36, height: 3, borderRadius: 9999, background: '#3A2418', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#FAF3F1' }}>How it works</span>
              <button onClick={() => setShowInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#7A5848" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
              {[
                'A new question appears every day at midnight, just for the two of you.',
                "Answer independently — you won't see each other's answer until you've both replied.",
                'Answer together every day to keep your streak alive. Miss a day and it resets.',
                'Your answers are saved forever — a growing archive of your daily conversations.',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#3D1E18', color: '#E8675A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#FAF3F1', flex: 1, margin: 0 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
