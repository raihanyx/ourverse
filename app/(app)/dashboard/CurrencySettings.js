'use client'

import { useActionState } from 'react'
import { updateBaseCurrency } from '@/app/actions/couple'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

export default function CurrencySettings({ current }) {
  const [state, formAction, isPending] = useActionState(updateBaseCurrency, null)

  return (
    <form action={formAction} className="flex items-center gap-2">
      <label className="text-xs text-[#A07060] dark:text-[#C49080]">Base currency</label>
      <select
        key={current}
        name="base_currency"
        defaultValue={current}
        onChange={e => e.target.form.requestSubmit()}
        className="text-xs border border-[#EDE0DC] dark:border-[#3D2C29] bg-[#FDF7F6] dark:bg-[#2A1F1D] rounded-[10px] px-2 py-1 focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
      >
        {SUPPORTED_CURRENCIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {isPending && (
        <span className="text-xs text-[#C4A89E] dark:text-[#8A6A60]">Saving…</span>
      )}
      {state?.error && (
        <span className="text-xs text-[#C2493A] dark:text-[#F0907F]">{state.error}</span>
      )}
    </form>
  )
}
