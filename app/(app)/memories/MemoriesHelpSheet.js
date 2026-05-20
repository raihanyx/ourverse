'use client'

import { useState } from 'react'

const SECTIONS = [
  {
    heading: 'What shows up here',
    body: 'Every bucket list item or calendar date you mark as done becomes a memory. Both of you share the same list — it’s your joint history of things you’ve done together.',
  },
  {
    heading: 'Move back to bucket',
    body: 'Tap **Edit**, select memories, then **Move to bucket**. The item goes back to your bucket list as undone, ready to be marked done again later.',
    callout: 'If the item was originally planned from the **Calendar**, it also goes back to its original planned date on the calendar. Items added only from the bucket list return to the bucket list only.',
  },
  {
    heading: 'Delete',
    body: 'Tap **Edit**, select memories, then **Delete**. This permanently removes the memory, the bucket list item, and the calendar entry if there was one. It cannot be undone.',
    callout: 'Use **Move to bucket** if you want to put something back on the active list. Use **Delete** only if you want to remove it entirely.',
  },
]

function renderRich(text) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <span key={i} className="text-[#D8513E] dark:text-[#E8675A] font-bold">
          {p.slice(2, -2)}
        </span>
      )
    }
    return <span key={i}>{p}</span>
  })
}

export default function MemoriesHelpSheet({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 220)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className={`absolute inset-0 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'rgba(var(--v2-overlayBase), 0.65)' }}
        onClick={handleClose}
      />
      <div className={`relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className="w-9 h-[3px] rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-[#2A1810] dark:text-[#FAF3F1]">
            How memories work
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-[#B19A8B] dark:text-[#7A5848] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col">
          {SECTIONS.map((s, i) => (
            <div
              key={i}
              className={`pb-4 ${i === 0 ? '' : 'pt-4'} ${i === SECTIONS.length - 1 ? '' : 'border-b border-[#F5EDE9] dark:border-[#261812]'}`}
            >
              <h3 className="text-[14.5px] font-bold text-[#2A1810] dark:text-[#FAF3F1] tracking-[-0.1px] mb-[7px]">
                {s.heading}
              </h3>
              <p className="text-[13.5px] text-[#7A5C4E] dark:text-[#C89080] leading-[1.55]">
                {renderRich(s.body)}
              </p>
              {s.callout && (
                <div className="mt-2.5 px-[13px] py-[11px] rounded-xl border border-[#ECDFD2] dark:border-[#3A2418] bg-[#F8F2EB] dark:bg-[#221714] text-[13px] text-[#7A5C4E] dark:text-[#C89080] leading-[1.55] whitespace-pre-line">
                  {renderRich(s.callout)}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleClose}
          className="w-full h-12 rounded-[14px] bg-[#D8513E] dark:bg-[#E8675A] hover:bg-[#C04830] dark:hover:bg-[#D45849] text-white text-[15px] font-semibold cursor-pointer transition-colors mt-2"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
