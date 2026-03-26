'use client'

import { useActionState, useState } from 'react'
import { createCouple, joinCouple } from '@/app/actions/couple'
import Link from 'next/link'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm text-[#C2493A] dark:text-[#F0907F] font-medium hover:underline"
    >
      {copied ? 'Copied!' : 'Copy code'}
    </button>
  )
}

export default function OnboardingClient({ userName }) {
  const [mode, setMode] = useState(null) // null | 'create' | 'join'
  const [createState, createAction, createPending] = useActionState(createCouple, null)
  const [joinState, joinAction, joinPending] = useActionState(joinCouple, null)

  // After creating — show the invite code
  if (createState?.inviteCode) {
    return (
      <div className="text-center space-y-6">
        <div>
          <p className="text-sm text-[#A07060] dark:text-[#C49080] mb-2">Your couple space is ready!</p>
          <p className="text-sm text-[#A07060] dark:text-[#C49080]">
            Share this code with your partner so they can join:
          </p>
        </div>

        <div className="bg-[#FDECEA] dark:bg-[#4A2820] border-2 border-[#EDE0DC] dark:border-[#3D2C29] rounded-2xl py-6 px-8">
          <p className="text-4xl font-bold tracking-[0.25em] text-[#C2493A] dark:text-[#F0907F] font-mono">
            {createState.inviteCode}
          </p>
        </div>

        <CopyButton text={createState.inviteCode} />

        <Link
          href="/dashboard"
          className="block w-full py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm text-center transition-colors"
        >
          Continue to dashboard
        </Link>
      </div>
    )
  }

  // Mode picker
  if (!mode) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-[#A07060] dark:text-[#C49080] text-sm">
            Hi {userName ? <strong className="text-[#1C1210] dark:text-[#FAF3F1]">{userName}</strong> : 'there'}, let&apos;s connect you with your partner.
          </p>
        </div>

        <button
          onClick={() => setMode('create')}
          className="w-full py-4 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-medium text-sm text-left px-5 flex items-center gap-3 transition-colors"
        >
          <span className="text-2xl">✦</span>
          <div>
            <div className="font-semibold">Create a couple space</div>
            <div className="text-white/70 text-xs font-normal">Get an invite code to share</div>
          </div>
        </button>

        <button
          onClick={() => setMode('join')}
          className="w-full py-4 bg-white dark:bg-[#342420] border-2 border-[#EDE0DC] dark:border-[#3D2C29] text-[#1C1210] dark:text-[#FAF3F1] rounded-xl font-medium text-sm text-left px-5 flex items-center gap-3 hover:border-[#C2493A] dark:hover:border-[#F0907F] transition-colors"
        >
          <span className="text-2xl">♡</span>
          <div>
            <div className="font-semibold">Join with a code</div>
            <div className="text-[#A07060] dark:text-[#C49080] text-xs font-normal">Enter your partner&apos;s invite code</div>
          </div>
        </button>
      </div>
    )
  }

  // Create mode — just a confirm button (code is generated server-side)
  if (mode === 'create') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode(null)}
          className="text-sm text-[#A07060] dark:text-[#C49080] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center py-4">
          <p className="text-[#A07060] dark:text-[#C49080] text-sm">
            We&apos;ll generate a unique 6-character code you can share with your partner.
          </p>
        </div>

        {createState?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#4A2820] border border-[#EDE0DC] dark:border-[#3D2C29] px-4 py-3 rounded-xl">
            {createState.error}
          </div>
        )}

        <form action={createAction}>
          <button
            type="submit"
            disabled={createPending}
            className="w-full py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {createPending ? 'Creating…' : 'Create our space'}
          </button>
        </form>
      </div>
    )
  }

  // Join mode
  return (
    <div className="space-y-4">
      <button
        onClick={() => setMode(null)}
        className="text-sm text-[#A07060] dark:text-[#C49080] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <div className="text-center py-2">
        <p className="text-[#A07060] dark:text-[#C49080] text-sm">
          Enter the 6-character code from your partner&apos;s invite.
        </p>
      </div>

      {joinState?.error && (
        <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#4A2820] border border-[#EDE0DC] dark:border-[#3D2C29] px-4 py-3 rounded-xl">
          {joinState.error}
        </div>
      )}

      <form action={joinAction} className="space-y-4">
        <input
          name="inviteCode"
          type="text"
          required
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          className="w-full py-4 px-4 rounded-xl border-2 border-[#EDE0DC] dark:border-[#3D2C29] bg-[#FDF7F6] dark:bg-[#2A1F1D] text-center text-2xl font-bold tracking-[0.3em] font-mono uppercase focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors placeholder:text-[#C4A89E] dark:placeholder:text-[#8A6A60] placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
          placeholder="ABC123"
        />
        <button
          type="submit"
          disabled={joinPending}
          className="w-full py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {joinPending ? 'Joining…' : 'Join our space'}
        </button>
      </form>
    </div>
  )
}
