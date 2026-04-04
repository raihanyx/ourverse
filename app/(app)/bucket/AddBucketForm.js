'use client'

import { useActionState, useEffect } from 'react'
import { addBucketItem } from '@/app/actions/bucket'
import StyledSelect from '@/app/components/StyledSelect'

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-[#C2493A] dark:text-[#F0907F] mt-1">{message}</p>
}

function inputClass(hasError) {
  return `w-full px-3 py-[10px] rounded-[10px] border text-sm
          focus:outline-none transition-colors
          placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868]
          bg-[#FDF7F6] dark:bg-[#1A1210]
          text-[#1C1210] dark:text-[#FAF3F1]
          ${hasError
            ? 'border-red-400 focus:border-red-400'
            : 'border-[#EDE0DC] dark:border-[#3D2820] focus:border-[#C2493A] dark:focus:border-[#F0907F]'
          }`
}

export default function AddBucketForm({ coupleId, currentUserId, onSuccess, onCancel }) {
  const [state, formAction, isPending] = useActionState(addBucketItem, null)

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state])

  const e = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="couple_id" value={coupleId} />
      <input type="hidden" name="added_by_user_id" value={currentUserId} />

      {state?.error && (
        <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          What is it?
        </label>
        <input
          name="name"
          type="text"
          placeholder="e.g. Dinner at a rooftop restaurant"
          className={inputClass(!!e.name)}
        />
        <FieldError message={e.name} />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Category
        </label>
        <StyledSelect name="category" defaultValue="restaurant">
          <option value="restaurant">Restaurants &amp; cafes</option>
          <option value="travel">Travel &amp; destinations</option>
          <option value="activity">Activities &amp; experiences</option>
          <option value="movie">Movies &amp; shows</option>
          <option value="other">Other</option>
        </StyledSelect>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
          Notes{' '}
          <span className="text-[#C4A89E] dark:text-[#A07868] font-normal">(optional)</span>
        </label>
        <input
          name="notes"
          type="text"
          placeholder="Any details, location, link..."
          className={inputClass(false)}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding…' : 'Add to list'}
        </button>
      </div>
    </form>
  )
}
