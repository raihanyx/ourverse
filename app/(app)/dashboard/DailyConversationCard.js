'use client'

import { useState, useEffect } from 'react'

function nextLocalMidnight() {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function AvatarWithCheck({ initial, tone, answered }) {
  const bg = tone === 'me' ? 'var(--v2-accentDim)' : 'var(--v2-blueBg)'
  const fg = tone === 'me' ? 'var(--v2-accent)' : 'var(--v2-blue)'
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        border: '2px solid var(--v2-bg)',
      }}>
        {initial}
      </div>
      {answered && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: '50%',
          background: '#4ADE80', border: '2px solid var(--v2-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={7} height={7} viewBox="0 0 24 24" fill="none" stroke="#0A1A0A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default function DailyConversationCard({
  conversation,
  myAnswer,
  partnerAnswer,
  streak,
  myInitial,
  partnerInitial,
  onAnswer,
  onResults,
}) {
  const [now, setNow] = useState(Date.now())
  const [target] = useState(() => nextLocalMidnight())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const myAnswered = !!myAnswer
  const partnerAnswered = !!partnerAnswer

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--v2-t1)', letterSpacing: '-0.2px', margin: 0 }}>
          Daily Conversation
        </h2>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 26, padding: '0 10px', borderRadius: 9999,
          border: '1px solid rgba(var(--v2-accentRgb), 0.33)',
          background: 'var(--v2-accentDim)',
          color: 'var(--v2-accent)', fontSize: 12, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {streak}<span style={{ fontSize: 12, marginLeft: 2 }}>🔥</span>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--v2-dcGrad)',
        borderRadius: 22,
        padding: 16,
        border: '1px solid var(--v2-border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top row: countdown chip + emoji bubble */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 26, marginBottom: 14,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 22, padding: '0 9px', borderRadius: 9999,
            background: 'rgba(var(--v2-accentRgb), 0.10)',
            border: '1px solid rgba(var(--v2-accentRgb), 0.33)',
          }}>
            <span style={{ fontSize: 11 }}>⏱️</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--v2-accent)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              Next in {fmtCountdown(target - now)}
            </span>
          </div>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}>
            {conversation.emoji}
          </div>
        </div>

        {/* Question */}
        <p style={{
          fontSize: 18, fontWeight: 700, color: 'var(--v2-t1)',
          lineHeight: 1.3, letterSpacing: '-0.2px',
          marginBottom: 16, textWrap: 'pretty',
        }}>
          {conversation.question}
        </p>

        {/* Bottom row: avatars + action button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Me — z-index 2 so my check stays visible in the overlap */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <AvatarWithCheck initial={myInitial} tone="me" answered={myAnswered} />
            </div>
            {/* Partner — behind */}
            <div style={{ marginLeft: -10, position: 'relative', zIndex: 1 }}>
              <AvatarWithCheck initial={partnerInitial} tone="partner" answered={partnerAnswered} />
            </div>
          </div>

          <button
            onClick={myAnswered ? onResults : onAnswer}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 10,
              border: '1px solid rgba(var(--v2-accentRgb), 0.53)',
              background: 'var(--v2-accentDim)', color: 'var(--v2-accent)',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {myAnswered && <span style={{ fontSize: 11 }}>↺</span>}
            {myAnswered ? 'Results' : 'Answer'}
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--v2-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
