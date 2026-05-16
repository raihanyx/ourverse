'use client'

import { useActionState, useEffect, useState } from 'react'
import { addCalendarEntry } from '@/app/actions/calendar'
import { todayISO } from '@/lib/currency'

const TYPE_OPTIONS = [
  { key: 'couple',      label: 'Together',    dot: 'var(--v2-blue)' },
  { key: 'personal',    label: 'Just me',     dot: 'var(--v2-green)' },
  { key: 'memory',      label: 'Memory',      dot: 'var(--v2-accent)' },
  { key: 'anniversary', label: 'Anniversary', dot: 'var(--v2-orange)' },
]

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

export default function AddCalendarEntryForm({ date: defaultDate, coupleId, partnerName, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(addCalendarEntry, null)
  const [type, setType] = useState('couple')
  const [category, setCategory] = useState('other')
  const today = todayISO()
  const [rawDate, setRawDate] = useState(defaultDate || today)
  const isMemory = type === 'memory'
  // Derive clamped date so we never call setState in an effect.
  const date = isMemory && rawDate > today ? today : rawDate

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state])

  const showCategory = type !== 'anniversary'

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(var(--v2-overlayBase), 0.65)] animate-fade-in"
        onClick={onCancel}
      />
      <div
        className="relative rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ background: 'var(--v2-card)', color: 'var(--v2-t1)' }}
      >
        <div className="w-8 h-[3px] rounded-sm mx-auto mb-[14px]" style={{ background: 'var(--v2-border)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold">Add event</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#B19A8B] dark:text-[#A07868] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {state?.error && (
          <div className="text-sm text-[#B83820] dark:text-[#F0907F] bg-[#FCE5DD] dark:bg-[#3D1E18] border border-[#F4C8BD] dark:border-[#5A2A20] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type"     value={type} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="date"     value={date} />

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--v2-t2)' }}>
              Title
            </label>
            <input
              name="title"
              type="text"
              placeholder="e.g. Dinner at Sushi Tei, Bali trip…"
              className="w-full h-11 px-3.5 rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848]"
              style={{
                background: 'var(--v2-bg)',
                color: 'var(--v2-t1)',
                borderColor: state?.errors?.title ? 'var(--v2-accent)' : 'var(--v2-border)',
              }}
            />
            {state?.errors?.title && <p className="text-xs text-[#B83820] dark:text-[#F0907F] mt-1">{state.errors.title}</p>}
          </div>

          {/* Type pills */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--v2-t2)' }}>
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const selected = type === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setType(opt.key)}
                    className="h-[38px] rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: selected ? `color-mix(in srgb, ${opt.dot}, transparent 78%)` : 'transparent',
                      color: selected ? opt.dot : 'var(--v2-t3)',
                      border: `1px solid ${selected ? `color-mix(in srgb, ${opt.dot}, transparent 34%)` : 'var(--v2-border)'}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: opt.dot }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {type === 'couple' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--v2-t3)' }}>
                Adds a matching item to your bucket list{partnerName ? ` with ${partnerName}` : ''}.
              </p>
            )}
            {type === 'personal' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--v2-t3)' }}>
                Your own plan. Your partner can still see it.
              </p>
            )}
            {type === 'memory' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--v2-t3)' }}>
                Log a memory directly. Past dates only.
              </p>
            )}
            {type === 'anniversary' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--v2-t3)' }}>
                Sets your couple anniversary date. Shows as a heart every year.
              </p>
            )}
          </div>

          {/* Category pills */}
          {showCategory && (
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--v2-t2)' }}>
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
                        color: selected ? fg : 'var(--v2-t3)',
                        border: `1px solid ${selected ? `color-mix(in srgb, ${fg}, transparent 47%)` : 'var(--v2-border)'}`,
                      }}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--v2-t2)' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setRawDate(e.target.value)}
              max={isMemory ? today : undefined}
              className="w-full h-11 px-3.5 rounded-[10px] border text-sm focus:outline-none transition-colors"
              style={{
                background: 'var(--v2-bg)',
                color: 'var(--v2-t1)',
                borderColor: 'var(--v2-border)',
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--v2-t2)' }}>
              Notes <span className="font-normal" style={{ color: 'var(--v2-t3)' }}>(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Any details, reminders, or links…"
              className="w-full px-3.5 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848] resize-none"
              style={{
                background: 'var(--v2-bg)',
                color: 'var(--v2-t1)',
                borderColor: 'var(--v2-border)',
                height: 56,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[13px] font-semibold text-[13px] disabled:opacity-50 cursor-pointer transition-colors"
            style={{
              height: 46,
              background: 'var(--v2-accent)',
              color: 'white',
            }}
          >
            {isPending ? 'Saving…' : 'Add event'}
          </button>
        </form>
      </div>
    </div>
  )
}
