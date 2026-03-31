'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import PageTransition from '@/app/components/PageTransition'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null)

  return (
    <PageTransition>
      <h2 className="text-lg font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-0.5">Create your account</h2>
      <p className="text-sm text-[#A07060] dark:text-[#D4A090] mb-5">Start your couple space in seconds</p>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="w-full px-3 py-[10px] rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-sm focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868] transition-colors"
            placeholder="Your name or nickname"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-[10px] rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-sm focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868] transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full px-3 py-[10px] rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-sm focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] placeholder:text-[#C4A89E] dark:placeholder:text-[#A07868] transition-colors"
            placeholder="At least 6 characters"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#E8675A] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors mt-2"
        >
          {isPending ? 'Creating account…' : 'Get started'}
        </button>
      </form>

      <p className="text-center text-sm text-[#A07060] dark:text-[#D4A090] mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-[#C2493A] dark:text-[#F0907F] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </PageTransition>
  )
}
