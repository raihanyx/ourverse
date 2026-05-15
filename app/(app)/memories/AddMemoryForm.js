'use client'

import { useActionState, useEffect, useState } from 'react'
import { addDirectMemory } from '@/app/actions/bucket'
import { todayISO } from '@/lib/currency'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FDECEA', lightFg: '#C2493A', darkBg: '#3D1E18', darkFg: '#F0907F', label: 'Restaurant' },
  travel:     { lightBg: '#DBEAFE', lightFg: '#1E40AF', darkBg: '#1A2535', darkFg: '#7AB0D8', label: 'Travel'     },
  activity:   { lightBg: '#EAF3DE', lightFg: '#3B6D11', darkBg: '#162404', darkFg: '#8EC44C', label: 'Activity'   },
  movie:      { lightBg: '#EDE9FE', lightFg: '#5B21B6', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#F3F4F6', lightFg: '#374151', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}
const CAT_KEYS = ['restaurant', 'travel', 'activity', 'movie', 'other']

const inputClass = `w-full h-[42px] px-3.5 rounded-xl border text-[14px]
  bg-[#FDF7F6] dark:bg-[#221714]
  text-[#1C1210] dark:text-[#FAF3F1]
  placeholder:text-[#C4A89E] dark:placeholder:text-[#7A5848]
  focus:outline-none transition-colors`

const labelClass = `block text-[11px] font-semibold uppercase tracking-[0.06em]
  text-[#A07060] dark:text-[#C89080] mb-1.5`

export default function AddMemoryForm({ onSuccess, onCancel }) {
  const today = todayISO()
  const [state, formAction, isPending] = useActionState(addDirectMemory, null)
  const [cat, setCat] = useState('other')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state])

  const e = state?.errors ?? {}

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.7)] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="w-9 h-[3px] rounded-full bg-[#EDE0DC] dark:bg-[#3A2418] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[17px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Log a memory</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#C4A89E] dark:text-[#7A5848] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="text-[12.5px] leading-[1.4] text-[#C4A89E] dark:text-[#7A5848] -mt-2 mb-4">
          Saved to your memories and bucket list.
        </p>

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-[11px]">
          <input type="hidden" name="category" value={cat} />

          <div>
            <label className={labelClass}>What did you do?</label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Dinner at Nobu, Trip to Bali…"
              className={`${inputClass} ${e.name
                ? 'border-red-400 focus:border-red-400'
                : 'border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]'}`}
            />
            {e.name && <p className="text-xs text-red-500 mt-1">{e.name}</p>}
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CAT_KEYS.map(key => {
                const c = CAT_PALETTE[key]
                const active = cat === key
                const fg = isDark ? c.darkFg : c.lightFg
                const bg = isDark ? c.darkBg : c.lightBg
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCat(key)}
                    className="px-[11px] py-[5px] rounded-lg border text-[12px] font-medium cursor-pointer transition-colors"
                    style={{
                      borderColor: active ? `${fg}66` : (isDark ? '#3A2418' : '#EDE0DC'),
                      background: active ? bg : 'transparent',
                      color: active ? fg : (isDark ? '#C89080' : '#A07060'),
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>When did you do it?</label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className={`${inputClass} border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]`}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
            />
          </div>

          <div>
            <label className={labelClass}>
              Note <span className="text-[#C4A89E] dark:text-[#7A5848] font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              name="note"
              placeholder="Anything to remember about it…"
              className={`${inputClass} h-[56px] py-2.5 resize-none leading-[1.4]
                border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]`}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-[46px] rounded-[13px] bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D45849] text-white text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-70 mt-1"
          >
            {isPending ? 'Saving…' : 'Log memory'}
          </button>
        </form>
      </div>
    </div>
  )
}
