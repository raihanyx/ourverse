'use client'

import { useEffect, useState } from 'react'

export default function DailyConversationResults({
  open,
  onClose,
  dc,
  partnerName,
  myInitial,
  partnerInitial,
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) setVisible(true)
    else setTimeout(() => setVisible(false), 220)
  }, [open])

  if (!visible && !open) return null

  const bothAnswered = !!dc.myAnswer && !!dc.partnerAnswer

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 30,
        background: 'rgba(var(--v2-overlayBase), 0.7)',
        opacity: open ? 1 : 0,
        transition: 'opacity 200ms',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--v2-card)',
          borderRadius: '24px 24px 0 0',
          paddingTop: 10, paddingLeft: 20, paddingRight: 20,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 26px)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 3, borderRadius: 9999, background: 'var(--v2-border)', margin: '0 auto 14px' }} />

        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--v2-t1)' }}>Daily Conversation</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--v2-t3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 4 }}>
          {/* Question card */}
          <div style={{
            background: 'var(--v2-surface)', border: '1px solid var(--v2-border)',
            borderRadius: 14, padding: '12px 14px',
          }}>
            <p style={{
              fontSize: 10.5, fontWeight: 700, color: 'var(--v2-t3)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, margin: '0 0 6px',
            }}>
              Today&apos;s question
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--v2-t1)', lineHeight: 1.35, margin: 0 }}>
              {dc.question}
            </p>
          </div>

          {/* Chat bubbles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {/* Partner (left) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--v2-blueBg)', color: 'var(--v2-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {partnerInitial}
              </div>
              <div style={{
                background: dc.partnerAnswer ? 'var(--v2-surface)' : 'transparent',
                border: dc.partnerAnswer ? '1px solid var(--v2-border)' : '1px dashed var(--v2-border)',
                borderRadius: '14px 14px 14px 4px',
                padding: '9px 12px', maxWidth: '78%',
                fontSize: 13.5, lineHeight: 1.4,
                color: dc.partnerAnswer ? 'var(--v2-t1)' : 'var(--v2-t3)',
                fontStyle: dc.partnerAnswer ? 'normal' : 'italic',
              }}>
                {dc.partnerAnswer?.text || 'No answer yet.'}
              </div>
            </div>

            {/* Me (right) */}
            {dc.myAnswer && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'var(--v2-accent)', color: 'white',
                  borderRadius: '14px 14px 4px 14px',
                  padding: '9px 12px', maxWidth: '78%',
                  fontSize: 13.5, lineHeight: 1.4,
                }}>
                  {dc.myAnswer.text}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--v2-accentDim)', color: 'var(--v2-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {myInitial}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ fontSize: 11.5, color: 'var(--v2-t3)', textAlign: 'center', padding: '4px 0', margin: 0 }}>
            {bothAnswered
              ? '✨ Both answered. New question at midnight.'
              : `You'll see ${partnerName}'s answer once they reply.`}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '100%', height: 46, borderRadius: 13, border: 'none',
              background: 'var(--v2-accent)', color: 'white',
              fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
