'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatAmount } from '@/lib/currency'
import CurrencySettings from './CurrencySettings'

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
  const hasRates = theyOweMeUnified !== null || iOweThemUnified !== null

  return (
    <div>
      {/* Section rule */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0">
          Your Balance
        </span>
        <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
      </div>

      {noExpensesYet ? (
        <div className="pb-1">
          <p className="text-[14px] text-[#A07060] dark:text-[#C89080] mb-1.5">No expenses logged yet.</p>
          <Link href="/ledger" className="text-[14px] text-[#C2493A] dark:text-[#E8675A] font-medium">
            Add your first one →
          </Link>
        </div>
      ) : balanceSettled ? (
        <p className="text-[14px] font-medium text-[#A07060] dark:text-[#C89080] pb-1">
          You&apos;re all settled up ✓
        </p>
      ) : (
        <div>
          {/* They owe me — primary balance */}
          {hasTheyOweMe && (
            <div className="mb-3">
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-[12px] text-[#A07060] dark:text-[#C89080]">
                  {partnerName} owes you
                </p>
                <Link
                  href="/ledger"
                  className="text-[12px] text-[#A07060] dark:text-[#C89080] border border-[#EDE0DC] dark:border-[#3A2418] rounded-[10px] px-3 py-1.5 mb-0.5 hover:border-[#C2493A] dark:hover:border-[#E8675A] transition-colors"
                >
                  View ledger →
                </Link>
              </div>
              <p className="text-[34px] font-bold text-[#1C1210] dark:text-[#FAF3F1] leading-none tracking-[-1px] tabular-nums">
                {theyOweMeUnified !== null
                  ? formatAmount(theyOweMeUnified, baseCurrency)
                  : theyOweMeEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
              </p>
            </div>
          )}

          {/* I owe them */}
          {hasIOweThem && (
            <div className="mb-3">
              {!hasTheyOweMe ? (
                <>
                  <div className="flex items-end justify-between mb-1.5">
                    <p className="text-[12px] text-[#A07060] dark:text-[#C89080]">
                      You owe {partnerName}
                    </p>
                    <Link
                      href="/ledger"
                      className="text-[12px] text-[#A07060] dark:text-[#C89080] border border-[#EDE0DC] dark:border-[#3A2418] rounded-[10px] px-3 py-1.5 mb-0.5 hover:border-[#C2493A] dark:hover:border-[#E8675A] transition-colors"
                    >
                      View ledger →
                    </Link>
                  </div>
                  <p className="text-[34px] font-bold text-[#1C1210] dark:text-[#FAF3F1] leading-none tracking-[-1px] tabular-nums">
                    {iOweThemUnified !== null
                      ? formatAmount(iOweThemUnified, baseCurrency)
                      : iOweThemEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-[13px] text-[#A07060] dark:text-[#C89080]">
                  <span>You owe {partnerName}:</span>
                  <span className="font-semibold tabular-nums">
                    {iOweThemUnified !== null
                      ? formatAmount(iOweThemUnified, baseCurrency)
                      : iOweThemEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Breakdown toggle */}
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] bg-transparent border-none p-0 cursor-pointer"
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
              {hasTheyOweMe && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#C4A89E] dark:text-[#7A5848] mb-2">
                    In original currencies
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {theyOweMeEntries.map(([c, v]) => (
                      <span
                        key={c}
                        className="inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full bg-[#FDECEA] dark:bg-[#3D1E18] text-[#C2493A] dark:text-[#E8675A] border border-[#C2493A]/20 dark:border-[#E8675A]/20"
                      >
                        {formatAmount(v, c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasIOweThem && (
                <div>
                  {hasTheyOweMe && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#C4A89E] dark:text-[#7A5848] mb-2">
                      You owe (original)
                    </p>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {iOweThemEntries.map(([c, v]) => (
                      <span
                        key={c}
                        className="inline-flex items-center text-[12px] font-semibold px-3 py-1 rounded-full bg-[#F3F4F6] dark:bg-[#221714] text-[#A07060] dark:text-[#C89080] border border-[#EDE0DC] dark:border-[#3A2418]"
                      >
                        {formatAmount(v, c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasRates && (
                <p className="text-[11px] text-[#C4A89E] dark:text-[#7A5848]">
                  converted at current rates · updated hourly
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-[#EDE0DC] dark:border-[#3A2418] mt-4 pt-3">
        <CurrencySettings current={baseCurrency} />
      </div>
    </div>
  )
}
