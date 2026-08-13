// Ourverse service worker — push notifications only.
//
// THERE IS DELIBERATELY NO 'fetch' HANDLER. Do not add one without measuring
// PWA launch time on a real iPhone first.
//
// Registering any fetch handler forces the browser to boot this worker before a
// navigation can complete, putting worker startup on the critical path of every
// page load. In the installed iOS PWA that was worth multiple seconds of splash
// screen. Two earlier versions made it worse:
//   1. Awaiting event.preloadResponse on navigations — on Safari that promise can
//      resolve slowly or never, and the page load blocks on it. ~8-10s launches.
//   2. Cache-first for /_next/static/ and /icons/ — redundant, because Next serves
//      those with `cache-control: public,max-age=31536000,immutable` and the
//      browser's own HTTP cache already handles them. It bought nothing and still
//      cost worker startup on every navigation.
//
// Push and notificationclick do not require a fetch handler, so the worker now
// stays entirely off the page-load path.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload only matters alongside a fetch handler. Off, so the
      // browser does not issue a second request per navigation that nothing reads.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable().catch(() => {})
      }

      // Drop the asset caches previous versions created — nothing reads them now,
      // and leaving them behind would waste storage on the device forever.
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k.startsWith('ourverse-assets-')).map((k) => caches.delete(k))
      )

      await self.clients.claim()
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
