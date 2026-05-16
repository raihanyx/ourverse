'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatAmount } from '@/lib/currency'

export default function BalanceCard({
  theyOweMeEntries,
  iOweThemEntries,
  theyOweMeUnified,
  iOweThemUnified,
  baseCurrency,
  partnerName,
  noExpensesYet,
  balanceSettled,
}) {
  const [expanded, setExpanded] = useState(false)

  const hasTheyOweMe = theyOweMeEntries.length > 0
  const hasIOweThem = iOweThemEntries.length > 0
  const hasBoth = hasTheyOweMe && hasIOweThem
  const hasRates = theyOweMeUnified !== null || iOweThemUnified !== null

  function renderAmount(unified, entries) {
    if (unified !== null) return formatAmount(unified, baseCurrency)
    return entries.map(([c, v]) => formatAmount(v, c)).join(' · ')
  }

  return (
    <div>
      {/* Section rule */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B19A8B] dark:text-[#7A5848] flex-shrink-0">
          Your Balance
        </span>
        <div className="flex-1 h-px bg-[#ECDFD2] dark:bg-[#3A2418]" />
        {!noExpensesYet && (
          <Link
            href="/ledger"
            className="text-[12px] text-[#7A5C4E] dark:text-[#C89080] border border-[#ECDFD2] dark:border-[#3A2418] rounded-[10px] px-3 py-1.5 hover:border-[#D8513E] dark:hover:border-[#E8675A] transition-colors flex-shrink-0"
          >
            View ledger →
          </Link>
        )}
      </div>

      {noExpensesYet ? (
        <div className="pb-1">
          <p className="text-[14px] text-[#7A5C4E] dark:text-[#C89080] mb-1.5">No expenses logged yet.</p>
          <Link href="/ledger" className="text-[14px] text-[#D8513E] dark:text-[#E8675A] font-medium">
            Add your first one →
          </Link>
        </div>
      ) : balanceSettled ? (
        <p className="text-[14px] font-medium text-[#7A5C4E] dark:text-[#C89080] pb-1">
          You&apos;re all settled up ✓
        </p>
      ) : hasBoth ? (
        <div>
          {/* Two equal panels */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">

            {/* They owe me */}
            <div className="rounded-[16px] bg-[#FCE3DC]/60 dark:bg-[#3D1E18]/60 border border-[#D8513E]/15 dark:border-[#E8675A]/15 p-3.5 min-w-0">
              <p className="text-[11px] font-medium text-[#D8513E] dark:text-[#E8675A] opacity-80 mb-2 leading-tight">
                {partnerName} owes you
              </p>
              <p className="text-[22px] font-bold text-[#D8513E] dark:text-[#E8675A] leading-none tabular-nums tracking-[-0.5px] break-words">
                {renderAmount(theyOweMeUnified, theyOweMeEntries)}
              </p>
            </div>

            {/* I owe them */}
            <div className="rounded-[16px] bg-[#F8F2EB] dark:bg-[#221714] border border-[#ECDFD2] dark:border-[#3A2418] p-3.5 min-w-0">
              <p className="text-[11px] font-medium text-[#7A5C4E] dark:text-[#C89080] mb-2 leading-tight">
                you owe {partnerName}
              </p>
              <p className="text-[22px] font-bold text-[#2A1810] dark:text-[#FAF3F1] leading-none tabular-nums tracking-[-0.5px] break-words">
                {renderAmount(iOweThemUnified, iOweThemEntries)}
              </p>
            </div>
          </div>

          {/* Breakdown toggle */}
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-[12px] text-[#B19A8B] dark:text-[#7A5848] bg-transparent border-none p-0 cursor-pointer"
          >
            {expanded ? 'Hide breakdown ↑' : 'Show breakdown ↓'}
          </button>

          {/* Breakdown pills */}
          <div
            style={{
              maxHeight: expanded ? '220px' : '0px',
              opacity: expanded ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 250ms ease-in-out, opacity 200ms ease-in-out',
            }}
          >
            <div className="pt-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#B19A8B] dark:text-[#7A5848] mb-2">
                  In original currencies
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {theyOweMeEntries.map(([c, v]) => (
                    <span key={c} className="inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full bg-[#FCE3DC] dark:bg-[#3D1E18] text-[#D8513E] dark:text-[#E8675A] border border-[#D8513E]/20 dark:border-[#E8675A]/20">
                      {formatAmount(v, c)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#B19A8B] dark:text-[#7A5848] mb-2">
                  You owe (original)
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {iOweThemEntries.map(([c, v]) => (
                    <span key={c} className="inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full bg-[#EEEEEE] dark:bg-[#221714] text-[#7A5C4E] dark:text-[#C89080] border border-[#ECDFD2] dark:border-[#3A2418]">
                      {formatAmount(v, c)}
                    </span>
                  ))}
                </div>
              </div>
              {hasRates && (
                <p className="text-[11px] text-[#B19A8B] dark:text-[#7A5848]">
                  converted at current rates · updated hourly
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Single side: one big number */}
          <div className="mb-3">
            <p className="text-[12px] text-[#7A5C4E] dark:text-[#C89080] mb-1.5">
              {hasTheyOweMe ? `${partnerName} owes you` : `You owe ${partnerName}`}
            </p>
            <p className={`text-[34px] font-bold leading-none tracking-[-1px] tabular-nums ${
              hasTheyOweMe
                ? 'text-[#D8513E] dark:text-[#E8675A]'
                : 'text-[#2A1810] dark:text-[#FAF3F1]'
            }`}>
              {hasTheyOweMe
                ? renderAmount(theyOweMeUnified, theyOweMeEntries)
                : renderAmount(iOweThemUnified, iOweThemEntries)}
            </p>
          </div>

          {/* Breakdown toggle */}
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-[12px] text-[#B19A8B] dark:text-[#7A5848] bg-transparent border-none p-0 cursor-pointer"
          >
            {expanded ? 'Hide breakdown ↑' : 'Show breakdown ↓'}
          </button>

          {/* Breakdown pills */}
          <div
            style={{
              maxHeight: expanded ? '160px' : '0px',
              opacity: expanded ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 250ms ease-in-out, opacity 200ms ease-in-out',
            }}
          >
            <div className="pt-3 space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {(hasTheyOweMe ? theyOweMeEntries : iOweThemEntries).map(([c, v]) => (
                  <span
                    key={c}
                    className={`inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full border ${
                      hasTheyOweMe
                        ? 'bg-[#FCE3DC] dark:bg-[#3D1E18] text-[#D8513E] dark:text-[#E8675A] border-[#D8513E]/20 dark:border-[#E8675A]/20'
                        : 'bg-[#EEEEEE] dark:bg-[#221714] text-[#7A5C4E] dark:text-[#C89080] border-[#ECDFD2] dark:border-[#3A2418]'
                    }`}
                  >
                    {formatAmount(v, c)}
                  </span>
                ))}
              </div>
              {hasRates && (
                <p className="text-[11px] text-[#B19A8B] dark:text-[#7A5848]">
                  converted at current rates · updated hourly
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
