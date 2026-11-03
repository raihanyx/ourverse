// Last-seen dashboard data, kept on the device so the app can show it the
// instant it opens, before any network request finishes. The dashboard then
// refreshes it in the background (app/(app)/dashboard/DashboardClient.js).
//
// Two layers:
//   - localStorage: survives the PWA being closed; read on launch.
//   - module memory: survives client-side navigation away and back.
//
// Snapshots are tagged with the user id and ignored if a different user signs
// in. Sign-out must call clearDashboardSnapshot().

const KEY = 'ourverse-dashboard-v1'

let memory = null

// useSyncExternalStore needs a stable value between calls, so parse once per
// distinct stored string.
let lastRaw
let lastParsed = null

export function readDashboardSnapshot() {
  if (memory) return memory
  let raw = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {}
  if (raw !== lastRaw) {
    lastRaw = raw
    try {
      lastParsed = raw ? JSON.parse(raw) : null
    } catch {
      lastParsed = null
    }
  }
  return lastParsed
}

export function writeDashboardSnapshot(snapshot) {
  memory = snapshot
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {}
}

export function clearDashboardSnapshot() {
  memory = null
  lastRaw = undefined
  lastParsed = null
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
