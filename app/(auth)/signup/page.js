'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null)

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-400 mb-6">Start your couple space in seconds</p>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                       placeholder:text-gray-300 transition-shadow"
            placeholder="What your partner calls you"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                       placeholder:text-gray-300 transition-shadow"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                       placeholder:text-gray-300 transition-shadow"
            placeholder="At least 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full h-11 bg-violet-600 text-white rounded-xl font-medium text-sm
                     hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50
                     transition-colors mt-2"
        >
          {isPending ? 'Creating account…' : 'Get started'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
