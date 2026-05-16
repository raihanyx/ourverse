'use client'

import { useActionState, useEffect, useState } from 'react'
import { addDirectMemory } from '@/app/actions/bucket'

const V2 = {
  bg:      'var(--v2-bg)',
  surface: 'var(--v2-card)',
  border:  'var(--v2-border)',
  t1:      'var(--v2-t1)',
  t2:      'var(--v2-t2)',
  t3:      'var(--v2-t3)',
  accent:  'var(--v2-accent)',
}

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'travel',     label: 'Travel'     },
  { value: 'activity',   label: 'Activity'   },
  { value: 'movie',      label: 'Movie'      },
  { value: 'other',      label: 'Other'      },
]
const CAT_FG = {
  restaurant: 'var(--cat-restaurant-fg)',
  travel:     'var(--cat-travel-fg)',
  activity:   'var(--cat-activity-fg)',
  movie:      'var(--cat-movie-fg)',
  other:      'var(--cat-other-fg)',
}

export default function AddMemoryForm({ date: defaultDate, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(addDirectMemory, null)
  const [category, setCategory] = useState('other')

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state])

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
          <div>
            <h2 className="text-[16px] font-semibold">Log a memory</h2>
            <p className="text-[11px] mt-0.5" style={{ color: V2.t2 }}>Saved to your memories.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#B19A8B] dark:text-[#A07868] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >×</button>
        </div>

        {state?.error && (
          <div className="text-sm text-[#B83820] dark:text-[#F0907F] bg-[#FCE5DD] dark:bg-[#3D1E18] border border-[#F4C8BD] dark:border-[#5A2A20] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="date"     value={defaultDate} />
          <input type="hidden" name="category" value={category} />

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: V2.t2 }}>
              Title
            </label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Coffee date, Bali trip…"
              className="w-full h-11 px-3.5 rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848]"
              style={{
                background: V2.bg,
                color: V2.t1,
                borderColor: state?.errors?.name ? 'var(--v2-accent)' : V2.border,
              }}
            />
            {state?.errors?.name && <p className="text-xs text-[#B83820] dark:text-[#F0907F] mt-1">{state.errors.name}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: V2.t2 }}>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const selected = category === c.value
                const fg = CAT_FG[c.value]
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className="h-8 px-3 rounded-[9px] text-[12px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: selected ? `color-mix(in srgb, ${fg}, transparent 80%)` : 'transparent',
                      color: selected ? fg : V2.t3,
                      border: `1px solid ${selected ? `color-mix(in srgb, ${fg}, transparent 47%)` : V2.border}`,
                    }}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: V2.t2 }}>
              Note <span className="font-normal" style={{ color: V2.t3 }}>(optional)</span>
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="How was it? Any details to remember…"
              className="w-full px-3.5 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848] resize-none"
              style={{ background: V2.bg, color: V2.t1, borderColor: V2.border, height: 56 }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[13px] font-semibold text-[13px] disabled:opacity-50 cursor-pointer transition-colors"
            style={{ height: 46, background: V2.accent, color: 'white' }}
          >
            {isPending ? 'Saving…' : 'Log memory'}
          </button>
        </form>
      </div>
    </div>
  )
}
