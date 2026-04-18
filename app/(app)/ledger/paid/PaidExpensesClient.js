'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkSetPaid, togglePaid, bulkDeleteExpenses } from '@/app/actions/expenses'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import { formatAmount, formatDate } from '@/lib/currency'
import { EXPENSE_CATEGORY_COLORS as CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS as CATEGORY_LABELS } from '@/lib/constants'

function PaidExpenseCard({ expense, onUndo, isPending, isSelecting, isSelected, onSelect }) {
  return (
    <div
      onClick={isSelecting ? () => onSelect(expense.id) : undefined}
      className={`bg-white dark:bg-[#2E201C] rounded-[14px] border p-[14px] mb-[10px] transition-colors shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none
        ${isSelecting ? 'cursor-pointer' : ''}
        ${isSelected
          ? 'border-[#C2493A] dark:border-[#F0907F] bg-[#FEF6F5] dark:bg-[#2A1510]'
          : 'border-[#EDE0DC] dark:border-[#3D2820]'
        }`}
    >
      <div className="flex items-start gap-3">
        {isSelecting && (
          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
            ${isSelected
              ? 'bg-[#C2493A] border-[#C2493A] dark:bg-[#F0907F] dark:border-[#F0907F]'
              : 'border-[#D4C8C4] dark:border-[#5A3830]'
            }`}
          />
        )}
        <div className="flex-1 min-w-0 opacity-60">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] truncate">
              {expense.name}
            </p>
            <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] flex-shrink-0">
              {formatAmount(expense.amount, expense.currency)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">
                {formatDate(expense.date)}
              </span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.other}`}>
                {CATEGORY_LABELS[expense.category] ?? expense.category}
              </span>
            </div>
            {!isSelecting && (
              <button
                onClick={(e) => { e.stopPropagation(); onUndo(expense.id) }}
                disabled={isPending}
                className="flex-shrink-0 h-7 px-3 rounded-full border border-[#EDE0DC] dark:border-[#3D2820] text-[11px] font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] disabled:opacity-40 transition-colors cursor-pointer"
              >
                Undo
              </button>
            )}
          </div>
          {expense.notes && (
            <p
              className="text-[12px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.55] pl-[10px] mt-2"
              style={{ borderLeft: '2px solid #EDE0DC' }}
            >
              {expense.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaidExpensesClient({
  expenses,
  currentUserId,
  partnerId,
  partnerName,
  coupleId,
  initialTab,
}) {
  const [localExpenses, setLocalExpenses] = useState(expenses)
  const [activeTab, setActiveTab] = useState(initialTab)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('expenses')
      .select('id, paid_by_user_id, is_paid, name, amount, currency, category, date, notes, created_at')
      .eq('couple_id', coupleId)
      .eq('is_paid', true)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setLocalExpenses(data)
  }, [coupleId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('paid-expenses-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return

          if (payload.eventType === 'INSERT') {
            if (!payload.new.is_paid) return
            setLocalExpenses(prev =>
              prev.some(e => e.id === payload.new.id) ? prev : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_paid) {
              // Became paid or was updated while paid — add or replace
              setLocalExpenses(prev =>
                prev.some(e => e.id === payload.new.id)
                  ? prev.map(e => e.id === payload.new.id ? payload.new : e)
                  : [payload.new, ...prev]
              )
            } else {
              // Became unpaid — remove from this list
              setLocalExpenses(prev => prev.filter(e => e.id !== payload.new.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setLocalExpenses(prev => prev.filter(e => e.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bulkError, setBulkError] = useState(null)

  const theyOweMe = localExpenses.filter(e => e.paid_by_user_id === currentUserId)
  const iOweThem  = localExpenses.filter(e => e.paid_by_user_id === partnerId)
  const activeList = activeTab === 'owe_me' ? theyOweMe : iOweThem

  const sorted = [...activeList].sort((a, b) =>
    new Date(b.date) - new Date(a.date) ||
    new Date(b.created_at) - new Date(a.created_at)
  )

  function handleUndo(expenseId) {
    setBulkError(null)
    const removed = localExpenses.find(e => e.id === expenseId)
    setLocalExpenses(prev => prev.filter(e => e.id !== expenseId))
    startTransition(async () => {
      const result = await togglePaid(expenseId)
      if (result?.error) {
        if (removed) setLocalExpenses(prev => [removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
      await refetch()
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
    setBulkError(null)
    const removed = localExpenses.filter(e => ids.includes(e.id))
    setLocalExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    startTransition(async () => {
      const result = await bulkSetPaid(ids, false)
      if (result?.error) {
        setLocalExpenses(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
      await refetch()
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    setBulkError(null)
    const removed = localExpenses.filter(e => ids.includes(e.id))
    setShowDeleteConfirm(false)
    setLocalExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    startDeleteTransition(async () => {
      const result = await bulkDeleteExpenses(ids)
      if (result?.error) {
        setLocalExpenses(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  const tabs = [
    { key: 'owe_me', label: 'They owe me' },
    { key: 'i_owe',  label: 'I owe them'  },
  ]

  return (
    <div className="space-y-5">

      {/* Top nav row */}
      <div className={`flex items-center ${isSelecting ? 'invisible' : ''}`}>
        <Link
          href="/ledger"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#EDE0DC] dark:border-[#3D2820] bg-white dark:bg-[#2E201C] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 shadow-[0_1px_4px_rgba(194,73,58,0.06)] cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Ledger
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
              <polyline points="9 11 11 13 15 9" />
            </svg>
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">
              Paid expenses
            </h1>
            <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
              {localExpenses.length > 0
                ? `${localExpenses.length} expense${localExpenses.length === 1 ? '' : 's'} settled`
                : 'No paid expenses yet'}
            </p>
          </div>
        </div>
        {sorted.length > 0 && (
          <button
            onClick={isSelecting ? handleCancelSelecting : handleStartSelecting}
            className="h-8 px-3.5 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer flex-shrink-0"
          >
            {isSelecting ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      {bulkError && (
        <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
          {bulkError}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${activeTab === tab.key
                ? 'bg-white dark:bg-[#2E201C] text-[#1C1210] dark:text-[#FAF3F1] shadow-sm'
                : 'text-[#A07060] dark:text-[#A07868] hover:text-[#1C1210] dark:hover:text-[#FAF3F1]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expense list */}
      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] py-14 text-center px-6 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Nothing paid yet
          </p>
          <p className="text-[13px] text-[#A07060] dark:text-[#D4A090] leading-relaxed">
            Mark expenses as paid in the ledger to see them here
          </p>
        </div>
      ) : (
        <div>
          {sorted.map(expense => (
            <PaidExpenseCard
              key={expense.id}
              expense={expense}
              onUndo={handleUndo}
              isPending={isPending}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(expense.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      <div className="h-4" />

      {/* Bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#2E201C] border-t border-[#EDE0DC] dark:border-[#3D2820]"
          style={{ animation: 'fadeIn 150ms ease-out', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap items to select</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#D4A090]">{selectedIds.size} selected</span>
            )}
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              <button
                onClick={handleBulkUndo}
                disabled={isPending || selectedIds.size === 0}
                className="h-9 px-4 rounded-xl bg-[#C2493A] dark:bg-[#E8675A] text-white text-sm font-medium hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isPending ? 'Undoing…' : 'Undo paid'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} expense${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}
    </div>
  )
}
