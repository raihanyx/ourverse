'use client'

import { useState } from 'react'

const V2 = {
  bg:       'var(--v2-bg)',
  surface:  'var(--v2-card)',
  border:   'var(--v2-border)',
  t1:       'var(--v2-t1)',
  t2:       'var(--v2-t2)',
  t3:       'var(--v2-t3)',
  accent:   'var(--v2-accent)',
  accentBg: 'var(--v2-accentDim)',
}

function Bold({ children }) {
  return <span style={{ color: V2.accent, fontWeight: 600 }}>{children}</span>
}

// Render **bold** markup inline using accent color.
function renderBody(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/)
    if (m) return <Bold key={i}>{m[1]}</Bold>
    return <span key={i}>{p}</span>
  })
}

function Divider() {
  return <div style={{ height: 1, background: V2.border, margin: '12px 0' }} />
}

function Section({ title, body, callout }) {
  return (
    <div>
      <p className="text-[12.5px] font-semibold mb-1" style={{ color: V2.t1 }}>{title}</p>
      <p className="text-[11.5px] leading-[1.6]" style={{ color: V2.t2 }}>{renderBody(body)}</p>
      {callout && (
        <div
          className="rounded-[10px] px-[10px] py-2 mt-[6px]"
          style={{ background: V2.bg, border: `1px solid ${V2.border}` }}
        >
          <p className="text-[11.5px] leading-[1.7]" style={{ color: V2.t2 }}>{renderBody(callout)}</p>
        </div>
      )}
    </div>
  )
}

function DotRow({ color, glyph, label, body }) {
  return (
    <div className="flex items-start gap-2.5 py-[6px]">
      {glyph ? (
        <span style={{ color, fontSize: 12, lineHeight: '1.4' }}>{glyph}</span>
      ) : (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color, marginTop: 5 }}
        />
      )}
      <div>
        <p className="text-[11.5px] font-semibold leading-[1.4]" style={{ color: V2.t1 }}>{label}</p>
        <p className="text-[11.5px] leading-[1.5] mt-[1px]" style={{ color: V2.t2 }}>{body}</p>
      </div>
    </div>
  )
}

export default function CalendarHelpSheet({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => { setIsClosing(false); onClose() }, 220)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className={`absolute inset-0 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'rgba(var(--v2-overlayBase), 0.65)' }}
        onClick={handleClose}
      />
      <div
        className={`relative rounded-t-2xl p-4 max-h-[88vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ background: V2.surface, color: V2.t1 }}
      >
        <div className="w-8 h-[3px] rounded-sm mx-auto mb-[14px]" style={{ background: V2.border }} />

        <p className="text-[15px] font-semibold mb-3" style={{ color: V2.t1 }}>How the calendar works</p>

        {/* 1. Dots */}
        <div>
          <p className="text-[12.5px] font-semibold mb-[6px]" style={{ color: V2.t1 }}>Reading the dots</p>
          <div className="rounded-xl px-3 py-1" style={{ background: V2.bg, border: `1px solid ${V2.border}` }}>
            <DotRow
              color={V2.accent}
              label="Red"
              body="Something you've done together. Created when you mark a calendar entry or bucket item as done."
            />
            <div style={{ height: 1, background: V2.border }} />
            <DotRow
              color="var(--v2-blue)"
              label="Blue"
              body="Something you're planning together. Also creates a matching bucket list item to track and mark done."
            />
            <div style={{ height: 1, background: V2.border }} />
            <DotRow
              color="var(--v2-green)"
              label="Green"
              body="A personal plan (flight, appointment, etc.). Doesn't create a bucket list item, but your partner can still see it."
            />
            <div style={{ height: 1, background: V2.border }} />
            <DotRow
              color="var(--v2-orange)"
              glyph="♥"
              label="Heart"
              body="Marks your anniversary date. Appears every year on that day."
            />
          </div>
        </div>

        <Divider />

        <Section
          title="Planning a date together"
          body="Tap a date, then **Add → Together**. It creates the calendar entry and a matching bucket list item at the same time."
        />

        <Divider />

        <Section
          title="Personal entries"
          body="Tap a date, then **Add → Just me** for flights, appointments, and anything else just for you. Your partner can still see it to help coordinate."
        />

        <Divider />

        <Section
          title="Marking done & memories"
          body="Tap **Mark done** on any planned entry (or from the bucket list), pick the actual date, add a note. It becomes a memory and the dot turns red."
          callout="On **past dates**, tap **Log memory** to record something you did directly — no plan needed first."
        />

        <Divider />

        <Section
          title="Changed your mind?"
          body="Undo a memory from the Memories page. Calendar entries return to their original planned date; bucket-only items go back to the bucket list."
        />

        <button
          onClick={handleClose}
          className="w-full rounded-[10px] py-[10px] mt-[14px] text-[13px] font-semibold cursor-pointer transition-colors"
          style={{ background: V2.accent, color: 'white' }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
