import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'
import NavLinks from './NavLinks'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-[#FDF7F6] dark:bg-[#2A1F1D]">
      <header className="bg-[#FDF7F6] dark:bg-[#2A1F1D] border-b border-[#EDE0DC] dark:border-[#3D2C29] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-[#C2493A] dark:text-[#F0907F] font-semibold text-[18px] tracking-[-0.3px]"
          >
            Ourverse
          </Link>
          <div className="flex items-center gap-3">
            <NavLinks />
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-[#C4A89E] dark:text-[#8A6A60] hover:text-[#A07060] dark:hover:text-[#C49080] transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
