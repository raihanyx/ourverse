// Ourverse service worker — push notifications + static asset caching
//
// CACHING POLICY (read before extending):
// Only content-hashed, user-agnostic assets are cached. HTML documents and RSC
// payloads are NEVER cached — they carry per-user ledger data behind auth, and a
// stale or cross-user response would be both wrong and a privacy problem.

const CACHE_VERSION = 'v1'
const ASSET_CACHE = `ourverse-assets-${CACHE_VERSION}`

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Lets the browser start the navigation request in parallel with SW boot,
      // instead of paying service-worker startup before the request even leaves.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {})
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

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached

        const response = await fetch(request)
        if (response && response.ok) {
          const cache = await caches.open(ASSET_CACHE)
          cache.put(request, response.clone())
        }
        return response
      })()
    )
    return
  }

  // Navigations: use the preloaded response if the browser produced one.
  // Never cached — see policy note at the top of this file.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const preloaded = await event.preloadResponse
        return preloaded || fetch(request)
      })()
    )
  }
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
