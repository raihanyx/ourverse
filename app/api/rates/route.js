import { fetchRates } from '@/lib/exchangeRates'

// Exchange rates for the browser-rendered dashboard. Statically generated and
// revalidated hourly (ISR), so it is served from Vercel's CDN — no function
// cold start on the app-open path. The OER key stays server-side.
// Excluded from proxy.js's matcher so the proxy function never runs for it.
// A failed upstream fetch yields { rates: null }; the dashboard then hides
// converted totals (or keeps the last-seen rates from its snapshot).
export const revalidate = 3600

export async function GET() {
  const result = await fetchRates()
  return Response.json({ rates: result?.rates ?? null })
}
