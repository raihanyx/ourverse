import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-violet-700 font-semibold text-lg tracking-tight">
            Ourverse
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/ledger"
              className="text-sm text-gray-500 hover:text-violet-700 font-medium transition-colors"
            >
              Ledger
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
