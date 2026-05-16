'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import PageTransition from '@/app/components/PageTransition'

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--auth-t2)',
  display: 'block',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const inputStyle = {
  width: '100%',
  height: 48,
  padding: '0 16px',
  borderRadius: 13,
  border: '1px solid var(--auth-input-border)',
  background: 'var(--auth-input-bg)',
  fontSize: 14,
  color: 'var(--auth-t1)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null)

  return (
    <PageTransition>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--auth-t1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
        Create account
      </h2>
      <p style={{ fontSize: 13, color: 'var(--auth-t2)', marginBottom: 24 }}>
        Start your shared journey
      </p>

      <form action={formAction}>
        {state?.error && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--auth-error-fg)',
              background: 'var(--auth-error-bg)',
              border: '1px solid var(--auth-error-border)',
              padding: '10px 14px',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {state.error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="name" style={labelStyle}>Your name</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Your name or nickname"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            border: 'none',
            background: isPending ? 'var(--auth-error-bg)' : 'var(--auth-accent)',
            color: isPending ? 'var(--auth-accent)' : 'white',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          {isPending ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--auth-t2)', marginTop: 20 }}>
        Already have an account?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--auth-accent)', fontWeight: 600 }}
        >
          Sign in
        </Link>
      </p>
    </PageTransition>
  )
}
