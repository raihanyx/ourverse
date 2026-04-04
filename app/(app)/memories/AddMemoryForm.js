'use client'

import { useActionState, useEffect, useState } from 'react'
import { addDirectMemory } from '@/app/actions/bucket'

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'travel',     label: 'Travel'     },
  { value: 'activity',   label: 'Activity'   },
  { value: 'movie',      label: 'Movie'      },
  { value: 'other',      label: 'Other'      },
]

export default function AddMemoryForm({ onSuccess, onCancel }) {
  const today = new Date().toLocaleDateString('en-CA')
  const [state, formAction, isPending] = useActionState(addDirectMemory, null)

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
          <div>
            <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Log a memory</h2>
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mt-0.5">Saved to your memories and bucket list.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              What did you do?
            </label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Dinner at Nobu, Trip to Bali…"
              className={`w-full h-11 px-3.5 rounded-[10px] border text-sm bg-white dark:bg-[#1A1210]
                text-[#1C1210] dark:text-[#FAF3F1]
                focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors
                placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868]
                ${state?.errors?.name ? 'border-red-300 focus:ring-red-300' : 'border-[#EDE0DC] dark:border-[#3D2820]'}`}
            />
            {state?.errors?.name && (
              <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>
            )}
          </div>

          {/* Category */}
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

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              When did you do it?
            </label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className="w-full h-11 px-3.5 rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820]
                bg-white dark:bg-[#1A1210] text-sm text-[#1C1210] dark:text-[#FAF3F1]
                focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              Note{' '}
              <span className="text-[#C4A89E] dark:text-[#A07868] font-normal">(optional)</span>
            </label>
            <textarea
              name="note"
              rows={3}
              placeholder="How was it? Any details to remember…"
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
              className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending ? 'Saving…' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
