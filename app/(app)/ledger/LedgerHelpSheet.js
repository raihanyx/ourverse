'use client'

import { useState, useEffect } from 'react'

const exampleAmounts = {
  THB: { full: 'THB 400', half: 'THB 200' },
  IDR: { full: 'IDR 200.000', half: 'IDR 100.000' },
  AUD: { full: 'AUD 40',  half: 'AUD 20'  },
  MMK: { full: 'MMK 20.000', half: 'MMK 10.000' },
}

function Divider() {
  return <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820] my-[10px]" />
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">{title}</p>
      <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">{children}</p>
    </div>
  )
}

export default function LedgerHelpSheet({ isOpen, onClose, baseCurrency }) {
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

  const ex = exampleAmounts[baseCurrency] ?? exampleAmounts['IDR']
  const accent = 'text-[#C2493A] dark:text-[#F0907F] font-semibold'

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className={`relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        {/* Handle */}
        <div className="w-8 h-[3px] rounded-sm bg-[#EDE0DC] dark:bg-[#3D2820] mx-auto mb-[14px]" />

        {/* Title */}
        <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-[14px]">
          How the ledger works
        </p>

        {/* Section 1 */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Log what is owed, not the full bill
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Enter only the amount your partner owes you. If you split a cost, do the math first and log your partner's share only.
          </p>
          {/* Example box */}
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              You paid <span className={accent}>{ex.full}</span> for dinner together.<br />
              Split equally: each pays <span className={accent}>{ex.half}</span>.<br />
              Log <span className={accent}>{ex.half}</span> as what your partner owes.
            </p>
          </div>
        </div>

        <Divider />

        <Section title="They owe me">
          Expenses you paid that your partner owes you back. The total shows your running balance.
        </Section>

        <Divider />

        <Section title="I owe them">
          Expenses your partner paid that you owe them back.
        </Section>

        {/* Got it button */}
        <button
          onClick={handleClose}
          className="w-full bg-[#C2493A] dark:bg-[#E8675A] text-white text-[13px] font-semibold rounded-[10px] py-[10px] mt-3 transition-colors hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
