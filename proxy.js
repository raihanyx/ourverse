import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { getVerifiedClaims, getJwks } from '@/lib/supabase/jwks'
import { instanceInfo } from '@/lib/perf' // [perf]

export async function proxy(request) {
  const perfStart = Date.now() // [perf]
  const perfInstance = instanceInfo() // [perf]
  let perfRefreshed = false // [perf]
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          perfRefreshed = true // [perf]
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() verifies the JWT signature locally against the cached JWKS
  // (project signs ES256). Do NOT swap this for getSession() — that one is
  // unverified, it only decodes cookies. Local verification still refreshes an
  // expired session under the hood, so the cookie-forwarding contract below
  // is unchanged.
  // [perf] Warm the JWKS cache first so its cost is measured on its own —
  // getVerifiedClaims() below then hits the cache.
  const perfJwksStart = Date.now()
  await getJwks()
  const perfJwksMs = Date.now() - perfJwksStart
  const perfAuthStart = Date.now()
  const user = await getVerifiedClaims(supabase)
  const perfAuthMs = Date.now() - perfAuthStart

  const { pathname } = request.nextUrl

  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/ledger') ||
    pathname.startsWith('/bucket') ||
    pathname.startsWith('/shopping') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/memories') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/onboarding')
  const isAuthOnlyRoute =
    pathname.startsWith('/login') || pathname.startsWith('/signup')

  // Unauthenticated → protected route: send to login
  if (isAppRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated → login/signup: send to dashboard
  if (isAuthOnlyRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // [perf] Hand this request's timings to the page via a short-lived cookie —
  // PerfBeacon reads it. Document loads only, not RSC/prefetch requests.
  if (request.headers.get('accept')?.includes('text/html') && !request.headers.has('rsc')) {
    const perf = new URLSearchParams({
      cold: perfInstance.cold ? '1' : '0',
      ageMs: String(perfInstance.ageMs),
      jwksMs: String(perfJwksMs),
      authMs: String(perfAuthMs),
      refreshed: perfRefreshed ? '1' : '0',
      totalMs: String(Date.now() - perfStart),
    })
    supabaseResponse.cookies.set('__perf_px', perf.toString(), { path: '/', maxAge: 120, sameSite: 'lax' })
  }

  // IMPORTANT: return supabaseResponse so refreshed session cookies are forwarded
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
