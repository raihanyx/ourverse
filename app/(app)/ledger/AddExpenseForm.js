'use client'

import { useActionState, useEffect } from 'react'
import { addExpense } from '@/app/actions/expenses'

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-[#C2493A] dark:text-[#F0907F] mt-1">{message}</p>
}

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

const selectClass = `w-full px-3 py-[10px] rounded-[10px] border text-sm
                     border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                     focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors`

export default function AddExpenseForm({
  currentUserName,
  partnerId,
  partnerName,
  onSuccess,
  onCancel,
}) {
  const [state, formAction, isPending] = useActionState(addExpense, null)

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  const today = new Date().toLocaleDateString('en-CA')
  const e = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="partner_id" value={partnerId ?? ''} />

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
          placeholder="e.g. Dinner at Warung Babi Guling"
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
          <select name="currency" defaultValue="IDR" className={selectClass}>
            <option value="IDR">IDR</option>
            <option value="THB">THB</option>
            <option value="AUD">AUD</option>
            <option value="MMK">MMK</option>
          </select>
        </div>
      </div>

      {/* Who paid */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Who paid?
        </label>
        <select name="who_paid" defaultValue="me" className={selectClass}>
          <option value="me">Me ({currentUserName})</option>
          {partnerId && (
            <option value="partner">{partnerName}</option>
          )}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Category
        </label>
        <select name="category" defaultValue="food" className={selectClass}>
          <option value="food">Food</option>
          <option value="transport">Transport</option>
          <option value="accommodation">Accommodation</option>
          <option value="shopping">Shopping</option>
          <option value="other">Other</option>
        </select>
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
