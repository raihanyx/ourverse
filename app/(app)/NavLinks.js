'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const tabs = [
  { href: '/dashboard',  label: 'Home',     Icon: HomeIcon     },
  { href: '/ledger',     label: 'Ledger',   Icon: ReceiptIcon  },
  { href: '/bucket',     label: 'Bucket',   Icon: StarIcon     },
  { href: '/calendar',   label: 'Calendar', Icon: CalendarIcon, disabled: true },
  { href: '/profile',    label: 'Profile',  Icon: UserIcon     },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#FDF7F6] dark:bg-[#1A1210] border-t border-[#EDE0DC] dark:border-[#2E1E1A]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, label, Icon, disabled }) => {
          const active = !disabled && (pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/')))
          return (
            <Link
              key={href}
              href={disabled ? '#' : href}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center relative px-3 py-1
                          ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-[#C2493A]/10 dark:bg-[#E8675A]/10" aria-hidden="true" />
              )}
              <span className={`relative transition-colors duration-200 ${active ? 'text-[#C2493A] dark:text-[#E8675A]' : 'text-[#A07060] dark:text-[#C49080]'}`}>
                <Icon />
              </span>
              <span className={`relative text-[10px] font-medium tracking-wide transition-colors duration-200 ${active ? 'text-[#C2493A] dark:text-[#E8675A]' : 'text-[#A07060] dark:text-[#C49080]'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
