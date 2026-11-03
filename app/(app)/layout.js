import Link from 'next/link'
import NavLinks from './NavLinks'

// Deliberately static — no auth call here. A dynamic layout would make every
// child route dynamic, including the static /dashboard launch screen. Every
// server-rendered page under (app) authenticates itself (getAuthUser /
// getAppSession redirect to /login), proxy.js guards them too, and the
// dashboard checks the session in the browser.
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F8F2EB] dark:bg-[#1A1210]">
      <header className="bg-[#F8F2EB] dark:bg-[#1A1210] border-b border-[#ECDFD2] dark:border-[#2E1E1A] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link
            href="/dashboard"
            className="text-[#D8513E] dark:text-[#F0907F] font-semibold text-[18px] tracking-[-0.3px]"
          >
            Ourverse
          </Link>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {children}
      </main>
      <NavLinks />
    </div>
  )
}
