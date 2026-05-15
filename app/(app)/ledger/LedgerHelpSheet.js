'use client'

import { useState, useEffect } from 'react'

const SECTIONS = [
  {
    heading: 'Log what is owed, not the full bill',
    body: 'Enter only the amount your partner owes you. If you split a cost, do the math first and log your partner’s share only. The two totals at the top show your running balance.',
    callout: 'You paid THB 400 for dinner together. Split equally: each pays THB 200. Log THB 200 as what your partner owes.',
  },
  {
    heading: 'Settling up',
    body: 'Tap **Mark paid** when an expense is settled. It moves out of your active list so only open balances stay visible.',
  },
  {
    heading: 'Bulk edit',
    body: 'Tap the pencil to enter select mode. Pick multiple items, then delete, mark paid, or mark unpaid in one tap.',
  },
]

function renderRich(text) {
  if (!text) return null
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <span key={i} className="text-[#C2493A] dark:text-[#E8675A] font-bold">
          {p.slice(2, -2)}
        </span>
      )
    }
    return <span key={i}>{p}</span>
  })
}

export default function LedgerHelpSheet({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setIsClosing(false)
    }
  }, [isOpen])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setMounted(false)
      setIsClosing(false)
      onClose()
    }, 220)
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.7)] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={handleClose}
      />
      <div className={`relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className="w-9 h-[3px] rounded-full bg-[#EDE0DC] dark:bg-[#3A2418] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
            How the ledger works
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-[#C4A89E] dark:text-[#7A5848] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] cursor-pointer"
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
              <h3 className="text-[14.5px] font-bold text-[#1C1210] dark:text-[#FAF3F1] tracking-[-0.1px] mb-[7px]">
                {s.heading}
              </h3>
              <p className="text-[13.5px] text-[#A07060] dark:text-[#C89080] leading-[1.55]">
                {renderRich(s.body)}
              </p>
              {s.callout && (
                <div className="mt-2.5 px-[13px] py-[11px] rounded-xl border border-[#EDE0DC] dark:border-[#3A2418] bg-[#FDF7F6] dark:bg-[#221714] text-[13px] text-[#A07060] dark:text-[#C89080] leading-[1.55] whitespace-pre-line">
                  {renderRich(s.callout)}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleClose}
          className="w-full h-12 rounded-[14px] bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D45849] text-white text-[15px] font-semibold cursor-pointer transition-colors mt-2"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
