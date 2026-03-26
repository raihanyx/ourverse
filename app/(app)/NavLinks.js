'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '../ThemeProvider'

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function NavLinks() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/ledger"
        className={`text-[13px] font-medium transition-colors pb-0.5
          ${pathname === '/ledger'
            ? 'text-[#C2493A] dark:text-[#F0907F] border-b-2 border-[#C2493A] dark:border-[#F0907F]'
            : 'text-[#A07060] dark:text-[#C49080] border-b-2 border-transparent'
          }`}
      >
        Ledger
      </Link>
      <Link
        href="/profile"
        className={`text-[13px] font-medium transition-colors pb-0.5
          ${pathname === '/profile'
            ? 'text-[#C2493A] dark:text-[#F0907F] border-b-2 border-[#C2493A] dark:border-[#F0907F]'
            : 'text-[#A07060] dark:text-[#C49080] border-b-2 border-transparent'
          }`}
      >
        Profile
      </Link>
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-8 h-8 rounded-full flex items-center justify-center
                   text-[#A07060] dark:text-[#C49080]
                   hover:bg-[#EDE0DC] dark:hover:bg-[#342420] transition-colors"
      >
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>
    </div>
  )
}
