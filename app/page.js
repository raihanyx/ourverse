import { createClient } from '@/lib/supabase/server'
import { getVerifiedClaims } from '@/lib/supabase/jwks'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()

  // Locally verified — this redirect sits on the app-launch path, so it should
  // not pay for an Auth-server round-trip just to pick a destination.
  const claims = await getVerifiedClaims(supabase)

  if (claims) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
