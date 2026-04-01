'use client'

import { useState } from 'react'

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-xl px-4 py-2.5">
        <p className="text-2xl font-bold tracking-[0.2em] font-mono text-[#C2493A] dark:text-[#F0907F] text-center">
          {code}
        </p>
      </div>
      <button
        onClick={handleCopy}
        aria-label="Copy invite code"
        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-colors duration-200 cursor-pointer
          ${copied
            ? 'bg-[#C2493A] dark:bg-[#E8675A] border-[#C2493A] dark:border-[#E8675A] text-white'
            : 'bg-[#FDF7F6] dark:bg-[#1A1210] border-[#EDE0DC] dark:border-[#3D2820] text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] dark:hover:border-[#E8675A] hover:text-[#C2493A] dark:hover:text-[#E8675A]'
          }`}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
}
