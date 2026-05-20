'use client'

import { useActionState, useState } from 'react'
import { createCouple, joinCouple } from '@/app/actions/couple'
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

const primaryButton = (isPending) => ({
  width: '100%',
  height: 50,
  borderRadius: 14,
  border: 'none',
  background: isPending ? 'var(--auth-error-bg)' : 'var(--auth-accent)',
  color: isPending ? 'var(--auth-accent)' : 'white',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: isPending ? 'not-allowed' : 'pointer',
  transition: 'all 200ms',
})

const secondaryButton = {
  width: '100%',
  height: 50,
  borderRadius: 14,
  border: '1px solid var(--auth-input-border)',
  background: 'var(--auth-input-bg)',
  color: 'var(--auth-t1)',
  fontSize: 15,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'all 200ms',
}

const headingStyle = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--auth-t1)',
  marginBottom: 4,
  letterSpacing: '-0.3px',
}

const subheadingStyle = {
  fontSize: 13,
  color: 'var(--auth-t2)',
  marginBottom: 24,
}

const errorStyle = {
  fontSize: 13,
  color: 'var(--auth-error-fg)',
  background: 'var(--auth-error-bg)',
  border: '1px solid var(--auth-error-border)',
  padding: '10px 14px',
  borderRadius: 12,
  marginBottom: 16,
}

const backButton = {
  background: 'none',
  border: 'none',
  color: 'var(--auth-t2)',
  fontSize: 13,
  fontFamily: 'inherit',
  padding: 0,
  marginBottom: 14,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}

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
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--auth-accent)',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {copied ? 'Copied!' : 'Copy code'}
    </button>
  )
}

export default function OnboardingClient({ userName }) {
  const [mode, setMode] = useState(null)
  const [createState, createAction, createPending] = useActionState(createCouple, null)
  const [joinState, joinAction, joinPending] = useActionState(joinCouple, null)

  // Invite code created
  if (createState?.inviteCode) {
    return (
      <PageTransition>
        <h2 style={headingStyle}>Your space is ready</h2>
        <p style={subheadingStyle}>Share this code with your partner</p>

        <div
          style={{
            background: 'var(--auth-error-bg)',
            border: '1px solid var(--auth-input-border)',
            borderRadius: 16,
            padding: '22px 16px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'var(--auth-accent)',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            {createState.inviteCode}
          </p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <CopyButton text={createState.inviteCode} />
        </div>

        <Link href="/dashboard" style={{ ...primaryButton(false), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          Continue to dashboard
        </Link>
      </PageTransition>
    )
  }

  // Mode picker
  if (!mode) {
    return (
      <PageTransition>
        <h2 style={headingStyle}>
          {userName ? `Hi ${userName}` : 'Welcome'}
        </h2>
        <p style={subheadingStyle}>Connect with your partner to begin</p>

        <button
          onClick={() => setMode('create')}
          style={{ ...primaryButton(false), marginBottom: 12 }}
        >
          Create a couple space
        </button>

        <button
          onClick={() => setMode('join')}
          style={secondaryButton}
        >
          Join with a code
        </button>
      </PageTransition>
    )
  }

  // Create confirm
  if (mode === 'create') {
    return (
      <PageTransition>
        <button onClick={() => setMode(null)} style={backButton}>← Back</button>
        <h2 style={headingStyle}>Create your space</h2>
        <p style={subheadingStyle}>
          We&apos;ll generate a 6-character code you can share with your partner.
        </p>

        {createState?.error && <div style={errorStyle}>{createState.error}</div>}

        <form action={createAction}>
          <button type="submit" disabled={createPending} style={primaryButton(createPending)}>
            {createPending ? 'Creating…' : 'Create our space'}
          </button>
        </form>
      </PageTransition>
    )
  }

  // Join
  return (
    <PageTransition>
      <button onClick={() => setMode(null)} style={backButton}>← Back</button>
      <h2 style={headingStyle}>Join a space</h2>
      <p style={subheadingStyle}>Enter the 6-character code from your partner.</p>

      {joinState?.error && <div style={errorStyle}>{joinState.error}</div>}

      <form action={joinAction}>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="inviteCode" style={labelStyle}>Invite code</label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder="ABC123"
            style={{
              ...inputStyle,
              height: 56,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          />
        </div>

        <button type="submit" disabled={joinPending} style={primaryButton(joinPending)}>
          {joinPending ? 'Joining…' : 'Join our space'}
        </button>
      </form>
    </PageTransition>
  )
}
