'use client'

import { useActionState, useEffect, useState } from 'react'
import { addExpense } from '@/app/actions/expenses'
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
  food:          { bg: '#372510', fg: '#F0A840' },
  transport:     { bg: '#1A2535', fg: '#7AB0D8' },
  accommodation: { bg: '#271A36', fg: '#C084FC' },
  shopping:      { bg: '#321624', fg: '#F472B6' },
  other:         { bg: '#222222', fg: '#9CA3AF' },
}

const inputStyle = {
  width: '100%',
  height: 42,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid #3A2418',
  background: '#221714',
  fontSize: 14,
  color: '#FAF3F1',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#C89080',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export default function AddExpenseForm({
  currentUserName,
  partnerId,
  partnerName,
  onSuccess,
  onCancel,
}) {
  const [state, formAction, isPending] = useActionState(addExpense, null)
  const [selectedCategory, setSelectedCategory] = useState('food')
  const [selectedCurrency, setSelectedCurrency] = useState('IDR')
  const [paidBy, setPaidBy] = useState('me')

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state, onSuccess])

  const today = todayISO()
  const e = state?.errors ?? {}

  return (
    <form action={formAction}>
      {/* Hidden fields for controlled values */}
      <input type="hidden" name="category" value={selectedCategory} />
      <input type="hidden" name="currency" value={selectedCurrency} />
      <input type="hidden" name="who_paid" value={paidBy} />

      {state?.error && (
        <div
          style={{
            fontSize: 13, color: '#F0907F',
            background: '#3D1E18', border: '1px solid #5A2820',
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
            placeholder="e.g. Dinner at Sushi Tei"
            style={{ ...inputStyle, borderColor: e.name ? '#F0907F' : '#3A2418' }}
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
              placeholder="0"
              style={{ ...inputStyle, borderColor: e.amount ? '#F0907F' : '#3A2418' }}
            />
            <FieldError message={e.amount} />
          </div>
          <div style={{ width: 90 }}>
            <label style={labelStyle}>Currency</label>
            <select
              value={selectedCurrency}
              onChange={e => setSelectedCurrency(e.target.value)}
              style={{ ...inputStyle, paddingRight: 8, colorScheme: 'dark' }}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

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
                    border: `1px solid ${active ? c.fg + '66' : '#3A2418'}`,
                    background: active ? c.bg : 'transparent',
                    color: active ? c.fg : '#C89080',
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

        {/* Paid by + Date in one row */}
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
                    border: `1px solid ${paidBy === val ? 'rgba(232,103,90,0.4)' : '#3A2418'}`,
                    background: paidBy === val ? '#3D1E18' : 'transparent',
                    color: paidBy === val ? '#E8675A' : '#C89080',
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
              defaultValue={today}
              max={today}
              style={{ ...inputStyle, colorScheme: 'dark', borderColor: e.date ? '#F0907F' : '#3A2418' }}
            />
            <FieldError message={e.date} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>
            Notes{' '}
            <span style={{ color: '#7A5848', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </span>
          </label>
          <textarea
            name="notes"
            placeholder="Add a note about this expense…"
            style={{
              ...inputStyle,
              height: 56,
              padding: '10px 14px',
              resize: 'none',
              lineHeight: 1.4,
            }}
          />
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
            background: '#E8675A',
            color: 'white',
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            opacity: isPending ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {isPending ? 'Adding…' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
