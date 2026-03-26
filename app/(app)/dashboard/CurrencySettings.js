'use client'

import { useActionState } from 'react'
import { updateBaseCurrency } from '@/app/actions/couple'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

export default function CurrencySettings({ current }) {
  const [state, formAction, isPending] = useActionState(updateBaseCurrency, null)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <label className="text-xs text-gray-400">Base currency</label>
      <select
        key={current}
        name="base_currency"
        defaultValue={current}
        onChange={e => e.target.form.requestSubmit()}
        className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1
                   focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
      >
        {SUPPORTED_CURRENCIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-gray-300">Saving…</span>
      )}
      {state?.error && (
        <span className="text-xs text-red-400">{state.error}</span>
      )}
    </form>
  )
}
