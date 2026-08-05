/**
 * Module-scope JWKS cache for local JWT verification.
 *
 * WHY THIS FILE EXISTS: supabase-js caches JWKS in memory on the *client
 * instance*, but we build a fresh server client per request. Left alone,
 * getClaims() would therefore fetch /.well-known/jwks.json on every single
 * request — trading one network round-trip (getUser) for another, and gaining
 * nothing. Caching the key set at module scope means a warm Fluid Compute
 * instance verifies tokens with zero network calls.
 *
 * The project signs with ES256 (P-256). If it is ever rotated back to a
 * symmetric HS256 secret, getClaims() detects that from the token header and
 * silently falls back to a getUser() round-trip — correct, just slower.
 */

const JWKS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`

// Comfortably shorter than a key rotation window, long enough that a busy
// instance almost never refetches.
const TTL_MS = 10 * 60 * 1000

let cached = null
let cachedAt = 0
let inflight = null

async function fetchJwks() {
  try {
    const res = await fetch(JWKS_URL)
    if (!res.ok) return cached
    const json = await res.json()
    if (!json?.keys?.length) return cached
    cached = json
    cachedAt = Date.now()
    return cached
  } catch {
    // Serving a stale key set beats failing every request in the app.
    return cached
  } finally {
    inflight = null
  }
}

export async function getJwks() {
  if (cached && cachedAt + TTL_MS > Date.now()) return cached
  // Collapse concurrent misses into one request.
  inflight = inflight ?? fetchJwks()
  return inflight
}

/**
 * Verified JWT claims, or null when there is no valid session.
 *
 * Verification is local (WebCrypto against the cached JWKS). getClaims()
 * internally goes through getSession(), which still refreshes an expired token
 * over the network — so proxy.js keeps its session-refresh responsibility.
 */
export async function getVerifiedClaims(supabase) {
  const jwks = await getJwks()

  const { data, error } = await supabase.auth.getClaims(
    undefined,
    jwks?.keys ? { keys: jwks.keys } : {}
  )

  if (error || !data?.claims) return null
  return data.claims
}

/**
 * Shape claims like the user object the app already passes around.
 * Only id / email / user_metadata are consumed anywhere in this codebase.
 *
 * NOTE: user_metadata here is whatever was baked into the token at issue time,
 * not live DB state. Right after createCouple/joinCouple the token predates the
 * couple_id write, so callers must tolerate a null couple_id and fall back to a
 * users-table lookup (resolveCoupleId does exactly that).
 */
export function claimsToUser(claims) {
  if (!claims?.sub) return null
  return {
    id: claims.sub,
    email: claims.email ?? null,
    user_metadata: claims.user_metadata ?? {},
  }
}
