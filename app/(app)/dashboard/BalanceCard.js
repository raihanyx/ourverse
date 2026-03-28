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
    <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider">
          Balance
        </h2>
        <Link
          href="/ledger"
          className="text-xs text-[#C2493A] dark:text-[#F0907F] font-medium hover:underline"
        >
          View ledger →
        </Link>
      </div>

      {noExpensesYet ? (
        <div>
          <p className="text-sm text-[#A07060] dark:text-[#D4A090] mb-1">No expenses logged yet.</p>
          <Link href="/ledger" className="text-sm text-[#C2493A] dark:text-[#F0907F] font-medium hover:underline">
            Add your first one →
          </Link>
        </div>
      ) : balanceSettled ? (
        <p className="text-sm font-medium text-[#A07060] dark:text-[#D4A090]">
          You&apos;re all settled up ✓
        </p>
      ) : (
        <div className="space-y-1.5">
          {/* Summary lines — unified totals or per-currency fallback */}
          {hasTheyOweMe && (
            <p className="text-sm font-medium text-[#1C1210] dark:text-[#FAF3F1] break-words">
              {partnerName} owes you{' '}
              {theyOweMeUnified !== null
                ? formatAmount(theyOweMeUnified, baseCurrency)
                : theyOweMeEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
            </p>
          )}
          {hasIOweThem && (
            <p className="text-sm font-medium text-[#1C1210] dark:text-[#FAF3F1] break-words">
              You owe {partnerName}{' '}
              {iOweThemUnified !== null
                ? formatAmount(iOweThemUnified, baseCurrency)
                : iOweThemEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
            </p>
          )}

          {/* Toggle button — only shown when there's a breakdown to reveal */}
          {(hasTheyOweMe || hasIOweThem) && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-[12px] text-[#C4A89E] dark:text-[#A07868] cursor-pointer bg-transparent border-none p-0 mt-0.5"
            >
              {expanded ? 'Hide breakdown ↑' : 'Show breakdown →'}
            </button>
          )}

          {/* Breakdown — always in DOM, animated via max-height */}
          <div
            style={{
              maxHeight: expanded ? '200px' : '0px',
              opacity: expanded ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 250ms ease-in-out, opacity 200ms ease-in-out',
            }}
          >
            <div className="pl-3 border-l-2 border-[#EDE0DC] dark:border-[#3D2820] mt-1 space-y-1">
              {hasTheyOweMe && (
                <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] break-words">
                  {theyOweMeEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
                </p>
              )}
              {hasIOweThem && (
                <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] break-words">
                  {iOweThemEntries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
                </p>
              )}
              {hasRates && (
                <p className="text-[11px] text-[#C4A89E] dark:text-[#A07868]">
                  at current rates · updated hourly
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-[#F5EDE9] dark:border-[#3D2820] mt-3 pt-3">
        <CurrencySettings current={baseCurrency} />
      </div>
    </div>
  )
}
