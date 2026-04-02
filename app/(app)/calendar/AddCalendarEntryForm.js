'use client'

import { useActionState, useEffect, useState } from 'react'
import { addCalendarEntry } from '@/app/actions/calendar'
import { formatDate } from '@/lib/currency'

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'travel',     label: 'Travel'     },
  { value: 'activity',   label: 'Activity'   },
  { value: 'movie',      label: 'Movie'      },
  { value: 'other',      label: 'Other'      },
]

export default function AddCalendarEntryForm({ date, coupleId, partnerName, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(addCalendarEntry, null)
  const [isPersonal, setIsPersonal] = useState(false)

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Plan a date</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Selected date display */}
        <div className="mb-4 px-3.5 py-2.5 rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]">
          <p className="text-xs text-[#A07060] dark:text-[#D4A090] mb-0.5">Date</p>
          <p className="text-sm font-medium text-[#1C1210] dark:text-[#FAF3F1]">{formatDate(date)}</p>
        </div>

        {/* Together / Just me toggle */}
        <div className="mb-5 p-1 bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-xl flex">
          <button
            type="button"
            onClick={() => setIsPersonal(false)}
            className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition-all cursor-pointer
              ${!isPersonal
                ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white shadow-sm'
                : 'text-[#A07060] dark:text-[#D4A090]'
              }`}
          >
            {partnerName ? `Together` : 'Couple'}
          </button>
          <button
            type="button"
            onClick={() => setIsPersonal(true)}
            className={`flex-1 py-2 rounded-[10px] text-sm font-medium transition-all cursor-pointer
              ${isPersonal
                ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white shadow-sm'
                : 'text-[#A07060] dark:text-[#D4A090]'
              }`}
          >
            Just me
          </button>
        </div>

        {/* Subtext */}
        <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mb-4 -mt-3">
          {isPersonal
            ? 'Your own plan — visible to both of you for coordination.'
            : `Planned together${partnerName ? ` with ${partnerName}` : ''} — adds to your bucket list.`}
        </p>

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="couple_id"   value={coupleId} />
          <input type="hidden" name="date"         value={date} />
          <input type="hidden" name="is_personal"  value={String(isPersonal)} />

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              What are you planning?
            </label>
            <input
              name="title"
              type="text"
              placeholder={isPersonal ? 'e.g. Flight home, Doctor appointment…' : 'e.g. Dinner at Nobu, Trip to Bali…'}
              className={`w-full h-11 px-3.5 rounded-[10px] border text-sm bg-white dark:bg-[#1A1210]
                text-[#1C1210] dark:text-[#FAF3F1]
                focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors
                placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868]
                ${state?.errors?.title ? 'border-red-300 focus:ring-red-300' : 'border-[#EDE0DC] dark:border-[#3D2820]'}`}
            />
            {state?.errors?.title && (
              <p className="text-xs text-red-500 mt-1">{state.errors.title}</p>
            )}
          </div>

          {/* Category — only for couple entries */}
          {!isPersonal && (
            <div>
              <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
                Category
              </label>
              <div className="relative">
                <select
                  name="category"
                  defaultValue="other"
                  className="w-full h-11 px-3.5 pr-9 rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820]
                    bg-white dark:bg-[#1A1210] text-sm text-[#1C1210] dark:text-[#FAF3F1]
                    focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors
                    appearance-none cursor-pointer"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A07060] dark:text-[#D4A090] text-xs select-none">
                  ▾
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              Notes{' '}
              <span className="text-[#C4A89E] dark:text-[#A07868] font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Any details, reminders, or links…"
              className="w-full px-3.5 py-[10px] rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820]
                bg-white dark:bg-[#1A1210] text-sm text-[#1C1210] dark:text-[#FAF3F1]
                focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors
                placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
