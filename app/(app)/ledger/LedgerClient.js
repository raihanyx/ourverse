'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { togglePaid, bulkSetPaid, bulkDeleteExpenses } from '@/app/actions/expenses'
import { formatAmount, sumByCurrency, formatDate } from '@/lib/currency'
import { computeUnifiedTotal, getRateLines } from '@/lib/exchangeRates'
import AddExpenseForm from './AddExpenseForm'
import LedgerHelpSheet from './LedgerHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import Link from 'next/link'

// Category box colors for expense categories
const EXPENSE_CAT = {
  food:          { bg: '#372510', fg: '#F0A840', label: 'Food' },
  transport:     { bg: '#1A2535', fg: '#7AB0D8', label: 'Transport' },
  accommodation: { bg: '#271A36', fg: '#C084FC', label: 'Accommodation' },
  shopping:      { bg: '#321624', fg: '#F472B6', label: 'Shopping' },
  other:         { bg: '#222222', fg: '#9CA3AF', label: 'Other' },
}

function CatBox({ category }) {
  const c = EXPENSE_CAT[category] ?? EXPENSE_CAT.other
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: c.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: c.fg,
          display: 'block',
          opacity: 0.85,
        }}
      />
    </div>
  )
}

function CatChip({ category }) {
  const c = EXPENSE_CAT[category] ?? EXPENSE_CAT.other
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 5,
        letterSpacing: '0.02em',
      }}
    >
      {c.label}
    </span>
  )
}

function TotalsBadges({ expenses, baseCurrency, rates }) {
  const unpaid = expenses.filter(e => !e.is_paid)
  const totals = sumByCurrency(unpaid)
  const entries = Object.entries(totals).filter(([, v]) => v > 0)
  const unifiedTotal = computeUnifiedTotal(totals, baseCurrency, rates)
  const rateLines = getRateLines(baseCurrency, rates)

  if (entries.length === 0) {
    return <p style={{ fontSize: 13, color: '#7A5848' }}>Nothing owed</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {entries.map(([currency, amount]) => (
          <span
            key={currency}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#3D1E18',
              color: '#E8675A',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 9999,
              border: '1px solid rgba(232,103,90,0.27)',
            }}
          >
            {formatAmount(amount, currency)}
          </span>
        ))}
      </div>
      {rates && unifiedTotal !== null && unifiedTotal > 0 && (
        <p style={{ fontSize: 11, color: '#7A5848', marginTop: 6 }}>
          ≈ {formatAmount(unifiedTotal, baseCurrency)} at current rates
        </p>
      )}
      {rates && rateLines.length > 0 && (
        <p style={{ fontSize: 11, color: '#5A3828', marginTop: 3, lineHeight: 1.5 }}>
          {rateLines.join(' · ')}
        </p>
      )}
    </div>
  )
}

// Group an array of expenses by date (YYYY-MM-DD) into [{label, items}]
function groupByDate(expenses) {
  const groups = []
  let lastDate = null
  for (const e of expenses) {
    if (e.date !== lastDate) {
      groups.push({ date: e.date, label: formatDateLabel(e.date), items: [] })
      lastDate = e.date
    }
    groups[groups.length - 1].items.push(e)
  }
  return groups
}

function formatDateLabel(dateStr) {
  // dateStr is YYYY-MM-DD
  const today = new Date()
  const d = new Date(dateStr + 'T00:00:00')
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
  const yesterdayDate = new Date(today)
  yesterdayDate.setDate(today.getDate() - 1)
  const yesterdayStr = [
    yesterdayDate.getFullYear(),
    String(yesterdayDate.getMonth() + 1).padStart(2, '0'),
    String(yesterdayDate.getDate()).padStart(2, '0'),
  ].join('-')
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ExpenseRow({ expense, onToggle, isPending, isSelecting, isSelected, onSelect }) {
  const isPaid = expense.is_paid
  const muted = isPaid && !isSelected

  return (
    <div
      onClick={isSelecting ? () => onSelect(expense.id) : undefined}
      className="expense-row-transition"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: isSelecting ? '10px 10px' : '10px 0',
        margin: isSelecting ? '0 -10px' : 0,
        borderRadius: isSelecting ? 12 : 0,
        background: isSelected ? '#3D1E18' : 'transparent',
        opacity: muted ? 0.45 : 1,
        cursor: isSelecting ? 'pointer' : 'default',
      }}
    >
      <CatBox category={expense.category} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#FAF3F1',
            textDecoration: isPaid ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 4,
          }}
        >
          {expense.name}
        </p>
        <CatChip category={expense.category} />
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#FAF3F1',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: isSelecting ? 0 : 6,
              textAlign: 'right',
            }}
          >
            {formatAmount(expense.amount, expense.currency)}
          </p>
          {!isSelecting && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(expense.id) }}
              disabled={isPending}
              style={{
                height: 24,
                padding: '0 10px',
                borderRadius: 7,
                border: isPaid ? '1px solid #3A2418' : '1px solid rgba(232,103,90,0.53)',
                color: isPaid ? '#7A5848' : '#E8675A',
                background: isPaid ? 'transparent' : '#3D1E18',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 150ms',
              }}
            >
              {isPaid ? 'Undo' : 'Mark paid'}
            </button>
          )}
        </div>
        {isSelecting && (
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `1.5px solid ${isSelected ? '#E8675A' : '#3A2418'}`,
              background: isSelected ? '#E8675A' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 150ms',
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('expenses-' + coupleId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        if (payload.eventType === 'INSERT') {
          setExpenses(prev => prev.some(e => e.id === payload.new.id) ? prev : [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setExpenses(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
        } else if (payload.eventType === 'DELETE') {
          setExpenses(prev => prev.filter(e => e.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => { setShowForm(false); setIsClosing(false) }, 220)
  }

  function handleAddSuccess(row) {
    if (row) setExpenses(prev => prev.some(e => e.id === row.id) ? prev : [row, ...prev])
    handleClose()
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
    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, is_paid: !e.is_paid } : e))
    startTransition(async () => {
      const result = await togglePaid(expenseId)
      if (result?.error) {
        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, is_paid: !e.is_paid } : e))
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStartSelecting() { setIsSelecting(true); setSelectedIds(new Set()) }
  function handleCancelSelecting() { setIsSelecting(false); setSelectedIds(new Set()) }

  function handleBulkMarkPaid() {
    const ids = visibleExpenses.filter(e => selectedIds.has(e.id) && !e.is_paid).map(e => e.id)
    if (ids.length === 0) return
    setBulkError(null)
    setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: true } : e))
    setIsSelecting(false); setSelectedIds(new Set())
    startTransition(async () => {
      const result = await bulkSetPaid(ids, true)
      if (result?.error) {
        setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: false } : e))
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleBulkUndo() {
    const ids = visibleExpenses.filter(e => selectedIds.has(e.id) && e.is_paid).map(e => e.id)
    if (ids.length === 0) return
    setBulkError(null)
    setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: false } : e))
    setIsSelecting(false); setSelectedIds(new Set())
    startTransition(async () => {
      const result = await bulkSetPaid(ids, false)
      if (result?.error) {
        setExpenses(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: true } : e))
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleBulkDelete() { if (selectedIds.size > 0) setShowDeleteConfirm(true) }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    setBulkError(null)
    const removed = expenses.filter(e => ids.includes(e.id))
    setShowDeleteConfirm(false)
    setExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false); setSelectedIds(new Set())
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
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at))

  const paidSorted = [...activeList]
    .filter(e => e.is_paid)
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at))

  const PAID_PREVIEW_LIMIT = 5
  const paidPreview = paidSorted.slice(0, PAID_PREVIEW_LIMIT)
  const hasMorePaid = paidSorted.length > PAID_PREVIEW_LIMIT

  const visibleExpenses = [...unpaidSorted, ...paidPreview]
  const hasSelectedUnpaid = visibleExpenses.some(e => selectedIds.has(e.id) && !e.is_paid)
  const hasSelectedPaid = visibleExpenses.some(e => selectedIds.has(e.id) && e.is_paid)
  const unpaidCount = expenses.filter(e => !e.is_paid).length

  // Group visible expenses by date for rendering
  const unpaidGroups = groupByDate(unpaidSorted)
  const paidGroups = groupByDate(paidPreview)

  const totalLabel = activeTab === 'owe_me' ? `${partnerName} owes you` : `You owe ${partnerName}`
  const tabLabels = {
    owe_me: `${partnerName} owes me`,
    i_owe: `I owe ${partnerName}`,
  }

  return (
    <>
      <div style={{ paddingBottom: isSelecting ? 150 : 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#FAF3F1', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
              Ledger
            </h1>
            <p style={{ fontSize: 13, color: '#7A5848', marginTop: 3 }}>
              {unpaidCount > 0 ? `${unpaidCount} unsettled` : 'All settled up ✓'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Info button */}
            <button
              onClick={() => setShowHelp(true)}
              aria-label="Ledger tips"
              style={{
                width: 30, height: 30, borderRadius: 9,
                border: '1px solid #3A2418',
                background: '#221714',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C89080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            {/* Select/Cancel button */}
            {(unpaidSorted.length > 0 || paidPreview.length > 0) && (
              <button
                onClick={isSelecting ? handleCancelSelecting : handleStartSelecting}
                aria-label={isSelecting ? 'Cancel selection' : 'Select items'}
                style={{
                  width: 30, height: 30, borderRadius: 9,
                  border: `1px solid ${isSelecting ? 'rgba(232,103,90,0.4)' : '#3A2418'}`,
                  background: isSelecting ? '#3D1E18' : '#221714',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 150ms',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isSelecting ? '#E8675A' : '#C89080'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            )}
            {/* Add button */}
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                height: 30, padding: '0 11px 0 9px',
                background: '#E8675A', color: 'white',
                borderRadius: 9, border: 'none',
                fontSize: 12.5, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {bulkError && (
          <div
            style={{
              fontSize: 13, color: '#F0907F',
              background: '#3D1E18', border: '1px solid #5A2820',
              padding: '10px 14px', borderRadius: 12, marginBottom: 14,
            }}
          >
            {bulkError}
          </div>
        )}

        {/* Balance summary */}
        <div
          style={{
            background: '#221714',
            borderRadius: 20,
            padding: '16px 18px',
            border: '1px solid #3A2418',
            marginBottom: 14,
          }}
        >
          <p
            style={{
              fontSize: 11, color: '#7A5848', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
            }}
          >
            {totalLabel}
          </p>
          <TotalsBadges expenses={activeList} baseCurrency={baseCurrency} rates={rates} />
        </div>

        {/* Tab switcher */}
        <div
          key={activeTab + '-tabs'}
          style={{
            display: 'flex',
            background: '#221714',
            borderRadius: 14,
            padding: 4,
            gap: 4,
            border: '1px solid #3A2418',
            marginBottom: 8,
          }}
        >
          {(['owe_me', 'i_owe']).map(key => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: 'none',
                background: activeTab === key ? '#3D1E18' : 'transparent',
                color: activeTab === key ? '#E8675A' : '#7A5848',
                fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
              }}
            >
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {/* Expense list — date grouped */}
        <div key={activeTab} className={tabAnimClass}>
          {visibleExpenses.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🧾</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#C89080', marginBottom: 6 }}>
                Nothing here yet
              </p>
              <p style={{ fontSize: 13, color: '#7A5848' }}>Tap Add to log an expense</p>
            </div>
          ) : (
            <>
              {/* Unpaid groups */}
              {unpaidGroups.map((group, gi) => (
                <div key={`u-${gi}`} style={{ marginTop: 20 }}>
                  <p
                    style={{
                      fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: '#7A5848', marginBottom: 8,
                    }}
                  >
                    {group.label}
                  </p>
                  {group.items.map((expense, i) => (
                    <div key={expense.id}>
                      <ExpenseRow
                        expense={expense}
                        onToggle={handleToggle}
                        isPending={isPending}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(expense.id)}
                        onSelect={handleSelect}
                      />
                      {!isSelecting && i < group.items.length - 1 && (
                        <div style={{ height: 1, background: '#261812', margin: '0' }} />
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Paid groups */}
              {paidGroups.length > 0 && (
                <>
                  {paidGroups.map((group, gi) => (
                    <div key={`p-${gi}`} style={{ marginTop: 20 }}>
                      <p
                        style={{
                          fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.1em',
                          color: '#7A5848', marginBottom: 8,
                        }}
                      >
                        {group.label}
                      </p>
                      {group.items.map((expense, i) => (
                        <div key={expense.id}>
                          <ExpenseRow
                            expense={expense}
                            onToggle={handleToggle}
                            isPending={isPending}
                            isSelecting={isSelecting}
                            isSelected={selectedIds.has(expense.id)}
                            onSelect={handleSelect}
                          />
                          {!isSelecting && i < group.items.length - 1 && (
                            <div style={{ height: 1, background: '#261812' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  {hasMorePaid && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #261812' }}>
                      <Link
                        href={`/ledger/paid?tab=${activeTab}`}
                        style={{ fontSize: 13, color: '#E8675A', textDecoration: 'none' }}
                      >
                        See all {paidSorted.length} paid expenses →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

      </div>

      {/* Floating bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div
            className="max-w-lg mx-auto"
            style={{ padding: '0 12px 80px' }}
          >
            {selectedIds.size > 0 ? (
              <div
                style={{
                  background: '#321E1A',
                  border: '1px solid #3A2418',
                  borderRadius: 16,
                  padding: '8px 8px 8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FAF3F1', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 9,
                    border: '1px solid #3A2418', background: 'transparent',
                    color: '#FAF3F1', fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                {hasSelectedUnpaid && !hasSelectedPaid && (
                  <button
                    onClick={handleBulkMarkPaid}
                    disabled={isPending}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 9, border: 'none',
                      background: '#E8675A', color: 'white',
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    Mark paid
                  </button>
                )}
                {hasSelectedPaid && !hasSelectedUnpaid && (
                  <button
                    onClick={handleBulkUndo}
                    disabled={isPending}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 9, border: 'none',
                      background: '#E8675A', color: 'white',
                      fontSize: 12.5, fontWeight: 600,
                      fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    Undo paid
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: '#321E1A',
                  border: '1px solid #3A2418',
                  borderRadius: 16,
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, color: '#C89080', flex: 1 }}>Tap items to select</span>
                <button
                  onClick={handleCancelSelecting}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 8,
                    border: '1px solid #3A2418', background: 'transparent',
                    color: '#C89080', fontSize: 12, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            )}
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
      <LedgerHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} baseCurrency={baseCurrency} />

      {/* Add expense sheet */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className={`absolute inset-0 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            style={{ background: 'rgba(10,6,5,0.70)' }}
            onClick={handleClose}
          />
          <div
            className={`relative max-h-[92vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
            style={{
              background: '#2A1C18',
              borderRadius: '24px 24px 0 0',
              padding: '10px 20px 26px',
            }}
          >
            <div style={{ width: 36, height: 3, borderRadius: 9999, background: '#3A2418', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#FAF3F1' }}>Add expense</span>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', color: '#7A5848', cursor: 'pointer', padding: 4 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <AddExpenseForm
              currentUserName={currentUserName}
              partnerId={partnerId}
              partnerName={partnerName}
              onSuccess={handleAddSuccess}
              onCancel={handleClose}
            />
          </div>
        </div>
      )}
    </>
  )
}
