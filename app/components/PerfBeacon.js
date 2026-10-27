'use client'

import { useEffect } from 'react'

// [perf] TEMPORARY launch-time instrumentation — see lib/perf.js.
//
// Once per document load (not per client-side navigation), after the page has
// fully loaded and gone quiet, sends one report to /api/vitals: the browser's
// navigation timing, the proxy's timings (from the __perf_px cookie) and the
// dashboard render's timings (props). Runs after `load`, so it is not on the
// launch path.
//
// What it cannot see: the time between tapping the home-screen icon and the
// navigation starting (iOS booting WebKit). That is the gap between how long
// the open felt and `load` below.

let sent = false

const ms = n => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : null)

function readProxyTimings() {
  const match = document.cookie.match(/(?:^|; )__perf_px=([^;]*)/)
  if (!match) return null
  try {
    return Object.fromEntries(new URLSearchParams(decodeURIComponent(match[1])))
  } catch {
    return null
  }
}

function collect({ page, hydrated, sinceLastOpenMin, proxy }) {
  const nav = performance.getEntriesByType('navigation')[0]
  if (!nav) return null
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]
  const scripts = performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script')

  return {
    openedAt: new Date(performance.timeOrigin).toISOString(),
    sinceLastOpenMin,
    standalone: navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
    navType: nav.type,
    protocol: nav.nextHopProtocol || null,
    // A non-zero workerStart means a service worker intercepted the page load.
    sw: { controlled: !!navigator.serviceWorker?.controller, workerStart: ms(nav.workerStart) },
    // All in ms. Phases are durations; the rest are times since navigation start.
    dnsMs: ms(nav.domainLookupEnd - nav.domainLookupStart),
    connectMs: ms(nav.connectEnd - nav.connectStart),
    requestStart: ms(nav.requestStart),
    serverMs: ms(nav.responseStart - nav.requestStart),
    ttfb: ms(nav.responseStart),
    htmlDone: ms(nav.responseEnd),
    fcp: ms(fcp?.startTime),
    domReady: ms(nav.domContentLoadedEventEnd),
    hydrated: ms(hydrated),
    load: ms(nav.loadEventEnd),
    scripts: {
      count: scripts.length,
      // transferSize 0 with a body = served from the HTTP cache.
      fromNetwork: scripts.filter(s => s.transferSize > 0).length,
      slowestMs: ms(Math.max(0, ...scripts.map(s => s.duration))),
    },
    proxy,
    page,
  }
}

export default function PerfBeacon({ page }) {
  useEffect(() => {
    if (sent) return
    sent = true

    const hydrated = performance.now()
    const proxy = readProxyTimings()

    let sinceLastOpenMin = null
    try {
      const last = Number(localStorage.getItem('perf-last-open'))
      if (last) sinceLastOpenMin = Math.round((Date.now() - last) / 60000)
      localStorage.setItem('perf-last-open', String(Date.now()))
    } catch {}

    const send = () => {
      const report = collect({ page, hydrated, sinceLastOpenMin, proxy })
      if (!report) return
      fetch('/api/vitals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      }).catch(() => {})
    }

    // loadEventEnd is only filled in after the load handlers finish, and the
    // realtime sockets connect right after hydration — wait for both.
    const later = () => setTimeout(send, 2000)
    if (document.readyState === 'complete') later()
    else window.addEventListener('load', later, { once: true })
  }, [page])

  return null
}
