'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { togglePaid, bulkSetPaid, bulkDeleteExpenses } from '@/app/actions/expenses'
import { formatAmount, sumByCurrency, formatDate } from '@/lib/currency'
import { computeUnifiedTotal, getRateLines } from '@/lib/exchangeRates'
import AddExpenseForm from './AddExpenseForm'
import LedgerHelpSheet from './LedgerHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import Link from 'next/link'
import { EXPENSE_CATEGORY_COLORS as CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS as CATEGORY_LABELS } from '@/lib/constants'

function TotalsBadges({ expenses, baseCurrency, rates }) {
  const unpaid = expenses.filter(e => !e.is_paid)
  const totals = sumByCurrency(unpaid)
  const entries = Object.entries(totals).filter(([, v]) => v > 0)

  const unifiedTotal = computeUnifiedTotal(totals, baseCurrency, rates)
  const rateLines = getRateLines(baseCurrency, rates)

  if (entries.length === 0) {
    return <p className="text-sm text-[#A07060] dark:text-[#D4A090]">Nothing owed</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([currency, amount]) => (
          <span
            key={currency}
            className="text-[13px] font-semibold text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] px-3 py-1 rounded-full"
          >
            {formatAmount(amount, currency)}
          </span>
        ))}
      </div>

      {/* Unified total in base currency */}
      {rates && unifiedTotal !== null && unifiedTotal > 0 && (
        <p className="text-xs text-[#A07060] dark:text-[#D4A090] mt-2">
          ≈ {formatAmount(unifiedTotal, baseCurrency)} at current rates
        </p>
      )}

      {/* Rate transparency */}
      {rates && rateLines.length > 0 && (
        <p className="text-xs text-[#C4A89E] dark:text-[#A07868] mt-1 leading-relaxed">
          {rateLines.join(' · ')}
        </p>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onToggle, isPending, isSelecting, isSelected, onSelect }) {
  const isMuted = expense.is_paid && (!isSelecting || !isSelected)

  return (
    <div
      onClick={isSelecting ? () => onSelect(expense.id) : undefined}
      className={`flex items-start gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0
        expense-row-transition
        ${isSelecting ? 'cursor-pointer' : ''}
        ${isSelected ? 'mx-[-18px] px-[18px] bg-[#FEF6F5] dark:bg-[#2A1510] first:rounded-t-2xl last:rounded-b-2xl' : ''}
        ${isMuted ? 'opacity-40 dark:opacity-50' : ''}`}
    >
      {isSelecting && (
        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
          ${isSelected
            ? 'bg-[#C2493A] border-[#C2493A] dark:bg-[#F0907F] dark:border-[#F0907F]'
            : 'border-[#D4C8C4] dark:border-[#5A3830]'
          }`}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className={`text-sm font-medium truncate
            ${expense.is_paid
              ? 'line-through text-[#A07060] dark:text-[#D4A090]'
              : 'text-[#1C1210] dark:text-[#FAF3F1]'
            }`}
          >
            {expense.name}
          </p>
          <p className="text-[15px] font-bold text-[#1C1210] dark:text-[#FAF3F1] flex-shrink-0">
            {formatAmount(expense.amount, expense.currency)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">{formatDate(expense.date)}</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.other}`}>
              {CATEGORY_LABELS[expense.category] ?? expense.category}
            </span>
          </div>
          {!isSelecting && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(expense.id) }}
              disabled={isPending}
              className={`flex-shrink-0 h-7 px-3 rounded-full border text-[11px] font-medium disabled:opacity-40 transition-colors cursor-pointer
                ${expense.is_paid
                  ? 'border-[#EDE0DC] dark:border-[#3D2820] text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F]'
                  : 'border-[#C2493A] dark:border-[#E8675A] text-[#C2493A] dark:text-[#E8675A] hover:bg-[#FDECEA] dark:hover:bg-[#3D1E18]'
                }`}
            >
              {expense.is_paid ? 'Undo' : 'Mark paid'}
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
  )
}

export default function LedgerClient({
  initialExpenses,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  coupleId,
  baseCurrency,
  rates,
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [activeTab, setActiveTab] = useState('owe_me')
  const [tabAnimClass, setTabAnimClass] = useState('')
  const prevTabRef = useRef('owe_me')
  const [showForm, setShowForm] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [bulkError, setBulkError] = useState(null)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }, [coupleId])

  // Sync on mount — corrects stale initialExpenses from router cache
  useEffect(() => { refetch() }, [refetch])

  // Realtime subscription — no server-side filter (more reliable across configs)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('expenses-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return

          if (payload.eventType === 'INSERT') {
            setExpenses(prev =>
              prev.some(e => e.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setExpenses(prev =>
              prev.map(e => (e.id === payload.new.id ? payload.new : e))
            )
          } else if (payload.eventType === 'DELETE') {
            setExpenses(prev => prev.filter(e => e.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setShowForm(false)
      setIsClosing(false)
    }, 220)
  }

  async function handleExpenseAdded() {
    handleClose()
    await refetch()
  }

  function handleTabChange(tabKey) {
    const tabOrder = ['owe_me', 'i_owe']
    const newIndex = tabOrder.indexOf(tabKey)
    const prevIndex = tabOrder.indexOf(prevTabRef.current)
    setTabAnimClass(newIndex > prevIndex ? 'animate-tab-right' : 'animate-tab-left')
    prevTabRef.current = tabKey
    setActiveTab(tabKey)
    setSelectedIds(new Set())
  }

  function handleToggle(expenseId) {
    setBulkError(null)
    startTransition(async () => {
      const result = await togglePaid(expenseId)
      if (result?.error) {
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

  function handleBulkMarkPaid() {
    const ids = visibleExpenses
      .filter(e => selectedIds.has(e.id) && !e.is_paid)
      .map(e => e.id)
    if (ids.length === 0) return
    setBulkError(null)
    startTransition(async () => {
      const result = await bulkSetPaid(ids, true)
      await refetch()
      if (result?.error) {
        setBulkError('Something went wrong. Please try again.')
      } else {
        setIsSelecting(false)
        setSelectedIds(new Set())
      }
    })
  }

  function handleBulkUndo() {
    const ids = visibleExpenses
      .filter(e => selectedIds.has(e.id) && e.is_paid)
      .map(e => e.id)
    if (ids.length === 0) return
    setBulkError(null)
    startTransition(async () => {
      const result = await bulkSetPaid(ids, false)
      await refetch()
      if (result?.error) {
        setBulkError('Something went wrong. Please try again.')
      } else {
        setIsSelecting(false)
        setSelectedIds(new Set())
      }
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    setBulkError(null)
    const removed = expenses.filter(e => ids.includes(e.id))
    setShowDeleteConfirm(false)
    setExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    startDeleteTransition(async () => {
      const result = await bulkDeleteExpenses(ids)
      if (result?.error) {
        setExpenses(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  const theyOweMe = expenses.filter(e => e.paid_by_user_id === currentUserId)
  const iOweThem = expenses.filter(e => e.paid_by_user_id === partnerId)
  const activeList = activeTab === 'owe_me' ? theyOweMe : iOweThem

  const unpaidSorted = [...activeList]
    .filter(e => !e.is_paid)
    .sort((a, b) =>
      new Date(b.date) - new Date(a.date) ||
      new Date(b.created_at) - new Date(a.created_at)
    )

  const paidSorted = [...activeList]
    .filter(e => e.is_paid)
    .sort((a, b) =>
      new Date(b.date) - new Date(a.date) ||
      new Date(b.created_at) - new Date(a.created_at)
    )

  const PAID_PREVIEW_LIMIT = 5
  const paidPreview = paidSorted.slice(0, PAID_PREVIEW_LIMIT)
  const hasMorePaid = paidSorted.length > PAID_PREVIEW_LIMIT

  // All currently visible expenses (used for bulk action ID filtering)
  const visibleExpenses = [...unpaidSorted, ...paidPreview]

  const hasSelectedUnpaid = visibleExpenses.some(e => selectedIds.has(e.id) && !e.is_paid)
  const hasSelectedPaid   = visibleExpenses.some(e => selectedIds.has(e.id) && e.is_paid)

  const unpaidCount = expenses.filter(e => !e.is_paid).length

  const tabs = [
    { key: 'owe_me', label: 'They owe me', list: theyOweMe },
    { key: 'i_owe', label: 'I owe them', list: iOweThem },
  ]

  return (
    <>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
              </svg>
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">Ledger</h1>
              <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
                {unpaidCount > 0 ? `${unpaidCount} outstanding` : 'All settled up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSelecting ? (
              <button
                onClick={handleCancelSelecting}
                className="h-8 px-3.5 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowHelp(true)}
                  className="w-8 h-8 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] flex items-center justify-center text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
                  aria-label="Ledger tips"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </button>
                {(unpaidSorted.length > 0 || paidPreview.length > 0) && (
                  <button
                    onClick={handleStartSelecting}
                    className="h-8 px-3.5 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 h-8 px-3 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] transition-colors cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </>
            )}
          </div>
        </div>

        {bulkError && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
            {bulkError}
          </div>
        )}

        <div className="space-y-3">
        {/* Tabs */}
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
        </div>

        {/* Animated tab content */}
        <div key={activeTab} className={`space-y-5 ${tabAnimClass}`}>
          {/* Totals card */}
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
            <p className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider mb-3">
              {activeTab === 'owe_me'
                ? `${partnerName} owes you`
                : `You owe ${partnerName}`}
            </p>
            <TotalsBadges
              expenses={activeList}
              baseCurrency={baseCurrency}
              rates={rates}
            />
          </div>

          {/* Expense list */}
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
            {unpaidSorted.length === 0 && paidPreview.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-[#D4C8C4] dark:text-[#5A3830]" aria-hidden="true">
                  <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                </svg>
                <p className="text-[#C4A89E] dark:text-[#A07868] text-sm">No expenses here yet</p>
                <p className="text-xs text-[#D4C8C4] dark:text-[#5A3830]">Tap Add to log one</p>
              </div>
            ) : (
              <>
                {unpaidSorted.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onToggle={handleToggle}
                    isPending={isPending}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(expense.id)}
                    onSelect={handleSelect}
                  />
                ))}
                {paidPreview.map(expense => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onToggle={handleToggle}
                    isPending={isPending}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(expense.id)}
                    onSelect={handleSelect}
                  />
                ))}
                {hasMorePaid && (
                  <div className="py-3 border-t border-[#F5EDE9] dark:border-[#3D2820]">
                    <Link
                      href={`/ledger/paid?tab=${activeTab}`}
                      className="text-sm text-[#C2493A] dark:text-[#F0907F] hover:text-[#A83D30] dark:hover:text-[#E8675A] transition-colors"
                    >
                      See all {paidSorted.length} paid expenses →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Bulk action bar — portalled, appears when in select mode */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#2E201C] border-t border-[#EDE0DC] dark:border-[#3D2820]"
          style={{ animation: 'fadeIn 150ms ease-out', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap items to select</span>
            ) : hasSelectedPaid && hasSelectedUnpaid ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#A07868]">Select only paid or unpaid</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#D4A090]">{selectedIds.size} selected</span>
            )}
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40 transition-colors"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {!hasSelectedPaid && (hasSelectedUnpaid || selectedIds.size === 0) && (
                <button
                  onClick={handleBulkMarkPaid}
                  disabled={isPending || selectedIds.size === 0}
                  className="h-9 px-4 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-sm font-medium hover:bg-[#A83D30] dark:hover:bg-[#D45A4A] disabled:opacity-40 transition-colors"
                >
                  Mark paid
                </button>
              )}
              {!hasSelectedUnpaid && (hasSelectedPaid || selectedIds.size === 0) && (
                <button
                  onClick={handleBulkUndo}
                  disabled={isPending || selectedIds.size === 0}
                  className="h-9 px-4 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm font-medium text-[#A07060] dark:text-[#D4A090] hover:bg-[#F5EDE9] dark:hover:bg-[#3D2820] disabled:opacity-40 transition-colors"
                >
                  Undo paid
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} expense${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {/* Help sheet */}
      <LedgerHelpSheet
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        baseCurrency={baseCurrency}
      />

      {/* Slide-up form panel */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleClose}
          />
          <div className={`relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Add expense</h2>
              <button
                onClick={handleClose}
                className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <AddExpenseForm
              currentUserName={currentUserName}
              partnerId={partnerId}
              partnerName={partnerName}
              onSuccess={handleExpenseAdded}
              onCancel={handleClose}
            />
          </div>
        </div>
      )}
    </>
  )
}
