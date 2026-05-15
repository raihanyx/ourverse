'use client'

import { useActionState, useEffect } from 'react'
import { markAsDone } from '@/app/actions/bucket'
import { formatDate, todayISO } from '@/lib/currency'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FDECEA', lightFg: '#C2493A', darkBg: '#3D1E18', darkFg: '#F0907F', label: 'Restaurant' },
  travel:     { lightBg: '#DBEAFE', lightFg: '#1E40AF', darkBg: '#1A2535', darkFg: '#7AB0D8', label: 'Travel'     },
  activity:   { lightBg: '#EAF3DE', lightFg: '#3B6D11', darkBg: '#162404', darkFg: '#8EC44C', label: 'Activity'   },
  movie:      { lightBg: '#EDE9FE', lightFg: '#5B21B6', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#F3F4F6', lightFg: '#374151', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}

const inputClass = `w-full h-[46px] px-3.5 rounded-xl border text-[14px]
  bg-[#FDF7F6] dark:bg-[#221714]
  text-[#1C1210] dark:text-[#FAF3F1]
  placeholder:text-[#C4A89E] dark:placeholder:text-[#7A5848]
  focus:outline-none transition-colors
  border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]`

const labelClass = `block text-[12px] font-semibold uppercase tracking-[0.06em]
  text-[#A07060] dark:text-[#C89080] mb-2`

export default function MarkDoneSheet({ item, coupleId, calendarDate, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(markAsDone, null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const today = todayISO()

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  const cat = CAT_PALETTE[item.category] ?? CAT_PALETTE.other
  const fg = isDark ? cat.darkFg : cat.lightFg
  const bg = isDark ? cat.darkBg : cat.lightBg

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.7)] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="w-9 h-[3px] rounded-full bg-[#EDE0DC] dark:bg-[#3A2418] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Mark as done</h2>
          <button
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

        {/* Item summary card */}
        <div
          className="rounded-[14px] px-3.5 pt-3.5 pb-4 mb-4"
          style={{ background: bg, border: `1px solid ${fg}33` }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: fg }}>
            {cat.label}
          </span>
          <p className="text-[18px] font-bold leading-[1.25] mt-1.5 tracking-[-0.2px] text-[#1C1210] dark:text-[#FAF3F1]">
            {item.name}
          </p>
        </div>

        {/* Early date callout */}
        {calendarDate && calendarDate > today && (
          <div className="flex items-start gap-2.5 bg-[#FDF7F6] dark:bg-[#221714] border border-[#EDE0DC] dark:border-[#3A2418] rounded-xl px-3.5 py-3 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A07060] dark:text-[#C89080] flex-shrink-0 mt-px" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-[12px] text-[#A07060] dark:text-[#C89080] leading-relaxed">
              Planned for <span className="font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{formatDate(calendarDate)}</span> — you did it early! 🎉
            </p>
          </div>
        )}

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="bucket_item_id" value={item.id} />
          <input type="hidden" name="name" value={item.name} />
          <input type="hidden" name="category" value={item.category} />
          <input type="hidden" name="couple_id" value={coupleId} />

          <div>
            <label className={labelClass}>When did you do it?</label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className={inputClass}
              style={{ colorScheme: isDark ? 'dark' : 'light' }}
            />
          </div>

          <div>
            <label className={labelClass}>
              Note <span className="text-[#C4A89E] dark:text-[#7A5848] font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              name="note"
              placeholder="How was it? Anything to remember…"
              className={`${inputClass} h-[72px] py-3 resize-none leading-[1.45]`}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-[46px] rounded-[13px] bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D45849] text-white text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-70 mt-1"
          >
            {isPending ? 'Saving…' : 'Save memory'}
          </button>
        </form>
      </div>
    </div>
  )
}
