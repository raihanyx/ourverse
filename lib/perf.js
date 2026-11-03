// [perf] TEMPORARY launch-time instrumentation. Remove together with
// app/components/PerfBeacon.js, app/api/vitals/route.js, the [perf] lines in
// proxy.js and dashboard/DashboardClient.js, the timed() calls in
// lib/data/dashboardData.js, and the perf_logs table.

// Module scope lives as long as the function instance — a fresh value here
// means this request paid for a cold start.
const bootedAt = Date.now()
let requests = 0

/** { cold, ageMs } for the current function instance. */
export function instanceInfo() {
  requests += 1
  return { cold: requests === 1, ageMs: Date.now() - bootedAt }
}

/** Wall-clock ms. Wrapped so server components can call it without tripping
 *  the react-hooks/purity lint (a server render runs once — no instability). */
export const perfNow = () => Date.now()

/**
 * Resolve `promise` (or a thenable, e.g. a Supabase query builder) and record
 * how long it took into `sink[label]`.
 */
export function timed(label, promise, sink) {
  const start = Date.now()
  return Promise.resolve(promise).then(value => {
    sink[label] = Date.now() - start
    return value
  })
}
