import LedgerClient from './LedgerClient'
import PageTransition from '@/app/components/PageTransition'

export const metadata = {
  title: 'Ledger | Ourverse',
}

// Static on purpose, like /dashboard: no cookies(), no auth, no data here.
// Next prefetches a static page in full, so tapping the Ledger tab switches
// instantly even while the server is cold. LedgerClient shows the device
// snapshot immediately and loads fresh data from the browser. proxy.js skips
// /ledger (but not /ledger/paid, which is still server-rendered).
// See docs/audits/launch-performance-2026-10-28.md (§3.3).
export default function LedgerPage() {
  return (
    <PageTransition>
      <LedgerClient />
    </PageTransition>
  )
}
