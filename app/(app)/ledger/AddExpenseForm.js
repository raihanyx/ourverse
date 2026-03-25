'use client'

import { useActionState, useEffect } from 'react'
import { addExpense } from '@/app/actions/expenses'

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

function inputClass(hasError) {
  return `w-full h-11 px-3.5 rounded-xl border text-sm
          focus:outline-none focus:ring-2 focus:border-transparent
          placeholder:text-gray-300 transition-colors
          ${hasError
            ? 'border-red-300 focus:ring-red-300'
            : 'border-gray-200 focus:ring-violet-400'
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

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  const today = new Date().toLocaleDateString('en-CA')
  const e = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="partner_id" value={partnerId ?? ''} />

      {/* General error (server/network failure) */}
      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      {/* Expense name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Currency
          </label>
          <select
            name="currency"
            defaultValue="IDR"
            className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          >
            <option value="IDR">IDR</option>
            <option value="THB">THB</option>
            <option value="AUD">AUD</option>
            <option value="MMK">MMK</option>
          </select>
        </div>
      </div>

      {/* Who paid */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Who paid?
        </label>
        <select
          name="who_paid"
          defaultValue="me"
          className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        >
          <option value="me">Me ({currentUserName})</option>
          {partnerId && (
            <option value="partner">{partnerName}</option>
          )}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category
        </label>
        <select
          name="category"
          defaultValue="food"
          className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        >
          <option value="food">Food</option>
          <option value="transport">Transport</option>
          <option value="accommodation">Accommodation</option>
          <option value="shopping">Shopping</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notes{' '}
          <span className="text-gray-300 font-normal">(optional)</span>
        </label>
        <input
          name="notes"
          type="text"
          placeholder="Any extra details..."
          className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm
                     focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                     placeholder:text-gray-300"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl border border-gray-200 text-sm text-gray-500
                     hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-11 bg-violet-600 text-white rounded-xl font-medium text-sm
                     hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding…' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
