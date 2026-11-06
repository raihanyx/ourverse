// Last-seen data for a tab, kept on the device so the tab can render the
// instant it is opened, before any network request finishes. The tab then
// refreshes it in the background. Same idea as lib/dashboardSnapshot.js,
// generalised so other tabs can adopt it (currently: ledger).
//
// Two layers:
//   - localStorage: survives the PWA being closed.
//   - module memory: survives client-side navigation away and back.
//
// Snapshots must be tagged with the user id by the caller and ignored if a
// different user signs in. Sign-out must call clearPageSnapshots().

const PREFIX = 'ourverse-page-'

const stores = new Set()

export function createPageSnapshot(name) {
  const key = `${PREFIX}${name}-v1`
  let memory = null
  // useSyncExternalStore needs a stable value between calls, so parse once per
  // distinct stored string.
  let lastRaw
  let lastParsed = null

  const store = {
    read() {
      if (memory) return memory
      let raw = null
      try {
        raw = localStorage.getItem(key)
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
    },
    write(snapshot) {
      memory = snapshot
      try {
        localStorage.setItem(key, JSON.stringify(snapshot))
      } catch {}
    },
    clear() {
      memory = null
      lastRaw = undefined
      lastParsed = null
      try {
        localStorage.removeItem(key)
      } catch {}
    },
  }
  stores.add(store)
  return store
}

/**
 * Drop every tab snapshot: the in-memory ones loaded in this bundle, and any
 * stored by tabs whose module has not been loaded yet (swept by key prefix).
 */
export function clearPageSnapshots() {
  for (const store of stores) store.clear()
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch {}
}
