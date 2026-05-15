'use client'

import { useActionState, useEffect } from 'react'
import { markCalendarEntryDone } from '@/app/actions/calendar'
import { formatDate, todayISO } from '@/lib/currency'

const V2 = {
  bg:      '#1A1210',
  surface: '#2A1C18',
  border:  '#3A2418',
  t1:      '#FAF3F1',
  t2:      '#C89080',
  t3:      '#A07868',
  accent:  '#E8675A',
}

const CAT_FG = {
  restaurant: '#F0907F',
  travel:     '#7AB0D8',
  activity:   '#8EC44C',
  movie:      '#C084FC',
  other:      '#9CA3AF',
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
        style={{ background: 'rgba(10,6,5,0.65)' }}
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
            className="text-[#A07868] hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >×</button>
        </div>

        {/* Entry summary, category-tinted */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: `${catFg}1A`, border: `1px solid ${catFg}44` }}
        >
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-[0.08em] mb-2"
            style={{ background: `${catFg}2A`, color: catFg }}
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
          <div className="text-sm text-[#F0907F] bg-[#3D1E18] border border-[#5A2A20] px-4 py-3 rounded-xl mb-4">
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
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#7A5848] resize-none"
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
