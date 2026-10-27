import { createClient } from '@/lib/supabase/server'
import { getVerifiedClaims } from '@/lib/supabase/jwks'

// [perf] TEMPORARY — receives PerfBeacon reports and stores them in perf_logs
// (Vercel Hobby keeps runtime logs only briefly). See lib/perf.js.
export async function POST(request) {
  const body = await request.text()
  if (body.length > 8000) return new Response(null, { status: 413 })

  let data
  try {
    data = JSON.parse(body)
  } catch {
    return new Response(null, { status: 400 })
  }

  console.log('[perf] vitals', body)

  const supabase = await createClient()
  const claims = await getVerifiedClaims(supabase)
  if (!claims?.sub) return new Response(null, { status: 204 })

  const { error } = await supabase.from('perf_logs').insert({
    user_id: claims.sub,
    standalone: data.standalone === true,
    data,
  })
  if (error) console.error('[perf] insert failed:', error.message)

  return new Response(null, { status: 204 })
}
