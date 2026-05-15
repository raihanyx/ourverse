'use client'

import { useActionState, useEffect, useState } from 'react'
import { addCalendarEntry } from '@/app/actions/calendar'
import { todayISO } from '@/lib/currency'

const TYPE_OPTIONS = [
  { key: 'couple',      label: 'Together',    dot: '#7AB0D8' },
  { key: 'personal',    label: 'Just me',     dot: '#8EC44C' },
  { key: 'memory',      label: 'Memory',      dot: '#E8675A' },
  { key: 'anniversary', label: 'Anniversary', dot: '#F0A840' },
]

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'travel',     label: 'Travel'     },
  { value: 'activity',   label: 'Activity'   },
  { value: 'movie',      label: 'Movie'      },
  { value: 'other',      label: 'Other'      },
]

const CAT_FG = {
  restaurant: '#F0907F',
  travel:     '#7AB0D8',
  activity:   '#8EC44C',
  movie:      '#C084FC',
  other:      '#9CA3AF',
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
        className="absolute inset-0 bg-[rgba(10,6,5,0.65)] animate-fade-in"
        onClick={onCancel}
      />
      <div
        className="relative rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ background: '#2A1C18', color: '#FAF3F1' }}
      >
        <div className="w-8 h-[3px] rounded-sm mx-auto mb-[14px]" style={{ background: '#3D2820' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold">Add event</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#A07868] hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {state?.error && (
          <div className="text-sm text-[#F0907F] bg-[#3D1E18] border border-[#5A2A20] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type"     value={type} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="date"     value={date} />

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#C89080' }}>
              Title
            </label>
            <input
              name="title"
              type="text"
              placeholder="e.g. Dinner at Sushi Tei, Bali trip…"
              className="w-full h-11 px-3.5 rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#7A5848]"
              style={{
                background: '#1A1210',
                color: '#FAF3F1',
                borderColor: state?.errors?.title ? '#F0907F' : '#3A2418',
              }}
            />
            {state?.errors?.title && <p className="text-xs text-[#F0907F] mt-1">{state.errors.title}</p>}
          </div>

          {/* Type pills */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#C89080' }}>
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
                      background: selected ? `${opt.dot}38` : 'transparent',
                      color: selected ? opt.dot : '#A07868',
                      border: `1px solid ${selected ? `${opt.dot}A8` : '#3A2418'}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: opt.dot }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {type === 'couple' && (
              <p className="text-[11px] mt-2" style={{ color: '#A07868' }}>
                Adds a matching item to your bucket list{partnerName ? ` with ${partnerName}` : ''}.
              </p>
            )}
            {type === 'personal' && (
              <p className="text-[11px] mt-2" style={{ color: '#A07868' }}>
                Your own plan. Your partner can still see it.
              </p>
            )}
            {type === 'memory' && (
              <p className="text-[11px] mt-2" style={{ color: '#A07868' }}>
                Log a memory directly. Past dates only.
              </p>
            )}
            {type === 'anniversary' && (
              <p className="text-[11px] mt-2" style={{ color: '#A07868' }}>
                Sets your couple anniversary date. Shows as a heart every year.
              </p>
            )}
          </div>

          {/* Category pills */}
          {showCategory && (
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#C89080' }}>
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
                        background: selected ? `${fg}30` : 'transparent',
                        color: selected ? fg : '#A07868',
                        border: `1px solid ${selected ? `${fg}88` : '#3A2418'}`,
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
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#C89080' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setRawDate(e.target.value)}
              max={isMemory ? today : undefined}
              className="w-full h-11 px-3.5 rounded-[10px] border text-sm focus:outline-none transition-colors"
              style={{
                background: '#1A1210',
                color: '#FAF3F1',
                borderColor: '#3A2418',
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#C89080' }}>
              Notes <span className="font-normal" style={{ color: '#7A5848' }}>(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Any details, reminders, or links…"
              className="w-full px-3.5 py-[10px] rounded-[10px] border text-sm focus:outline-none transition-colors placeholder:text-[#7A5848] resize-none"
              style={{
                background: '#1A1210',
                color: '#FAF3F1',
                borderColor: '#3A2418',
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
              background: '#E8675A',
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
