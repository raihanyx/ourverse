import { createClient } from '@/lib/supabase/server'
import { getJwks } from '@/lib/supabase/jwks'

// Keep-warm target, pinged every 5 minutes by an external cron (cron-job.org —
// Vercel Hobby crons only run daily). Vercel idles functions out after as
// little as ~14 minutes, and a cold open measured 4-8s vs ~1s warm
// (docs/audits/launch-performance-2026-10-28.md).
//
// The request passes through proxy.js too, so one ping warms both functions.
// Beyond booting the instance, it pre-pays the per-instance costs a real
// launch would otherwise hit: supabase-js module evaluation, the JWKS cache,
// and the HTTP connection pool to Supabase (DNS + TLS).
//
// Deliberately cheap and data-free: an anon query under RLS returns no rows.
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()
  await getJwks()
  const supabase = await createClient()
  await supabase.from('couples').select('id').limit(1)
  return new Response(null, {
    status: 204,
    headers: { 'cache-control': 'no-store', 'x-warm-ms': String(Date.now() - started) },
  })
}
