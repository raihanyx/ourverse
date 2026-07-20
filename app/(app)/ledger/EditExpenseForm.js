'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateExpense } from '@/app/actions/expenses'
import { SUPPORTED_CURRENCIES, todayISO } from '@/lib/currency'
import FieldError from '@/app/components/FieldError'

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
]

const CAT_COLORS = {
  food:          { bg: 'var(--cat-food-bg)',     fg: 'var(--cat-food-fg)' },
  transport:     { bg: 'var(--cat-travel-bg)',   fg: 'var(--cat-travel-fg)' },
  accommodation: { bg: 'var(--cat-movie-bg)',    fg: 'var(--cat-movie-fg)' },
  shopping:      { bg: 'var(--cat-shopping-bg)', fg: 'var(--cat-shopping-fg)' },
  other:         { bg: 'var(--cat-other-bg)',    fg: 'var(--cat-other-fg)' },
}

const inputStyle = {
  width: '100%',
  height: 42,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid var(--v2-border)',
  background: 'var(--v2-surface)',
  fontSize: 14,
  color: 'var(--v2-t1)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--v2-t2)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export default function EditExpenseForm({
  expense,
  currentUserId,
  currentUserName,
  partnerName,
  onSuccess,
}) {
  const [state, formAction, isPending] = useActionState(updateExpense, null)
  const [selectedCategory, setSelectedCategory] = useState(expense.category ?? 'other')
  const [selectedCurrency, setSelectedCurrency] = useState(expense.currency ?? 'IDR')
  const [paidBy, setPaidBy] = useState(expense.paid_by_user_id === currentUserId ? 'me' : 'partner')

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state, onSuccess])

  const today = todayISO()
  const e = state?.errors ?? {}
  // Settled expenses were already paid back at this value — freeze the money fields
  const amountLocked = expense.is_paid

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={expense.id} />
      <input type="hidden" name="category" value={selectedCategory} />
      <input type="hidden" name="currency" value={selectedCurrency} />
      <input type="hidden" name="who_paid" value={paidBy} />

      {state?.error && (
        <div
          style={{
            fontSize: 13, color: 'var(--v2-accent)',
            background: 'var(--v2-accentDim)', border: '1px solid rgba(var(--v2-accentRgb), 0.27)',
            padding: '10px 14px', borderRadius: 12, marginBottom: 14,
          }}
        >
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <input
            name="name"
            type="text"
            defaultValue={expense.name}
            placeholder="e.g. Dinner at Sushi Tei"
            style={{ ...inputStyle, borderColor: e.name ? 'var(--v2-accent)' : 'var(--v2-border)' }}
          />
          <FieldError message={e.name} />
        </div>

        {/* Amount + Currency */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Amount</label>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="any"
              defaultValue={expense.amount}
              disabled={amountLocked}
              placeholder="0"
              style={{
                ...inputStyle,
                borderColor: e.amount ? 'var(--v2-accent)' : 'var(--v2-border)',
                opacity: amountLocked ? 0.5 : 1,
                cursor: amountLocked ? 'not-allowed' : 'text',
              }}
            />
            <FieldError message={e.amount} />
          </div>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>Currency</label>
            <select
              value={selectedCurrency}
              onChange={ev => setSelectedCurrency(ev.target.value)}
              disabled={amountLocked}
              style={{
                ...inputStyle,
                paddingRight: 8,
                opacity: amountLocked ? 0.5 : 1,
                cursor: amountLocked ? 'not-allowed' : 'pointer',
              }}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {amountLocked && (
          <p style={{ fontSize: 11.5, color: 'var(--v2-t3)', marginTop: -4, lineHeight: 1.45 }}>
            This expense is settled, so the amount can’t be changed. Undo the payment first if it was wrong.
          </p>
        )}

        {/* Category pills */}
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXPENSE_CATEGORIES.map(({ value, label }) => {
              const c = CAT_COLORS[value]
              const active = selectedCategory === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedCategory(value)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 8,
                    border: `1px solid ${active ? `color-mix(in srgb, ${c.fg}, transparent 60%)` : 'var(--v2-border)'}`,
                    background: active ? c.bg : 'transparent',
                    color: active ? c.fg : 'var(--v2-t2)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 120ms',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Paid by + Date */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Paid by</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['me', currentUserName || 'You'], ['partner', partnerName || 'Partner']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPaidBy(val)}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 11,
                    border: `1px solid ${paidBy === val ? 'rgba(var(--v2-accentRgb), 0.4)' : 'var(--v2-border)'}`,
                    background: paidBy === val ? 'var(--v2-accentDim)' : 'transparent',
                    color: paidBy === val ? 'var(--v2-accent)' : 'var(--v2-t2)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 120ms',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 8px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Date</label>
            <input
              name="date"
              type="date"
              defaultValue={expense.date}
              max={today}
              style={{ ...inputStyle, borderColor: e.date ? 'var(--v2-accent)' : 'var(--v2-border)' }}
            />
            <FieldError message={e.date} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>
            Notes{' '}
            <span style={{ color: 'var(--v2-t3)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </span>
          </label>
          <textarea
            name="notes"
            defaultValue={expense.notes ?? ''}
            placeholder="Add a note about this expense…"
            style={{
              ...inputStyle,
              height: 56,
              padding: '10px 14px',
              resize: 'none',
              lineHeight: 1.4,
            }}
          />
          <FieldError message={e.notes} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          style={{
            width: '100%',
            height: 46,
            borderRadius: 13,
            border: 'none',
            background: 'var(--v2-accent)',
            color: 'white',
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            opacity: isPending ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
