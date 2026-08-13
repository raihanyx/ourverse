// Ourverse service worker — push notifications + static asset caching
//
// CACHING POLICY (read before extending):
// Only content-hashed, user-agnostic assets are cached. HTML documents and RSC
// payloads are NEVER cached — they carry per-user ledger data behind auth, and a
// stale or cross-user response would be both wrong and a privacy problem.

// NAVIGATION POLICY (do not re-add a navigate branch without measuring on iOS):
// This worker deliberately does NOT call respondWith() for navigation requests.
// It previously awaited event.preloadResponse, which on Safari can resolve slowly
// or not at all — and because the page load is blocked on that promise, the app
// sits on its splash screen the whole time. Letting navigations go straight to
// the network takes the worker off the critical path for page loads entirely.
// Navigation preload is left disabled since nothing consumes it.

// Kept at v1 on purpose: cache entries are keyed by content-hashed URLs, so old
// entries can never go stale. Bumping this would purge them and force a full
// re-download on the next launch for no correctness gain.
const CACHE_VERSION = 'v1'
const ASSET_CACHE = `ourverse-assets-${CACHE_VERSION}`

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Explicitly off: with no navigate branch, an enabled preload would issue a
      // second request per navigation that nothing reads.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable().catch(() => {})
      }

      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k.startsWith('ourverse-assets-') && k !== ASSET_CACHE)
            .map((k) => caches.delete(k))
      )

      await self.clients.claim()
    })()
  )
})

// Content-hashed build output and static icons — safe to serve cache-first
// because the filename changes whenever the bytes change.
function isCacheableAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Everything below narrows to content-hashed static assets. Any request that
  // is not one — navigations, RSC payloads, Supabase calls — falls through
  // untouched and is handled by the browser as if no worker existed.
  if (request.method !== 'GET') return
  if (request.mode === 'navigate') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return
  if (!isCacheableAsset(url)) return

  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request)
        if (cached) return cached

        const response = await fetch(request)
        if (response && response.ok) {
          const cache = await caches.open(ASSET_CACHE)
          cache.put(request, response.clone()).catch(() => {})
        }
        return response
      } catch {
        // Never let a cache failure turn into a failed asset request.
        return fetch(request)
      }
    })()
  )
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Ourverse', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Ourverse'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: payload.tag || 'ourverse',
    data: { url: payload.url || '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {})
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})
