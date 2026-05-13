'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import Link from 'next/link'
import PageTransition from '@/app/components/PageTransition'

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#C89080',
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
  border: '1px solid #3A2418',
  background: '#221714',
  fontSize: 14,
  color: '#FAF3F1',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <PageTransition>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FAF3F1', marginBottom: 4, letterSpacing: '-0.3px' }}>
        Welcome back
      </h2>
      <p style={{ fontSize: 13, color: '#C89080', marginBottom: 24 }}>
        Sign in to your couple space
      </p>

      <form action={formAction}>
        {state?.error && (
          <div
            style={{
              fontSize: 13,
              color: '#F0907F',
              background: '#3D1E18',
              border: '1px solid #5A2820',
              padding: '10px 14px',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {state.error}
          </div>
        )}

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
            autoComplete="current-password"
            required
            placeholder="••••••••"
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
            background: isPending ? '#3D1E18' : '#E8675A',
            color: isPending ? '#E8675A' : 'white',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#C89080', marginTop: 20 }}>
        New here?{' '}
        <Link
          href="/signup"
          style={{ color: '#E8675A', fontWeight: 600 }}
        >
          Create account
        </Link>
      </p>
    </PageTransition>
  )
}
