'use client'

import { useState } from 'react'

const SECTIONS = [
  {
    heading: 'One list, both of you',
    body: 'Whenever either of you notices something has run out, add it here. **Both of you see it instantly** — no more losing it in a chat or a personal notes app.',
  },
  {
    heading: 'Tick it off after you buy it',
    body: 'Tap an item once you have bought it. It moves down into **Bought**, stamped with when and who.',
    callout: 'Tapped the wrong thing? An **Undo** button appears for a few seconds. After that, the item is simply in Bought — tap it to put it back.',
  },
  {
    heading: 'It warns you before you double up',
    body: 'As you type, the list checks itself. If the item is **already on the list**, it says so and will not let you add a second copy. If one of you **bought it in the last couple of days**, it tells you who and when — and you can still tap **Add anyway**.',
  },
  {
    heading: 'Bought is a record, not a bin',
    body: 'Buying something again creates a **new entry**, so the old purchase stays on the record. Over time Bought shows how often you actually get through something.',
    callout: '**Clear** wipes the Bought list. That erases the purchase history, so the warnings above lose what they check against.',
  },
  {
    heading: 'Notifications',
    body: 'Adding something notifies **your partner only**, so whoever is out next already knows. Ticking off and undoing are both silent.',
    callout: 'Push only works on the installed home-screen app, and each of you turns it on separately in Profile.',
  },
]

function renderRich(text) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <span key={i} className="text-[#D8513E] dark:text-[#E8675A] font-bold">{p.slice(2, -2)}</span>
    }
    return <span key={i}>{p}</span>
  })
}

export default function ShoppingHelpSheet({ isOpen, onClose }) {
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
      <div className={`relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className="w-9 h-[3px] rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] mx-auto mb-[14px]" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-[#2A1810] dark:text-[#FAF3F1]">How the shopping list works</h2>
          <button
            onClick={handleClose}
            className="p-1 text-[#B19A8B] dark:text-[#7A5848] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col">
          {SECTIONS.map((s, i) => (
            <div key={i} className={`pb-4 ${i === 0 ? '' : 'pt-4'} ${i === SECTIONS.length - 1 ? '' : 'border-b border-[#F5EDE9] dark:border-[#261812]'}`}>
              <h3 className="text-[14.5px] font-bold text-[#2A1810] dark:text-[#FAF3F1] tracking-[-0.1px] mb-[7px]">{s.heading}</h3>
              <p className="text-[13.5px] text-[#7A5C4E] dark:text-[#C89080] leading-[1.55]">{renderRich(s.body)}</p>
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
