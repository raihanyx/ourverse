'use client'

import { useActionState, useEffect, useState } from 'react'
import { updateName } from '@/app/actions/profile'
import { useTheme } from '@/app/ThemeProvider'

export default function ProfileClient({ name, email }) {
  const { theme, toggle } = useTheme()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(name)
  const [draft, setDraft] = useState(name)
  const [state, formAction, isPending] = useActionState(updateName, null)

  useEffect(() => {
    if (state?.success) {
      setDisplayName(state.name)
      setDraft(state.name)
      setEditing(false)
    }
  }, [state])

  function handleCancel() {
    setDraft(displayName)
    setEditing(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">Profile</h1>
          <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">Manage your account</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
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
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-9 px-4 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="flex-1 h-9 px-4 rounded-lg border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] disabled:opacity-50 transition-colors cursor-pointer"
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
                className="h-7 px-3 rounded-lg border border-[#EDE0DC] dark:border-[#3D2820] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors cursor-pointer"
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

      {/* Appearance */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider mb-4">
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#1C1210] dark:text-[#FAF3F1]">
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>
            <p className="text-xs text-[#A07060] dark:text-[#D4A090] mt-0.5">
              Follows your system preference by default
            </p>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="cursor-pointer"
          >
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-[#C2493A] dark:bg-[#E8675A]' : 'bg-[#EDE0DC] dark:bg-[#3D2820]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
