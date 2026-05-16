'use client'

import { useActionState, useEffect } from 'react'
import { markCalendarEntryDone } from '@/app/actions/calendar'
import { formatDate, todayISO } from '@/lib/currency'

const V2 = {
  bg:      'var(--v2-bg)',
  surface: 'var(--v2-card)',
  border:  'var(--v2-border)',
  t1:      'var(--v2-t1)',
  t2:      'var(--v2-t2)',
  t3:      'var(--v2-t3)',
  accent:  'var(--v2-accent)',
}

const CAT_FG = {
  restaurant: 'var(--cat-restaurant-fg)',
  travel:     'var(--cat-travel-fg)',
  activity:   'var(--cat-activity-fg)',
  movie:      'var(--cat-movie-fg)',
  other:      'var(--cat-other-fg)',
}
const CAT_LABEL = {
  restaurant: 'Restaurant',
  travel:     'Travel',
  activity:   'Activity',
  movie:      'Movie',
  other:      'Other',
}

export default function CalendarMarkDoneSheet({ entry, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(markCalendarEntryDone, null)

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state])

  const today = todayISO()
  const catFg = CAT_FG[entry.category] ?? CAT_FG.other
  const catLabel = CAT_LABEL[entry.category] ?? entry.category

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(var(--v2-overlayBase), 0.65)' }}
        onClick={onCancel}
      />
      <div
        className="relative rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ background: V2.surface, color: V2.t1 }}
      >
        <div className="w-8 h-[3px] rounded-sm mx-auto mb-[14px]" style={{ background: V2.border }} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold">Mark done</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#B19A8B] dark:text-[#A07868] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >×</button>
        </div>

        {/* Entry summary, category-tinted */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: `color-mix(in srgb, ${catFg}, transparent 90%)`, border: `1px solid color-mix(in srgb, ${catFg}, transparent 73%)` }}
        >
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-[0.08em] mb-2"
            style={{ background: `color-mix(in srgb, ${catFg}, transparent 84%)`, color: catFg }}
          >
            {catLabel}
          </span>
          <p className="text-[17px] font-bold leading-snug" style={{ color: V2.t1 }}>{entry.title}</p>
        </div>

        {entry.date > today && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
            style={{ background: V2.bg, border: `1px solid ${V2.border}` }}
          >
            <span style={{ color: V2.accent, marginTop: 2 }}>🎉</span>
            <p className="text-[12px] leading-relaxed" style={{ color: V2.t2 }}>
              You had this planned for{' '}
              <span style={{ color: V2.t1, fontWeight: 600 }}>{formatDate(entry.date)}</span>
              {' '}— you did it early!
            </p>
          </div>
        )}

        {state?.error && (
          <div className="text-sm text-[#B83820] dark:text-[#F0907F] bg-[#FCE5DD] dark:bg-[#3D1E18] border border-[#F4C8BD] dark:border-[#5A2A20] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="calendar_entry_id" value={entry.id} />

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: V2.t2 }}>
              When did you go?
            </label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              max={today}
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors"
              style={{ background: V2.bg, color: V2.t1, borderColor: V2.border, colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: V2.t2 }}>
              Add a note <span className="font-normal" style={{ color: V2.t3 }}>(optional)</span>
            </label>
            <textarea
              name="note"
              rows={3}
              placeholder="How was it? Any memories…"
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848] resize-none"
              style={{ background: V2.bg, color: V2.t1, borderColor: V2.border }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[13px] font-semibold text-[13px] disabled:opacity-50 cursor-pointer transition-colors"
            style={{ height: 46, background: V2.accent, color: 'white' }}
          >
            {isPending ? 'Saving…' : 'Save memory'}
          </button>
        </form>
      </div>
    </div>
  )
}
