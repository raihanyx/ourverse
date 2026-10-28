/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
};

// Fetch Supabase's PUBLIC signing keys once per build and inline them into the
// server bundles (read by lib/supabase/jwks.js). A cold function instance can
// then verify JWTs with zero network calls — the runtime JWKS fetch measured
// 0.36-0.95s on cold opens (docs/audits/launch-performance-2026-10-28.md).
// Any failure here returns '' and jwks.js falls back to fetching at runtime,
// so a flaky build network never breaks auth.
async function fetchSupabaseJwks() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return '';
  try {
    const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json?.keys?.length ? JSON.stringify({ keys: json.keys }) : '';
  } catch {
    return '';
  }
}

export default async function config() {
  return {
    ...nextConfig,
    env: { SUPABASE_JWKS_BUILD: await fetchSupabaseJwks() },
  };
}
