'use client'

import { useActionState, useEffect } from 'react'
import { markCalendarEntryDone } from '@/app/actions/calendar'
import { formatDate } from '@/lib/currency'

const CATEGORY_COLORS = {
  restaurant: 'bg-[#FDECEA] text-[#C2493A] dark:bg-[#3D1E18] dark:text-[#F0907F]',
  travel:     'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]',
  activity:   'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#173404] dark:text-[#97C459]',
  movie:      'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#2D1F3A] dark:text-[#C084FC]',
  other:      'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]',
}

const CATEGORY_LABELS = {
  restaurant: 'Restaurant',
  travel:     'Travel',
  activity:   'Activity',
  movie:      'Movie',
  other:      'Other',
}

export default function CalendarMarkDoneSheet({ entry, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(markCalendarEntryDone, null)

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  const today = new Date().toLocaleDateString('en-CA')

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />

        {/* Close button */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] hover:bg-[#F5EDE9] dark:hover:bg-[#3D2820] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Entry summary card */}
        <div className="rounded-2xl bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-5 h-5 rounded-full bg-[#C2493A] dark:bg-[#E8675A] flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C2493A] dark:text-[#F0907F]">
              You did it!
            </span>
          </div>
          <p className="text-[17px] font-bold text-[#1C1210] dark:text-[#FAF3F1] leading-snug mb-2">
            {entry.title}
          </p>
          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.other}`}>
            {CATEGORY_LABELS[entry.category] ?? entry.category}
          </span>
        </div>

        {/* Early date callout */}
        {entry.date > today && (
          <div className="flex items-start gap-2.5 bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-xl px-3.5 py-3 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A07060] dark:text-[#D4A090] flex-shrink-0 mt-[1px]" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] leading-relaxed">
              You had this planned for{' '}
              <span className="font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{formatDate(entry.date)}</span>
              {' '}— you did it early! 🎉
            </p>
          </div>
        )}

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="calendar_entry_id" value={entry.id} />
          <input type="hidden" name="bucket_item_id"    value={entry.bucket_item_id ?? ''} />
          <input type="hidden" name="name"              value={entry.title} />
          <input type="hidden" name="category"          value={entry.category} />
          <input type="hidden" name="couple_id"         value={entry.couple_id} />

          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              When did you go?
            </label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm
                border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                text-[#1C1210] dark:text-[#FAF3F1]
                focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              Add a note{' '}
              <span className="text-[#C4A89E] dark:text-[#A07868] font-normal">(optional)</span>
            </label>
            <textarea
              name="note"
              rows={3}
              placeholder="How was it? Any memories…"
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm
                border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                text-[#1C1210] dark:text-[#FAF3F1]
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
              {isPending ? 'Saving…' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
