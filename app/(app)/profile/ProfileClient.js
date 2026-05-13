'use client'

import { useActionState, useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { updateName } from '@/app/actions/profile'
import { updateBaseCurrency } from '@/app/actions/couple'
import { logout } from '@/app/actions/auth'
import { useTheme } from '@/app/ThemeProvider'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

const CURRENCY_META = {
  IDR: { label: 'Indonesian Rupiah', symbol: 'Rp' },
  THB: { label: 'Thai Baht', symbol: '฿' },
  AUD: { label: 'Australian Dollar', symbol: 'A$' },
  MMK: { label: 'Myanmar Kyat', symbol: 'K' },
}

function SlideSheet({ open, onClose, title, children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <div className={`fixed inset-0 z-50 flex flex-col justify-end ${open ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative bg-white dark:bg-[#221714] rounded-t-[24px] border-t border-[#EDE0DC] dark:border-[#3A2418] max-h-[90vh] flex flex-col transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-[#EDE0DC] dark:bg-[#3A2418]" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h3 className="text-[16px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5EDE9] dark:bg-[#2E201C] border-0 p-0 flex items-center justify-center cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#A07060] dark:stroke-[#C89080]">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div
          className="px-5 overflow-y-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
    </div>
  )
}

function ProfileRow({ icon, label, value, onClick, right }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3.5 py-[14px] border-b border-[#F5EDE9] dark:border-[#261812] last:border-b-0 ${onClick ? 'cursor-pointer active:opacity-70' : ''}`}
    >
      <div className="w-[34px] h-[34px] rounded-[10px] bg-[#FDF7F6] dark:bg-[#221714] border border-[#EDE0DC] dark:border-[#3A2418] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[#1C1210] dark:text-[#FAF3F1]">{label}</p>
        {value && <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] mt-0.5">{value}</p>}
      </div>
      {right !== undefined ? right : (
        onClick && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#C4A89E] dark:stroke-[#7A5848] flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )
      )}
    </div>
  )
}

export default function ProfileClient({ name, email, partnerName, inviteCode, duration, baseCurrency }) {
  const { theme, toggle } = useTheme()
  const [displayName, setDisplayName] = useState(name)
  const [displayCurrency, setDisplayCurrency] = useState(baseCurrency)
  const [draft, setDraft] = useState(name)
  const [editOpen, setEditOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState(null)
  const [currencyError, setCurrencyError] = useState(null)
  const [shareLabel, setShareLabel] = useState('Share invite link')

  const [nameState, nameAction, namePending] = useActionState(updateName, null)
  const [currencyPending, startCurrencyTransition] = useTransition()

  useEffect(() => {
    if (nameState?.success) {
      setDisplayName(nameState.name)
      setDraft(nameState.name)
      setEditOpen(false)
    }
  }, [nameState])

  async function handleCurrencySelect(code) {
    setPendingCurrency(code)
    setCurrencyError(null)
    startCurrencyTransition(async () => {
      const formData = new FormData()
      formData.set('base_currency', code)
      const result = await updateBaseCurrency(null, formData)
      if (result?.success) {
        setDisplayCurrency(code)
        setCurrencyOpen(false)
      } else if (result?.error) {
        setCurrencyError(result.error)
      }
      setPendingCurrency(null)
    })
  }

  async function handleShareInvite() {
    if (!inviteCode) return
    const message = `Join me on Ourverse! Use invite code: ${inviteCode}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text: message }) } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode)
      setShareLabel('Copied!')
      setTimeout(() => setShareLabel('Share invite link'), 2000)
    }
  }

  const isDark = theme === 'dark'

  const coupleCardBg = isDark
    ? 'linear-gradient(135deg, #2E201C 0%, #3A1E18 100%)'
    : 'linear-gradient(135deg, #FDF3F1 0%, #F7E5E2 100%)'

  const decorCircleBg = isDark ? 'rgba(232,103,90,0.07)' : 'rgba(194,73,58,0.05)'

  const myInitial = displayName?.[0]?.toUpperCase() || '?'
  const partnerInitial = partnerName?.[0]?.toUpperCase() || '?'

  return (
    <div className="space-y-5">

      {/* Page title */}
      <h1 className="text-[24px] font-bold text-[#1C1210] dark:text-[#FAF3F1] tracking-[-0.4px] pt-1">
        Profile
      </h1>

      {/* Couple card */}
      <div
        className="rounded-[22px] p-5 border border-[#C2493A]/10 dark:border-[#E8675A]/10 relative overflow-hidden"
        style={{ background: coupleCardBg }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: decorCircleBg }}
        />

        {/* Avatars + heart connector */}
        <div className="flex items-start relative">

          {/* You */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-[52px] h-[52px] rounded-full bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#C2493A]/20 dark:border-[#E8675A]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[20px] font-bold text-[#C2493A] dark:text-[#E8675A] leading-none">{myInitial}</span>
            </div>
            <p className="text-[13px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mt-2.5 text-center">{displayName}</p>
            <p className="text-[11px] text-[#C4A89E] dark:text-[#7A5848] mt-0.5 text-center truncate max-w-[110px]">{email}</p>
          </div>

          {/* Heart connector */}
          <div className="flex flex-col items-center gap-1 pt-3 px-1 flex-shrink-0">
            <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#C2493A]/30 dark:via-[#E8675A]/30 to-transparent" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isDark ? '#E8675A' : '#C2493A'} stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#C2493A]/30 dark:via-[#E8675A]/30 to-transparent" />
            {duration && (
              <p className="text-[9px] text-[#C4A89E] dark:text-[#7A5848] uppercase tracking-[0.08em] mt-1 text-center whitespace-nowrap">{duration}</p>
            )}
          </div>

          {/* Partner */}
          <div className="flex-1 flex flex-col items-center">
            {partnerName ? (
              <>
                <div className="w-[52px] h-[52px] rounded-full bg-[#F0E8F0] dark:bg-[#2E1F24] border border-[#B07090]/20 dark:border-[#E89AAE]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[20px] font-bold text-[#B07090] dark:text-[#E89AAE] leading-none">{partnerInitial}</span>
                </div>
                <p className="text-[13px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mt-2.5 text-center">{partnerName}</p>
              </>
            ) : (
              <>
                <div className="w-[52px] h-[52px] rounded-full bg-[#F5EDE9] dark:bg-[#2A1C18] border border-dashed border-[#C4A89E] dark:border-[#7A5848] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#C4A89E] dark:stroke-[#7A5848]">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#C4A89E] dark:text-[#7A5848] mt-2.5 text-center">No partner</p>
              </>
            )}
          </div>
        </div>

        {/* Invite code footer */}
        {inviteCode && (
          <div className="mt-4 pt-3.5 border-t border-[#EDE0DC] dark:border-[#3A2418] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#C4A89E] dark:text-[#7A5848] mb-1">
                Invite code
              </p>
              <p
                className="text-[16px] font-bold tracking-[0.15em] text-[#C2493A] dark:text-[#E8675A]"
                style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
              >
                {inviteCode}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#FDECEA]/80 dark:bg-[#3D1E18] rounded-lg px-2.5 py-1.5 border border-[#C2493A]/20 dark:border-[#E8675A]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8EC44C] flex-shrink-0" />
              <span className="text-[11px] font-semibold text-[#C2493A] dark:text-[#E8675A]">
                {partnerName ? 'Connected' : 'Waiting'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preferences section */}
      <div>
        <SectionLabel>Preferences</SectionLabel>
        <ProfileRow
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#A07060] dark:stroke-[#C89080]">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          }
          label="Edit profile"
          value={displayName}
          onClick={() => { setDraft(displayName); setEditOpen(true) }}
        />
        <ProfileRow
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#A07060] dark:stroke-[#C89080]">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
          }
          label="Base currency"
          value={displayCurrency}
          onClick={() => setCurrencyOpen(true)}
        />
        <ProfileRow
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#A07060] dark:stroke-[#C89080]">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93l-1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          }
          label="Dark mode"
          value={theme === 'dark' ? 'On' : 'Off'}
          right={
            <button
              onClick={(e) => { e.stopPropagation(); toggle() }}
              className="cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
              aria-label="Toggle theme"
            >
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-[#C2493A] dark:bg-[#E8675A]' : 'bg-[#EDE0DC] dark:bg-[#3D2820]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          }
        />
      </div>

      {/* Account section */}
      {inviteCode && (
        <div>
          <SectionLabel>Account</SectionLabel>
          <ProfileRow
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#C2493A] dark:stroke-[#E8675A]">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            }
            label={shareLabel}
            onClick={handleShareInvite}
          />
        </div>
      )}

      {/* Sign out */}
      <form action={logout}>
        <button
          type="submit"
          className="w-full h-[46px] bg-transparent border border-[#EDE0DC] dark:border-[#3A2418] text-[#A07060] dark:text-[#7A5848] text-[14px] font-medium rounded-[14px] cursor-pointer transition-colors hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#E8675A] dark:hover:text-[#E8675A]"
        >
          Sign out
        </button>
      </form>

      {/* Edit profile sheet */}
      <SlideSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <form action={nameAction} className="space-y-4">
          <div className="flex justify-center mb-2">
            <div className="w-[72px] h-[72px] rounded-full bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#C2493A]/20 dark:border-[#E8675A]/20 flex items-center justify-center">
              <span className="text-[28px] font-bold text-[#C2493A] dark:text-[#E8675A] leading-none">
                {draft?.[0]?.toUpperCase() || myInitial}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#A07060] dark:text-[#C89080] block mb-2">
              Display name
            </label>
            <input
              name="name"
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              autoFocus
              placeholder="Your name"
              className={`w-full h-[46px] px-3.5 rounded-[12px] border text-[14px] focus:outline-none bg-[#FDF7F6] dark:bg-[#1A1210] ${
                nameState?.errors?.name
                  ? 'border-red-300 focus:border-red-300'
                  : 'border-[#EDE0DC] dark:border-[#3A2418] focus:border-[#C2493A] dark:focus:border-[#E8675A]'
              }`}
            />
            {nameState?.errors?.name && (
              <p className="text-xs text-red-500 mt-1">{nameState.errors.name}</p>
            )}
          </div>

          {nameState?.error && (
            <p className="text-sm text-[#C2493A] dark:text-[#F0907F]">{nameState.error}</p>
          )}

          <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] leading-relaxed">
            {partnerName
              ? `${partnerName} will see your name in shared expenses and bucket list items.`
              : 'Your name appears across shared expenses and bucket list items.'}
          </p>

          <button
            type="submit"
            disabled={namePending}
            className="w-full h-[50px] rounded-[14px] bg-[#C2493A] dark:bg-[#E8675A] text-white text-[15px] font-semibold cursor-pointer disabled:opacity-50 border-0 mt-1"
          >
            {namePending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </SlideSheet>

      {/* Base currency sheet */}
      <SlideSheet open={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Base currency">
        <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] mb-4 leading-relaxed">
          Totals shown across the app will be converted to your base currency.
        </p>
        <div className="flex flex-col">
          {SUPPORTED_CURRENCIES.map((code) => {
            const meta = CURRENCY_META[code]
            const active = displayCurrency === code
            const saving = currencyPending && pendingCurrency === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleCurrencySelect(code)}
                disabled={currencyPending}
                className="flex items-center gap-3.5 py-3.5 border-b border-[#F5EDE9] dark:border-[#261812] last:border-b-0 cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 w-full text-left disabled:opacity-60"
              >
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-bold flex-shrink-0 border ${
                  active
                    ? 'bg-[#FDECEA] dark:bg-[#3D1E18] border-[#C2493A]/30 dark:border-[#E8675A]/30 text-[#C2493A] dark:text-[#E8675A]'
                    : 'bg-[#FDF7F6] dark:bg-[#221714] border-[#EDE0DC] dark:border-[#3A2418] text-[#A07060] dark:text-[#C89080]'
                }`}>
                  {meta.symbol}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-[#1C1210] dark:text-[#FAF3F1]">{code}</p>
                  <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] mt-0.5">{meta.label}</p>
                </div>
                {saving && (
                  <span className="text-[11px] text-[#C4A89E] dark:text-[#7A5848]">Saving…</span>
                )}
                {active && !saving && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-[#C2493A] dark:stroke-[#E8675A] flex-shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        {currencyError && (
          <p className="text-sm text-[#C2493A] dark:text-[#F0907F] mt-3">{currencyError}</p>
        )}
      </SlideSheet>

    </div>
  )
}
