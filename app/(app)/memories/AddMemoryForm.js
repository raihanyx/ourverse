'use client'

import { useActionState, useEffect, useState } from 'react'
import { addDirectMemory } from '@/app/actions/bucket'
import { todayISO } from '@/lib/currency'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FCE3DC', lightFg: '#B83820', darkBg: 'var(--v2-accentDim)', darkFg: 'var(--v2-accent)', label: 'Restaurant' },
  travel:     { lightBg: '#DDE9F5', lightFg: '#2E6FA8', darkBg: 'var(--v2-blueBg)', darkFg: 'var(--v2-blue)', label: 'Travel'     },
  activity:   { lightBg: '#DCEDC4', lightFg: '#527C24', darkBg: '#162404', darkFg: 'var(--v2-green)', label: 'Activity'   },
  movie:      { lightBg: '#ECE0F8', lightFg: '#6F3DAB', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#EEEEEE', lightFg: '#555555', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}
const CAT_KEYS = ['restaurant', 'travel', 'activity', 'movie', 'other']

const inputClass = `w-full h-[42px] px-3.5 rounded-xl border text-[14px]
  bg-[#F8F2EB] dark:bg-[#221714]
  text-[#2A1810] dark:text-[#FAF3F1]
  placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848]
  focus:outline-none transition-colors`

const labelClass = `block text-[11px] font-semibold uppercase tracking-[0.06em]
  text-[#7A5C4E] dark:text-[#C89080] mb-1.5`

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
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(var(--v2-overlayBase), 0.65)' }}
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="w-9 h-[3px] rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[17px] font-semibold text-[#2A1810] dark:text-[#FAF3F1]">Log a memory</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-[#B19A8B] dark:text-[#7A5848] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="text-[12.5px] leading-[1.4] text-[#B19A8B] dark:text-[#7A5848] -mt-2 mb-4">
          Saved to your memories and bucket list.
        </p>

        {state?.error && (
          <div className="text-sm text-[#D8513E] dark:text-[#F0907F] bg-[#FCE3DC] dark:bg-[#3D1E18] border border-[#ECDFD2] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
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
                : 'border-[#ECDFD2] dark:border-[#3A2418] focus:border-[#D8513E] dark:focus:border-[#E8675A]'}`}
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
                      borderColor: active ? `${fg}66` : (isDark ? 'var(--v2-border)' : '#ECDFD2'),
                      background: active ? bg : 'transparent',
                      color: active ? fg : (isDark ? 'var(--v2-t2)' : '#7A5C4E'),
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
              className={`${inputClass} border-[#ECDFD2] dark:border-[#3A2418] focus:border-[#D8513E] dark:focus:border-[#E8675A]`}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
            />
          </div>

          <div>
            <label className={labelClass}>
              Note <span className="text-[#B19A8B] dark:text-[#7A5848] font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              name="note"
              placeholder="Anything to remember about it…"
              className={`${inputClass} h-[56px] py-2.5 resize-none leading-[1.4]
                border-[#ECDFD2] dark:border-[#3A2418] focus:border-[#D8513E] dark:focus:border-[#E8675A]`}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-[46px] rounded-[13px] bg-[#D8513E] dark:bg-[#E8675A] hover:bg-[#C04830] dark:hover:bg-[#D45849] text-white text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-70 mt-1"
          >
            {isPending ? 'Saving…' : 'Log memory'}
          </button>
        </form>
      </div>
    </div>
  )
}
