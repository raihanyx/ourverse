'use client'

import { useActionState, useEffect, useState } from 'react'
import { addExpense } from '@/app/actions/expenses'
import { SUPPORTED_CURRENCIES, todayISO } from '@/lib/currency'
import StyledSelect from '@/app/components/StyledSelect'
import FieldError from '@/app/components/FieldError'

function inputClass(hasError) {
  return `w-full px-3 py-[10px] rounded-[10px] border text-sm
          focus:outline-none transition-colors
          placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868]
          bg-[#FDF7F6] dark:bg-[#1A1210]
          ${hasError
            ? 'border-red-400 focus:border-red-400'
            : 'border-[#EDE0DC] dark:border-[#3D2820] focus:border-[#C2493A] dark:focus:border-[#F0907F]'
          }`
}

export default function AddExpenseForm({
  currentUserName,
  partnerId,
  partnerName,
  onSuccess,
  onCancel,
}) {
  const [state, formAction, isPending] = useActionState(addExpense, null)
  const [selectedCurrency, setSelectedCurrency] = useState('IDR')

  const currencyHints = {
    THB: 'half of THB 400 = THB 200',
    IDR: 'half of IDR 200.000 = IDR 100.000',
    AUD: 'half of AUD 40 = AUD 20',
    MMK: 'half of MMK 20.000 = MMK 10.000',
  }

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state, onSuccess])

  const today = todayISO()
  const e = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-4">

      {/* General error */}
      {state?.error && (
        <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {/* Expense name */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          What was it for?
        </label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Coffee this morning"
          className={inputClass(!!e.name)}
        />
        <FieldError message={e.name} />
      </div>

      {/* Amount + currency */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
            Amount
          </label>
          <input
            name="amount"
            type="number"
            min="0.01"
            step="any"
            placeholder="0"
            className={inputClass(!!e.amount)}
          />
          <FieldError message={e.amount} />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
            Currency
          </label>
          <StyledSelect name="currency" defaultValue="IDR" onChange={e => setSelectedCurrency(e.target.value)}>
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </StyledSelect>
        </div>
      </div>

      <p
        className="text-[#C4A89E] dark:text-[#A07868]"
        style={{ fontSize: '11px', lineHeight: '1.5', marginBottom: '8px' }}
      >
        Enter the amount owed to you. For shared costs, enter your partner's share only (e.g. {currencyHints[selectedCurrency]}).
      </p>

      {/* Who paid */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Who paid?
        </label>
        <StyledSelect name="who_paid" defaultValue="me">
          <option value="me">Me ({currentUserName})</option>
          {partnerId && (
            <option value="partner">{partnerName}</option>
          )}
        </StyledSelect>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Category
        </label>
        <StyledSelect name="category" defaultValue="food">
          <option value="food">Food</option>
          <option value="transport">Transport</option>
          <option value="accommodation">Accommodation</option>
          <option value="shopping">Shopping</option>
          <option value="other">Other</option>
        </StyledSelect>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Date
        </label>
        <input
          name="date"
          type="date"
          defaultValue={today}
          className={inputClass(!!e.date)}
        />
        <FieldError message={e.date} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Notes{' '}
          <span className="text-[#C4A89E] dark:text-[#A07868] font-normal">(optional)</span>
        </label>
        <input
          name="notes"
          type="text"
          placeholder="Any extra details..."
          className={`w-full px-3 py-[10px] rounded-[10px] border text-sm
                      border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                      focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors
                      placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868]`}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding…' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
