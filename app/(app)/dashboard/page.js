import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Dashboard — Ourverse',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('name, couple_id, couples(invite_code, base_currency, anniversary_date, created_at)')
    .eq('id', user.id)
    .single()

  // Fetch partner (other user in same couple)
  const { data: partner } = await supabase
    .from('users')
    .select('name')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  const couple = profile?.couples
  const memberSince = couple?.created_at
    ? new Date(couple.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Hey, {profile?.name}
        </h1>
        {partner && (
          <p className="text-gray-400 text-sm mt-0.5">
            Connected with {partner.name}
          </p>
        )}
      </div>

      {/* Couple space card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Your couple space
          </h2>
          <span className="text-xs text-gray-300 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full font-mono">
            {couple?.base_currency ?? 'IDR'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Invite code</p>
            <p className="text-2xl font-bold tracking-[0.2em] font-mono text-violet-700">
              {couple?.invite_code}
            </p>
          </div>
        </div>

        {memberSince && (
          <p className="text-xs text-gray-300">Together since {memberSince}</p>
        )}
      </div>

      {/* Coming soon placeholder */}
      <div className="bg-gradient-to-br from-violet-50 to-rose-50 rounded-2xl border border-violet-100 p-5">
        <p className="text-sm font-medium text-violet-700 mb-1">Expense ledger coming next</p>
        <p className="text-sm text-violet-400">
          Log what you paid, see who owes what — in IDR, THB, AUD, or MMK.
        </p>
      </div>
    </div>
  )
}
