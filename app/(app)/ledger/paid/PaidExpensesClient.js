'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { bulkSetPaid, togglePaid } from '@/app/actions/expenses'
import { formatAmount, formatDate } from '@/lib/currency'

const CATEGORY_COLORS = {
  food:          'bg-[#FEF3C7] text-[#92400E] dark:bg-[#3A2A12] dark:text-[#F0A840]',
  transport:     'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]',
  accommodation: 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#2D1F3A] dark:text-[#C084FC]',
  shopping:      'bg-[#FCE7F3] text-[#9D174D] dark:bg-[#3A1A2A] dark:text-[#F472B6]',
  other:         'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]',
}

function PaidExpenseRow({ expense, onUndo, isPending, isSelecting, isSelected, onSelect }) {
  return (
    <div
      onClick={isSelecting ? () => onSelect(expense.id) : undefined}
      className={`flex items-start gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0 expense-row-transition
                  ${isSelecting ? 'cursor-pointer' : ''}
                  ${isSelected ? 'mx-[-18px] px-[18px] bg-[#FEF6F5] dark:bg-[#2A1510] first:rounded-t-2xl last:rounded-b-2xl' : ''}`}
    >
      {isSelecting && (
        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
          ${isSelected
            ? 'bg-[#C2493A] border-[#C2493A] dark:bg-[#F0907F] dark:border-[#F0907F]'
            : 'border-[#D4C8C4] dark:border-[#5A3830]'
          }`}
        />
      )}
      <div className="flex-1 min-w-0 opacity-40 dark:opacity-50">
        <p className="text-sm font-medium truncate text-[#A07060] dark:text-[#D4A090]">
          {expense.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-[#A07060] dark:text-[#D4A090]">{formatDate(expense.date)}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-medium
                        ${CATEGORY_COLORS[expense.category] ?? 'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]'}`}
          >
            {expense.category}
          </span>
          {expense.notes && (
            <span className="text-xs text-[#C4A89E] dark:text-[#A07868] truncate max-w-[120px]">
              {expense.notes}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold opacity-40 dark:opacity-50 text-[#1C1210] dark:text-[#D4A090]">
          {formatAmount(expense.amount, expense.currency)}
        </p>
        {!isSelecting && (
          <button
            onClick={() => onUndo(expense.id)}
            disabled={isPending}
            className="text-[13px] mt-0.5 disabled:opacity-40 transition-colors font-medium text-[#C2493A] dark:text-[#F0907F] hover:text-[#A83D30] dark:hover:text-[#E8675A]"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  )
}

export default function PaidExpensesClient({
  expenses,
  currentUserId,
  partnerId,
  partnerName,
  initialTab,
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isPending, startTransition] = useTransition()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const theyOweMe = expenses.filter(e => e.paid_by_user_id === currentUserId)
  const iOweThem  = expenses.filter(e => e.paid_by_user_id === partnerId)
  const activeList = activeTab === 'owe_me' ? theyOweMe : iOweThem

  const sorted = [...activeList].sort((a, b) =>
    new Date(b.date) - new Date(a.date) ||
    new Date(b.created_at) - new Date(a.created_at)
  )

  function handleUndo(expenseId) {
    startTransition(async () => {
      await togglePaid(expenseId)
      router.refresh()
    })
  }

  function handleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStartSelecting() {
    setIsSelecting(true)
    setSelectedIds(new Set())
  }

  function handleCancelSelecting() {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  function handleTabChange(tabKey) {
    setActiveTab(tabKey)
    setSelectedIds(new Set())
  }

  function handleBulkUndo() {
    const ids = sorted.filter(e => selectedIds.has(e.id)).map(e => e.id)
    if (ids.length === 0) return
    startTransition(async () => {
      await bulkSetPaid(ids, false)
      setIsSelecting(false)
      setSelectedIds(new Set())
      router.refresh()
    })
  }

  const tabs = [
    { key: 'owe_me', label: 'They owe me' },
    { key: 'i_owe',  label: 'I owe them'  },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
          Paid expenses
        </h1>
        <div className="flex items-center gap-3">
          {sorted.length > 0 && (
            <button
              onClick={isSelecting ? handleCancelSelecting : handleStartSelecting}
              className="text-sm text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] transition-colors"
            >
              {isSelecting ? 'Cancel' : 'Select'}
            </button>
          )}
          {!isSelecting && (
            <Link
              href="/ledger"
              className="text-sm text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] transition-colors"
            >
              ← Back
            </Link>
          )}
        </div>
      </div>

      <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                        ${activeTab === tab.key
                          ? 'bg-white dark:bg-[#2E201C] text-[#1C1210] dark:text-[#FAF3F1] shadow-sm'
                          : 'text-[#A07060] dark:text-[#A07868] hover:text-[#1C1210] dark:hover:text-[#FAF3F1]'
                        }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px]">
        {sorted.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[#C4A89E] dark:text-[#A07868] text-sm">No paid expenses here</p>
          </div>
        ) : (
          sorted.map(expense => (
            <PaidExpenseRow
              key={expense.id}
              expense={expense}
              onUndo={handleUndo}
              isPending={isPending}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(expense.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* Bulk action bar — portalled to avoid fixed positioning being broken by parent transforms */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-[#2E201C] border-t border-[#EDE0DC] dark:border-[#3D2820]"
          style={{ animation: 'fadeIn 150ms ease-out' }}
        >
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap items to select</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#D4A090]">{selectedIds.size} selected</span>
            )}
            <button
              onClick={handleBulkUndo}
              disabled={isPending || selectedIds.size === 0}
              className="h-9 px-4 rounded-xl bg-[#C2493A] dark:bg-[#E8675A] text-white text-sm font-medium hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] disabled:opacity-40 transition-colors"
            >
              Undo paid
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="h-6" />
    </div>
  )
}
