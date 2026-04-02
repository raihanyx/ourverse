'use client'

import { useActionState, useEffect } from 'react'
import { markCalendarEntryDone } from '@/app/actions/calendar'

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

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">You did it!</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[13px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{entry.title}</p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mt-0.5 capitalize">{entry.category}</p>
        </div>

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="calendar_entry_id" value={entry.id} />
          <input type="hidden" name="bucket_item_id"    value={entry.bucket_item_id} />
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
