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
      className="text-sm text-violet-600 font-medium hover:underline"
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
          <p className="text-sm text-gray-500 mb-2">Your couple space is ready!</p>
          <p className="text-sm text-gray-500">
            Share this code with your partner so they can join:
          </p>
        </div>

        <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl py-6 px-8">
          <p className="text-4xl font-bold tracking-[0.25em] text-violet-700 font-mono">
            {createState.inviteCode}
          </p>
        </div>

        <CopyButton text={createState.inviteCode} />

        <Link
          href="/dashboard"
          className="block w-full h-11 bg-violet-600 text-white rounded-xl font-medium text-sm
                     hover:bg-violet-700 transition-colors leading-[2.75rem]"
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
          <p className="text-gray-500 text-sm">
            Hi {userName ? <strong>{userName}</strong> : 'there'}, let&apos;s connect you with your partner.
          </p>
        </div>

        <button
          onClick={() => setMode('create')}
          className="w-full h-14 bg-violet-600 text-white rounded-xl font-medium text-sm
                     hover:bg-violet-700 transition-colors text-left px-5 flex items-center gap-3"
        >
          <span className="text-2xl">✦</span>
          <div>
            <div className="font-semibold">Create a couple space</div>
            <div className="text-violet-200 text-xs font-normal">Get an invite code to share</div>
          </div>
        </button>

        <button
          onClick={() => setMode('join')}
          className="w-full h-14 bg-white border-2 border-violet-200 text-violet-700 rounded-xl
                     font-medium text-sm hover:border-violet-400 transition-colors text-left px-5
                     flex items-center gap-3"
        >
          <span className="text-2xl">♡</span>
          <div>
            <div className="font-semibold">Join with a code</div>
            <div className="text-violet-400 text-xs font-normal">Enter your partner&apos;s invite code</div>
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
          className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="text-center py-4">
          <p className="text-gray-600 text-sm">
            We&apos;ll generate a unique 6-character code you can share with your partner.
          </p>
        </div>

        {createState?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            {createState.error}
          </div>
        )}

        <form action={createAction}>
          <button
            type="submit"
            disabled={createPending}
            className="w-full h-11 bg-violet-600 text-white rounded-xl font-medium text-sm
                       hover:bg-violet-700 disabled:opacity-50 transition-colors"
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
        className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="text-center py-2">
        <p className="text-gray-600 text-sm">
          Enter the 6-character code from your partner&apos;s invite.
        </p>
      </div>

      {joinState?.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
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
          className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-center
                     text-2xl font-bold tracking-[0.3em] font-mono uppercase
                     focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                     transition-shadow placeholder:text-gray-200 placeholder:tracking-normal
                     placeholder:text-base placeholder:font-normal"
          placeholder="ABC123"
        />
        <button
          type="submit"
          disabled={joinPending}
          className="w-full h-11 bg-violet-600 text-white rounded-xl font-medium text-sm
                     hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {joinPending ? 'Joining…' : 'Join our space'}
        </button>
      </form>
    </div>
  )
}
