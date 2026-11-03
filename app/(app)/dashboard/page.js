import DashboardClient from './DashboardClient'

export const metadata = {
  title: 'Dashboard | Ourverse',
}

// Static on purpose: this is the PWA launch screen. No cookies(), no auth, no
// data here — anything dynamic would put a Vercel function (and its cold
// start) back in front of the first paint. DashboardClient shows the device
// snapshot instantly and loads fresh data from the browser. See
// docs/audits/launch-performance-2026-10-28.md (fix #7).
export default function DashboardPage() {
  return <DashboardClient />
}
