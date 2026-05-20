'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkSetPaid, togglePaid, bulkDeleteExpenses } from '@/app/actions/expenses'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import { formatAmount } from '@/lib/currency'

// Category box colors for expense categories
const EXPENSE_CAT = {
  food:          { bg: 'var(--cat-food-bg)',     fg: 'var(--cat-food-fg)',     label: 'Food' },
  transport:     { bg: 'var(--cat-travel-bg)',   fg: 'var(--cat-travel-fg)',   label: 'Transport' },
  accommodation: { bg: 'var(--cat-movie-bg)',    fg: 'var(--cat-movie-fg)',    label: 'Accommodation' },
  shopping:      { bg: 'var(--cat-shopping-bg)', fg: 'var(--cat-shopping-fg)', label: 'Shopping' },
  other:         { bg: 'var(--cat-other-bg)',    fg: 'var(--cat-other-fg)',    label: 'Other' },
}

function CatBox({ category }) {
  const c = EXPENSE_CAT[category] ?? EXPENSE_CAT.other
  return (
    <div
      style={{
        width: 40, height: 40, borderRadius: 12,
        background: c.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <span style={{ width: 16, height: 16, borderRadius: '50%', background: c.fg, display: 'block', opacity: 0.85 }} />
    </div>
  )
}

function CatChip({ category }) {
  const c = EXPENSE_CAT[category] ?? EXPENSE_CAT.other
  return (
    <span
      style={{
        background: c.bg, color: c.fg,
        fontSize: 10, fontWeight: 600,
        padding: '2px 7px', borderRadius: 5,
        letterSpacing: '0.02em',
      }}
    >
      {c.label}
    </span>
  )
}

function formatDateLabel(dateStr) {
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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('paid-expenses-' + coupleId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        if (payload.eventType === 'INSERT') {
          if (!payload.new.is_paid) return
          setLocalExpenses(prev => prev.some(e => e.id === payload.new.id) ? prev : [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_paid) {
            setLocalExpenses(prev =>
              prev.some(e => e.id === payload.new.id)
                ? prev.map(e => e.id === payload.new.id ? payload.new : e)
                : [payload.new, ...prev]
            )
          } else {
            setLocalExpenses(prev => prev.filter(e => e.id !== payload.new.id))
          }
        } else if (payload.eventType === 'DELETE') {
          setLocalExpenses(prev => prev.filter(e => e.id !== payload.old.id))
        }
      })
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
  const iOweThem = localExpenses.filter(e => e.paid_by_user_id === partnerId)
  const activeList = activeTab === 'owe_me' ? theyOweMe : iOweThem

  const sorted = [...activeList].sort((a, b) =>
    new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)
  )

  const groups = groupByDate(sorted)

  const summaryLabel = activeTab === 'owe_me'
    ? `${partnerName} has paid you back ✓`
    : `You've paid ${partnerName} back ✓`
  const summarySub = activeTab === 'owe_me'
    ? `${sorted.length} expense${sorted.length === 1 ? '' : 's'} they settled`
    : `${sorted.length} expense${sorted.length === 1 ? '' : 's'} you settled`

  const tabLabels = {
    owe_me: `${partnerName} paid me`,
    i_owe: `I paid ${partnerName}`,
  }

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
    })
  }

  function handleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleTabChange(tabKey) { setActiveTab(tabKey); setSelectedIds(new Set()) }
  function handleCancelSelecting() { setIsSelecting(false); setSelectedIds(new Set()) }

  function handleBulkUndo() {
    const ids = sorted.filter(e => selectedIds.has(e.id)).map(e => e.id)
    if (ids.length === 0) return
    setBulkError(null)
    const removed = localExpenses.filter(e => ids.includes(e.id))
    setLocalExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false); setSelectedIds(new Set())
    startTransition(async () => {
      const result = await bulkSetPaid(ids, false)
      if (result?.error) {
        setLocalExpenses(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleBulkDelete() { if (selectedIds.size > 0) setShowDeleteConfirm(true) }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    setBulkError(null)
    const removed = localExpenses.filter(e => ids.includes(e.id))
    setShowDeleteConfirm(false)
    setLocalExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    setIsSelecting(false); setSelectedIds(new Set())
    startDeleteTransition(async () => {
      const result = await bulkDeleteExpenses(ids)
      if (result?.error) {
        setLocalExpenses(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div style={{ paddingBottom: isSelecting ? 150 : 24 }}>

      {/* Back link */}
      <div style={{ marginBottom: 14, visibility: isSelecting ? 'hidden' : 'visible' }}>
        <Link
          href="/ledger"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '0 11px 0 6px',
            borderRadius: 9999,
            background: 'var(--v2-surface)',
            border: '1px solid var(--v2-border)',
            color: 'var(--v2-t2)',
            fontSize: 12.5, fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Ledger
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--v2-t1)', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            Settled up
          </h1>
          <p style={{ fontSize: 13, color: 'var(--v2-t3)', marginTop: 3 }}>
            {localExpenses.length > 0
              ? `${localExpenses.length} paid expense${localExpenses.length === 1 ? '' : 's'} total`
              : 'No paid expenses yet'}
          </p>
        </div>
        {sorted.length > 0 && (
          <button
            onClick={isSelecting ? handleCancelSelecting : () => { setIsSelecting(true); setSelectedIds(new Set()) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 30, padding: '0 12px 0 10px',
              borderRadius: 9,
              border: `1px solid ${isSelecting ? 'rgba(var(--v2-accentRgb), 0.4)' : 'var(--v2-border)'}`,
              background: isSelecting ? 'var(--v2-accentDim)' : 'var(--v2-surface)',
              color: isSelecting ? 'var(--v2-accent)' : 'var(--v2-t2)',
              fontSize: 12.5, fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer',
              flexShrink: 0, transition: 'all 150ms',
            }}
          >
            {!isSelecting && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            )}
            {isSelecting ? 'Done' : 'Select'}
          </button>
        )}
      </div>

      {bulkError && (
        <div
          style={{
            fontSize: 13, color: 'var(--v2-accent)',
            background: 'var(--v2-accentDim)', border: '1px solid rgba(var(--v2-accentRgb), 0.27)',
            padding: '10px 14px', borderRadius: 12, marginBottom: 14,
          }}
        >
          {bulkError}
        </div>
      )}

      {/* Summary strip */}
      <div
        style={{
          background: 'var(--v2-surface)',
          borderRadius: 18, padding: '14px 18px',
          border: '1px solid var(--v2-border)',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--cat-activity-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--v2-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-t1)' }}>{summaryLabel}</p>
          <p style={{ fontSize: 12, color: 'var(--v2-t3)', marginTop: 2 }}>{summarySub}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          background: 'var(--v2-surface)',
          borderRadius: 14, padding: 4, gap: 4,
          border: '1px solid var(--v2-border)',
          marginBottom: 8,
        }}
      >
        {(['owe_me', 'i_owe']).map(key => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            style={{
              flex: 1, height: 36, borderRadius: 10, border: 'none',
              background: activeTab === key ? 'var(--v2-accentDim)' : 'transparent',
              color: activeTab === key ? 'var(--v2-accent)' : 'var(--v2-t3)',
              fontSize: 13, fontWeight: activeTab === key ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
            }}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      {/* Expense list */}
      {sorted.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✨</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--v2-t2)', marginBottom: 6 }}>
            Nothing settled here yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--v2-t3)' }}>
            {activeTab === 'owe_me'
              ? `Expenses ${partnerName} pays back will show up here`
              : 'Expenses you pay back will show up here'}
          </p>
        </div>
      ) : (
        groups.map((group, gi) => (
          <div key={gi} style={{ marginTop: 20 }}>
            <p
              style={{
                fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--v2-t3)', marginBottom: 8,
              }}
            >
              {group.label}
            </p>
            {group.items.map((expense, i) => {
              const isSelected = selectedIds.has(expense.id)
              return (
                <div key={expense.id}>
                  <div
                    onClick={isSelecting ? () => handleSelect(expense.id) : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: isSelecting ? '10px 10px' : '10px 0',
                      margin: isSelecting ? '0 -10px' : 0,
                      borderRadius: isSelecting ? 12 : 0,
                      background: isSelected ? 'var(--v2-accentDim)' : 'transparent',
                      opacity: isSelected ? 1 : 0.55,
                      cursor: isSelecting ? 'pointer' : 'default',
                      transition: 'background 150ms, opacity 250ms',
                    }}
                  >
                    <CatBox category={expense.category} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14, fontWeight: 500, color: 'var(--v2-t1)',
                          textDecoration: 'line-through', marginBottom: 4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                            fontSize: 14, fontWeight: 600, color: 'var(--v2-t1)',
                            fontVariantNumeric: 'tabular-nums',
                            marginBottom: isSelecting ? 0 : 6, textAlign: 'right',
                          }}
                        >
                          {formatAmount(expense.amount, expense.currency)}
                        </p>
                        {!isSelecting && (
                          <button
                            onClick={() => handleUndo(expense.id)}
                            disabled={isPending}
                            style={{
                              height: 24, padding: '0 10px', borderRadius: 7,
                              border: '1px solid var(--v2-border)', color: 'var(--v2-t3)',
                              background: 'transparent', fontSize: 10, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                      {isSelecting && (
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? 'var(--v2-accent)' : 'var(--v2-border)'}`,
                            background: isSelected ? 'var(--v2-accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 150ms',
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
                  {!isSelecting && i < group.items.length - 1 && (
                    <div style={{ height: 1, background: 'var(--v2-divider)' }} />
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Floating bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="max-w-lg mx-auto" style={{ padding: '0 12px 80px' }}>
            {selectedIds.size > 0 ? (
              <div
                style={{
                  background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)',
                  borderRadius: 16, padding: '8px 8px 8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-t1)', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 9,
                    border: '1px solid var(--v2-border)', background: 'transparent',
                    color: 'var(--v2-t1)', fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={handleBulkUndo}
                  disabled={isPending}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 9, border: 'none',
                    background: 'var(--v2-accent)', color: 'white',
                    fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {isPending ? 'Undoing…' : 'Undo paid'}
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)',
                  borderRadius: 16, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--v2-t2)', flex: 1 }}>Tap items to select</span>
                <button
                  onClick={handleCancelSelecting}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 8,
                    border: '1px solid var(--v2-border)', background: 'transparent',
                    color: 'var(--v2-t2)', fontSize: 12, fontWeight: 600,
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
