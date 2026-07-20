'use client'

import { formatAmount, formatDate } from '@/lib/currency'
import ExpenseSheet from './ExpenseSheet'

const EXPENSE_CAT = {
  food:          { bg: 'var(--cat-food-bg)',     fg: 'var(--cat-food-fg)',     label: 'Food' },
  transport:     { bg: 'var(--cat-travel-bg)',   fg: 'var(--cat-travel-fg)',   label: 'Transport' },
  accommodation: { bg: 'var(--cat-movie-bg)',    fg: 'var(--cat-movie-fg)',    label: 'Accommodation' },
  shopping:      { bg: 'var(--cat-shopping-bg)', fg: 'var(--cat-shopping-fg)', label: 'Shopping' },
  other:         { bg: 'var(--cat-other-bg)',    fg: 'var(--cat-other-fg)',    label: 'Other' },
}

function Row({ label, children }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, padding: '11px 0',
        borderBottom: '1px solid var(--v2-divider)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--v2-t3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13.5, color: 'var(--v2-t1)', fontWeight: 500, textAlign: 'right', minWidth: 0 }}>
        {children}
      </span>
    </div>
  )
}

export default function ExpenseDetailSheet({
  expense,
  currentUserId,
  currentUserName,
  partnerName,
  isClosing,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}) {
  const c = EXPENSE_CAT[expense.category] ?? EXPENSE_CAT.other
  const paidByLabel = expense.paid_by_user_id === currentUserId
    ? (currentUserName || 'You')
    : (partnerName || 'Partner')

  return (
    <ExpenseSheet title="Expense details" isClosing={isClosing} onClose={onClose}>
      {/* Amount hero */}
      <div
        style={{
          background: 'var(--v2-surface)',
          border: '1px solid var(--v2-border)',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: c.fg, display: 'block', opacity: 0.85 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--v2-t3)', lineHeight: 1.3, wordBreak: 'break-word' }}>
              {expense.name}
            </p>
            <p
              style={{
                fontSize: 16.5, fontWeight: 700, color: 'var(--v2-t1)',
                fontVariantNumeric: 'tabular-nums', marginTop: 2, lineHeight: 1.25,
              }}
            >
              {formatAmount(expense.amount, expense.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ marginBottom: 4 }}>
        <Row label="Status">
          <span style={{ color: expense.is_paid ? 'var(--v2-green)' : 'var(--v2-accent)' }}>
            {expense.is_paid ? 'Settled ✓' : 'Unsettled'}
          </span>
        </Row>
        <Row label="Paid by">{paidByLabel}</Row>
        <Row label="Category">
          <span
            style={{
              background: c.bg, color: c.fg,
              fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 6,
            }}
          >
            {c.label}
          </span>
        </Row>
        <Row label="Date">{formatDate(expense.date)}</Row>
        <div style={{ padding: '11px 0' }}>
          <p style={{ fontSize: 12.5, color: 'var(--v2-t3)', marginBottom: 6 }}>Notes</p>
          <p
            style={{
              fontSize: 13.5,
              color: expense.notes ? 'var(--v2-t1)' : 'var(--v2-t3)',
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontStyle: expense.notes ? 'normal' : 'italic',
            }}
          >
            {expense.notes || 'No notes added.'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={onDelete}
          style={{
            height: 44, padding: '0 14px', borderRadius: 12,
            border: '1px solid var(--v2-border)', background: 'transparent',
            color: 'var(--v2-t2)', fontSize: 13.5, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Delete
        </button>
        <button
          onClick={onToggle}
          style={{
            flex: 1, height: 44, borderRadius: 12,
            border: '1px solid var(--v2-border)', background: 'var(--v2-surface)',
            color: 'var(--v2-t1)', fontSize: 13.5, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {expense.is_paid ? 'Undo paid' : 'Mark paid'}
        </button>
        <button
          onClick={onEdit}
          style={{
            flex: 1, height: 44, borderRadius: 12, border: 'none',
            background: 'var(--v2-accent)', color: 'white',
            fontSize: 13.5, fontWeight: 600,
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Edit
        </button>
      </div>
    </ExpenseSheet>
  )
}
