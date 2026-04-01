import { getAppSession } from '@/lib/data/getAppSession'
import Link from 'next/link'
import NavLinks from './NavLinks'

export default async function AppLayout({ children }) {
  const { profile } = await getAppSession()

  return (
    <div className="min-h-screen bg-[#FDF7F6] dark:bg-[#1A1210]">
      <header className="bg-[#FDF7F6] dark:bg-[#1A1210] border-b border-[#EDE0DC] dark:border-[#2E1E1A] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link
            href="/dashboard"
            className="text-[#C2493A] dark:text-[#F0907F] font-semibold text-[18px] tracking-[-0.3px]"
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
