'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateName } from '@/app/actions/profile'

export default function ProfileClient({ name, email }) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(name)
  const [draft, setDraft] = useState(name)
  const [state, formAction, isPending] = useActionState(updateName, null)

  useEffect(() => {
    if (state?.success) {
      setDisplayName(draft)
      setEditing(false)
    }
  }, [state])

  function handleCancel() {
    setDraft(displayName)
    setEditing(false)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-[22px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Profile</h1>

      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]">
        <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider mb-4">
          Account
        </h2>

        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {state.error}
          </div>
        )}

        {/* Name row */}
        <div className="mb-4">
          <p className="text-xs text-[#A07060] dark:text-[#D4A090] mb-1">Name</p>
          {editing ? (
            <form action={formAction} className="space-y-2 mt-1">
              <input
                name="name"
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                autoFocus
                className={`w-full px-3 py-[10px] rounded-[10px] border text-sm
                            focus:outline-none
                            bg-[#FDF7F6] dark:bg-[#1A1210]
                            ${state?.errors?.name
                              ? 'border-red-400 focus:border-red-400'
                              : 'border-[#EDE0DC] dark:border-[#3D2820] focus:border-[#C2493A] dark:focus:border-[#F0907F]'
                            }`}
              />
              {state?.errors?.name && (
                <p className="text-xs text-red-500">{state.errors.name}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="h-9 px-4 rounded-lg border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#1C1210] dark:text-[#FAF3F1]">{displayName}</p>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-[#C2493A] dark:text-[#F0907F] font-medium hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#F5EDE9] dark:border-[#3D2820]" />

        {/* Email row */}
        <div className="mt-4">
          <p className="text-xs text-[#A07060] dark:text-[#D4A090] mb-1">Email</p>
          <p className="text-sm text-[#1C1210] dark:text-[#FAF3F1]">{email}</p>
        </div>
      </div>
    </div>
  )
}
