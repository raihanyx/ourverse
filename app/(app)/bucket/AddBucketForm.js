'use client'

import { useActionState, useEffect, useState } from 'react'
import { addBucketItem } from '@/app/actions/bucket'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FDECEA', lightFg: '#C2493A', darkBg: '#3D1E18', darkFg: '#F0907F', label: 'Restaurant' },
  travel:     { lightBg: '#DBEAFE', lightFg: '#1E40AF', darkBg: '#1A2535', darkFg: '#7AB0D8', label: 'Travel'     },
  activity:   { lightBg: '#EAF3DE', lightFg: '#3B6D11', darkBg: '#162404', darkFg: '#8EC44C', label: 'Activity'   },
  movie:      { lightBg: '#EDE9FE', lightFg: '#5B21B6', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#F3F4F6', lightFg: '#374151', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}
const CAT_KEYS = ['restaurant', 'travel', 'activity', 'movie', 'other']

const inputClass = `w-full h-[46px] px-3.5 rounded-xl border text-[14px]
  bg-[#FDF7F6] dark:bg-[#221714]
  text-[#1C1210] dark:text-[#FAF3F1]
  placeholder:text-[#C4A89E] dark:placeholder:text-[#7A5848]
  focus:outline-none transition-colors`

const labelClass = `block text-[12px] font-semibold uppercase tracking-[0.06em]
  text-[#A07060] dark:text-[#C89080] mb-2`

export default function AddBucketForm({ coupleId, currentUserId, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(addBucketItem, null)
  const [cat, setCat] = useState('activity')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (state?.success) onSuccess(state.data)
  }, [state])

  const e = state?.errors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="couple_id" value={coupleId} />
      <input type="hidden" name="added_by_user_id" value={currentUserId} />
      <input type="hidden" name="category" value={cat} />

      {state?.error && (
        <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3A2418] px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <div>
        <label className={labelClass}>What do you want to do?</label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Visit Kyoto together"
          className={`${inputClass} ${e.name
            ? 'border-red-400 focus:border-red-400'
            : 'border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]'}`}
        />
        {e.name && <p className="text-xs text-red-500 mt-1">{e.name}</p>}
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <div className="flex flex-wrap gap-1.5">
          {CAT_KEYS.map(key => {
            const c = CAT_PALETTE[key]
            const active = cat === key
            const fg = isDark ? c.darkFg : c.lightFg
            const bg = isDark ? c.darkBg : c.lightBg
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCat(key)}
                className="px-[11px] py-[5px] rounded-lg border text-[12px] font-medium cursor-pointer transition-colors"
                style={{
                  borderColor: active ? `${fg}66` : (isDark ? '#3A2418' : '#EDE0DC'),
                  background: active ? bg : 'transparent',
                  color: active ? fg : (isDark ? '#C89080' : '#A07060'),
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Notes <span className="text-[#C4A89E] dark:text-[#7A5848] font-medium normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          name="notes"
          placeholder="Why this? Where? Any details…"
          className={`${inputClass} h-[72px] py-3 resize-none leading-[1.45]
            border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-[46px] rounded-[13px] bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D45849] text-white text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-70 mt-1"
      >
        {isPending ? 'Adding…' : 'Add to bucket list'}
      </button>
    </form>
  )
}
