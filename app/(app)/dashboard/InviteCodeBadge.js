'use client'

import { useState } from 'react'

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function InviteCodeBadge({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-[18px] p-[16px_18px] flex items-center justify-between bg-white dark:bg-[#221714] border border-[#EDE0DC] dark:border-[#3A2418]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#C4A89E] dark:text-[#7A5848] mb-2">
          Invite code
        </p>
        <p className="text-[22px] font-bold tracking-[0.2em] font-mono text-[#C2493A] dark:text-[#E8675A]">
          {code ?? '------'}
        </p>
      </div>
      <button
        onClick={handleCopy}
        aria-label="Copy invite code"
        className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#FDECEA] dark:bg-[#3D1E18] text-[#C2493A] dark:text-[#E8675A] cursor-pointer border border-[#C2493A]/20 dark:border-[#E8675A]/20 transition-colors hover:bg-[#FAD5D0] dark:hover:bg-[#4D2820]"
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
      </button>
    </div>
  )
}
