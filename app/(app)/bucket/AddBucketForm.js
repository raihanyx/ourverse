'use client'

import { useActionState, useEffect, useState } from 'react'
import { addBucketItem } from '@/app/actions/bucket'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FCE3DC', lightFg: '#B83820', darkBg: 'var(--v2-accentDim)', darkFg: 'var(--v2-accent)', label: 'Restaurant' },
  travel:     { lightBg: '#DDE9F5', lightFg: '#2E6FA8', darkBg: 'var(--v2-blueBg)', darkFg: 'var(--v2-blue)', label: 'Travel'     },
  activity:   { lightBg: '#DCEDC4', lightFg: '#527C24', darkBg: '#162404', darkFg: 'var(--v2-green)', label: 'Activity'   },
  movie:      { lightBg: '#ECE0F8', lightFg: '#6F3DAB', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#EEEEEE', lightFg: '#555555', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}
const CAT_KEYS = ['restaurant', 'travel', 'activity', 'movie', 'other']

const inputClass = `w-full h-[46px] px-3.5 rounded-xl border text-[14px]
  bg-[#F8F2EB] dark:bg-[#221714]
  text-[#2A1810] dark:text-[#FAF3F1]
  placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848]
  focus:outline-none transition-colors`

const labelClass = `block text-[12px] font-semibold uppercase tracking-[0.06em]
  text-[#7A5C4E] dark:text-[#C89080] mb-2`

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
        <div className="text-sm text-[#D8513E] dark:text-[#F0907F] bg-[#FCE3DC] dark:bg-[#3D1E18] border border-[#ECDFD2] dark:border-[#3A2418] px-4 py-3 rounded-xl">
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
            : 'border-[#ECDFD2] dark:border-[#3A2418] focus:border-[#D8513E] dark:focus:border-[#E8675A]'}`}
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
                  borderColor: active ? `${fg}66` : (isDark ? 'var(--v2-border)' : '#ECDFD2'),
                  background: active ? bg : 'transparent',
                  color: active ? fg : (isDark ? 'var(--v2-t2)' : '#7A5C4E'),
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
          Notes <span className="text-[#B19A8B] dark:text-[#7A5848] font-medium normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          name="notes"
          placeholder="Why this? Where? Any details…"
          className={`${inputClass} h-[72px] py-3 resize-none leading-[1.45]
            border-[#ECDFD2] dark:border-[#3A2418] focus:border-[#D8513E] dark:focus:border-[#E8675A]`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-[46px] rounded-[13px] bg-[#D8513E] dark:bg-[#E8675A] hover:bg-[#C04830] dark:hover:bg-[#D45849] text-white text-[14.5px] font-semibold cursor-pointer transition-colors disabled:opacity-70 mt-1"
      >
        {isPending ? 'Adding…' : 'Add to bucket list'}
      </button>
    </form>
  )
}
