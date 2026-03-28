'use client'

import { useActionState } from 'react'
import { updateBaseCurrency } from '@/app/actions/couple'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

export default function CurrencySettings({ current }) {
  const [state, formAction, isPending] = useActionState(updateBaseCurrency, null)

  return (
    <form action={formAction} className="flex items-center justify-between gap-2 w-full">
      <label className="text-[12px] font-medium text-[#A07060] dark:text-[#D4A090]">Base currency</label>
      <div className="flex items-center gap-2">
      <div className="relative inline-block">
        <select
          key={current}
          name="base_currency"
          defaultValue={current}
          onChange={e => e.target.form.requestSubmit()}
          className="text-[12px] font-medium text-[#1C1210] dark:text-[#FAF3F1] bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] cursor-pointer focus:outline-none transition-colors"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            paddingLeft: '10px',
            paddingRight: '28px',
            paddingTop: '4px',
            paddingBottom: '4px',
            borderRadius: '10px',
            minWidth: '72px',
            textAlign: 'center',
          }}
        >
          {SUPPORTED_CURRENCIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div
          className="text-[#A07060] dark:text-[#D4A090]"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            fontSize: '10px',
          }}
        >
          ▾
        </div>
      </div>
      {isPending && (
        <span className="text-[11px] text-[#C4A89E] dark:text-[#A07868]">Saving…</span>
      )}
      {state?.error && (
        <span className="text-[11px] text-[#C2493A] dark:text-[#F0907F]">{state.error}</span>
      )}
      </div>
    </form>
  )
}
