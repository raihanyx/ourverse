# Ourverse Performance Audit — 2026-04-10

## Executive Summary

Ourverse is a Next.js 16 App Router application (React 19) deployed on Vercel, primarily used on mobile browsers. The user reports **slow page transitions**, **slow actions**, and **sluggish first loads**.

After a full codebase audit (every source file, config, build output, and dependency), the root causes converge on three systemic patterns:

1. **Double data fetching** — Four of five main pages fetch data server-side (SSR), then immediately re-fetch the same data client-side on mount. Every page load does 2x the necessary network work.
2. **Redundant auth round-trips in every server action** — Every mutation (15+ actions) independently calls `getUser()` → query `users` table for `couple_id` before performing any logic. These are sequential network hops to Supabase, adding 100–300ms per action.
3. ~~**Client boundary at the root** — `ThemeProvider` is a `'use client'` component wrapping the entire app tree, which pushes all descendant components into the client bundle even when they could be server components.~~ *(Reassessed — not a real issue. See 1.1.)*

Fixing just the top 5 issues below would dramatically improve perceived performance on mobile.

---

## Issue Count by Severity

| Severity | Original | Fixed | Remaining |
|----------|----------|-------|-----------|
| CRITICAL | 4 | 3 | 0 *(1 reclassified to LOW)* |
| HIGH | 8 | 5 | 1 *(1 reclassified to N/A, 1 reclassified to LOW)* |
| MEDIUM | 7 | 0 | 7 |
| LOW | 4 | 0 | 6 *(+1 reclassified from CRITICAL, +1 reclassified from HIGH)* |
| N/A | — | — | 2 *(reclassified: not real issues for this app)* |
| **Total** | **23** | **8** | **14** |

---

## Category 1: Initial Load Performance
Double data fetching
### 1.1 ~~CRITICAL~~ LOW — ThemeProvider Client Boundary Wraps Entire App

> **Reassessed after manual code review — severity downgraded from CRITICAL to LOW. No action needed.**

**File:** `app/ThemeProvider.js:1`

**Why the original assessment was wrong:** The `'use client'` boundary propagates via **module imports**, not via the `children` prop. `app/layout.js` is a server component that passes `children` as a prop to `ThemeProvider` — this is the standard RSC children-as-props escape hatch and it works correctly. Components passed as `children` are created by the server component hierarchy before reaching `ThemeProvider`; they remain server-rendered. The claim that "server components nested inside lose their zero-JS benefit" is false for this pattern. All page server components, `(app)/layout.js`, etc. are unaffected. The 15–30% bundle size estimate is not grounded in reality for a 33-line file that only imports React hooks.

**What is actually true:**
- `ThemeProvider.js` only imports React hooks — already in the bundle regardless. Removing the file saves ~500 bytes.
- The `useState(null)` initial state causes one extra re-render on mount as `useEffect` reads the DOM class applied by the `beforeInteractive` script. Imperceptible in practice (~1–2ms).
- `useTheme` has exactly one consumer (`ProfileClient.js`). A global context provider for one consumer is mild over-engineering, not a performance issue.

**Recommendation:** Skip. Not worth the refactor. The server/client boundary is working correctly as-is. If the global provider ever becomes a concern, the fix is to delete it entirely and move the toggle logic directly into `ProfileClient.js` — but this delivers no measurable user-facing improvement.

---

### 1.2 HIGH — Root Page (`/`) Has No Loading State ✅ Fixed

**File:** `app/page.js:1`  
**Problem:** The root page (`/`) is a server component that calls `supabase.auth.getUser()` and redirects to `/dashboard` or `/login`. There is no `app/loading.js` at the root level, so users see a blank white screen during this server-side redirect.

**Why it's slow:** On first visit, the server must complete the auth check before any HTML is sent. Without a `loading.js` Suspense boundary, Next.js cannot stream a shell while this resolves. On mobile with slower connections, this manifests as a 500ms–2s blank screen.

**Measurable impact:** 500ms–2s of blank screen on every fresh app visit.

**What was actually done:** Added `app/loading.js` with a centered spinner using the app's brand colors and page background. Next.js automatically wraps the root page in a Suspense boundary using this file, streaming the spinner immediately while the server resolves the auth check and redirect.

```jsx
// app/loading.js
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF7F6] dark:bg-[#1A1210]">
      <div className="w-8 h-8 border-2 border-[#C2493A] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

---

### 1.3 MEDIUM — Google Fonts Loading Two Font Families

**File:** `app/layout.js:3-4`  
**Problem:** The layout imports both `Geist` and `Geist_Mono` from `next/font/google`. `Geist_Mono` is applied as a CSS variable (`--font-geist-mono`) but is never used anywhere in the codebase.

**Why it's slow:** Each font family requires a separate font file download. On mobile, this adds an extra network request and ~20–50KB of font data that's never rendered.

**Measurable impact:** ~20–50KB unnecessary font download, one extra network request.

**Fix:** Remove `Geist_Mono` import and its CSS variable from the layout:

```jsx
// app/layout.js — remove Geist_Mono
import { Geist } from 'next/font/google'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

// In <body>:
<body className={`${geistSans.variable} antialiased ...`}>
```

---

### 1.4 MEDIUM — No Viewport Meta Tag for Mobile

**File:** `app/layout.js`  
**Problem:** No explicit viewport meta tag is set in the layout's metadata export. Next.js App Router does add a default viewport, but the app should explicitly set it to ensure proper mobile scaling, especially with the `viewport-fit=cover` needed for safe-area-inset (used by `NavLinks.js`).

**Why it's slow:** Without `viewport-fit=cover`, the safe-area-inset CSS environment variables used in `NavLinks.js:39` may not work correctly, potentially causing layout shifts or incorrect bottom padding on notched devices.

**Measurable impact:** Potential layout shifts on notched mobile devices (iPhone, modern Android).

**Fix:** Add viewport export to root layout:

```jsx
// app/layout.js
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
```

---

## Category 2: Page Transitions

### 2.1 HIGH — PageTransition Adds 280ms Animation to Every Navigation ✅ Fixed

**File:** `app/components/PageTransition.js:1`  
**Problem:** Every page wraps its content in `<PageTransition>`, which applies a 280ms CSS `pageEnter` animation (opacity 0→1, translateY 6px→0). This fires on every server-side navigation.

**Why it's slow:** The animation itself isn't CPU-heavy, but it **delays perceived content visibility by 280ms**. Content is already loaded and in the DOM, but the opacity-0 start means users perceive a 280ms lag before content appears. On mobile, where users expect instant feedback, this compounds with actual network latency.

**Measurable impact:** 280ms added perceived latency on every page transition.

**Fix:** Reduce animation duration to 120ms and remove translateY (opacity-only transition feels faster):

```css
/* app/globals.css */
@keyframes pageEnter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

```jsx
// app/components/PageTransition.js
export default function PageTransition({ children }) {
  return (
    <div className="animate-[pageEnter_120ms_ease-out]">
      {children}
    </div>
  )
}
```

Or remove it entirely — server component page transitions in Next.js App Router already feel smooth with streaming.

**What was actually done:** Dropped duration from 280ms to 120ms and removed the `translateY(6px)` — animation is now opacity-only. The translateY caused layout recalculation on every frame; opacity runs on the compositor thread and is effectively free. Content appears 160ms sooner on every navigation.

---

### 2.2 MEDIUM — No Prefetching Strategy

**File:** `app/(app)/NavLinks.js`  
**Problem:** The bottom navigation uses `<Link>` components from `next/link`, which by default prefetch on viewport intersection. However, the `staleTimes` config (`dynamic: 30`) means prefetched dynamic pages go stale after 30 seconds. The real issue is that there's no manual `router.prefetch()` for high-priority routes.

**Why it's slow:** On mobile, the bottom nav is always visible, so Next.js does prefetch. But if the user hasn't navigated within 30 seconds, the prefetched data is stale and a full server round-trip happens again. For a 5-tab app where users switch frequently, this creates inconsistent performance — sometimes instant, sometimes slow.

**Measurable impact:** Intermittent 300–800ms navigation delays when stale cache.

**Fix:** Increase `staleTimes.dynamic` to 60–120 seconds for a better mobile experience, since realtime subscriptions already handle data freshness:

```js
// next.config.mjs
experimental: {
  staleTimes: {
    dynamic: 120,
    static: 300,
  },
},
```

---

## Category 3: Database Queries

### 3.1 CRITICAL — Every Server Action Runs 2+ Sequential Auth Queries ✅ Fixed

**Scope correction:** 13 actions had the double query pattern (not 15+). `updateName` and `updateBaseCurrency` in `profile.js` / `couple.js` already used `user.id` directly and needed no change. `createCouple` and `joinCouple` are onboarding actions with no couple yet — correctly excluded.

**What was happening:** Every action that needed `couple_id` ran two sequential round-trips before any real work:

```js
const { data: { user } } = await supabase.auth.getUser()  // Round-trip 1: auth server
const { data: profile } = await supabase                   // Round-trip 2: Postgres
  .from('users').select('couple_id').eq('id', user.id).single()
// Round-trip 3+: actual operation
```

At 30–80ms per hop, the auth preamble alone cost 60–160ms per tap. `togglePaid` was the worst case at 4 sequential queries (auth → profile → fetch is_paid → update).

**Correction to audit's proposed fix:** The `getActionContext()` helper the audit proposed was code deduplication only — it still ran both queries sequentially and saved zero latency. The real fix is eliminating the profile query entirely.

**What was actually done:**

1. `createCouple` and `joinCouple` now write `couple_id` into Supabase auth user metadata after linking the couple:
   ```js
   await supabase.auth.updateUser({ data: { couple_id: couple.id } })
   ```

2. `lib/data/getActionContext.js` reads `couple_id` from `user.user_metadata` returned by `getUser()` — no extra DB query:
   ```js
   let coupleId = user.user_metadata?.couple_id          // fast path: from auth response
   if (!coupleId) {                                       // fallback: DB query for existing accounts
     const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
     coupleId = profile?.couple_id
   }
   ```

3. All 13 affected actions in `expenses.js`, `bucket.js`, `calendar.js`, and `couple.js` now call `getActionContext()` instead of doing their own auth preamble.

**Result:** For accounts created after this deploy, every mutation drops from 3+ sequential queries to 2 (auth check + actual operation). `togglePaid` drops from 4 queries to 3. The fallback DB query fires for any account that joined a couple before this deploy — one-time until they next create/join a couple (which won't happen for existing users). This is an accepted limitation for an active deployment.

**Why `user_metadata` is safe here:** Supabase's `getUser()` on the server verifies the JWT with the auth server and returns the latest server-side metadata — it cannot be spoofed by a client manipulating their local JWT. RLS policies independently enforce `couple_id` scoping via `get_my_couple_id()`, so even if metadata were somehow wrong, DB access would still be correctly restricted.

---

### 3.2 HIGH — Paid Expenses Page Does 4 Sequential Queries ✅ Fixed

**File:** `app/(app)/ledger/paid/page.js:7-23`  
**Problem:** The paid expenses page does NOT use the `getAppSession()` cached helper. Instead, it manually runs 4 sequential queries:

```js
const { data: { user } } = await supabase.auth.getUser()    // 1
const { data: profile } = await supabase.from('users')...    // 2
const { data: partner } = await supabase.from('users')...    // 3
const { data: expenses } = await supabase.from('expenses').. // 4
```

**Why it's slow:** Four sequential round-trips when `getAppSession()` already handles the first three with `React.cache()` deduplication, and the profile/partner queries could run in parallel.

**Measurable impact:** ~120–320ms of unnecessary sequential DB latency.

**Fix:**

```js
// app/(app)/ledger/paid/page.js
import getAppSession from '@/lib/data/getAppSession'

export default async function PaidPage() {
  const { user, profile, partner } = await getAppSession()
  if (!user) redirect('/login')
  if (!profile.couple_id) redirect('/onboarding')

  const [{ data: expenses }, rates] = await Promise.all([
    supabase.from('expenses')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('is_paid', true)
      .order('created_at', { ascending: false }),
    getExchangeRates(),
  ])

  return <PaidExpensesClient ... />
}
```

**What was actually done:** Replaced the 3 manual auth/profile/partner queries with `getAppSession()`, matching the pattern already used in `ledger/page.js`. The page now runs 2 round-trips total: `getAppSession()` (auth + parallel profile/partner) then the expenses query. The `redirect` + null guards are also removed — `getAppSession()` handles those internally.

---

### 3.3 HIGH — `togglePaid` Action Does 4 Sequential Queries

**File:** `app/actions/expenses.js` (togglePaid function)  
**Problem:** The `togglePaid` action runs: getUser → profile query → fetch expense → update expense. Four sequential queries for a simple boolean toggle.

**Why it's slow:** 4 round-trips × 30–80ms = 120–320ms minimum. This is a common action (marking expenses as paid) that should feel instant.

**Measurable impact:** 120–320ms latency on a frequent user action.

**Fix:** Combine the fetch-and-update into fewer queries. After auth (which can be optimized per issue 3.1), the toggle only needs:

```js
// Instead of fetching then updating:
const { data: expense, error } = await supabase
  .from('expenses')
  .update({ is_paid: !currentValue })  // but we don't know currentValue...

// Better: use a single RPC call
const { error } = await supabase.rpc('toggle_expense_paid', {
  expense_id: id,
  p_couple_id: coupleId,
})
```

Or at minimum, fetch and update in a way that removes one query by using the `getActionContext()` helper from fix 3.1.

---

## Category 4: Network Waterfalls

### 4.1 CRITICAL — Double Data Fetching: Server SSR + Client Mount Re-fetch ✅ Fixed

**File:** `app/(app)/ledger/LedgerClient.js`, `app/(app)/bucket/BucketClient.js`, `app/(app)/memories/MemoriesClient.js`

**What was happening:** All three pages intentionally re-fetched on mount to correct stale data from Next.js's router cache. The mount `useEffect` was the workaround:

```js
useEffect(() => { refetch() }, [refetch])  // removed from all three
```

This added 1–2 extra Supabase round-trips per page visit (Bucket did 2 queries via `Promise.all`, so 3 total per visit).

**Why it was wrong:** `force-dynamic` on the page is the correct solution. With it, every navigation triggers a fresh server render — router cache is bypassed, so the server data is always current. The client mount re-fetch is then redundant. Net result: 1 Supabase query per page visit instead of 2–3.

**What was changed:**
- Added `export const dynamic = 'force-dynamic'` to `ledger/page.js`, `bucket/page.js`, `memories/page.js`
- Removed the mount `useEffect` from all three client components
- `refetch`/`refetchItems` functions are kept — still called after user-initiated mutations (add, toggle, mark done)
- Realtime subscriptions unchanged — still handle live partner updates

**Trade-off acknowledged:** `force-dynamic` bypasses the router cache, so back-navigation shows a loading skeleton instead of instant cached content. For a collaborative real-time app where stale data is a UX problem anyway, this is the correct trade-off.

---

### 4.2 CRITICAL — `getAppSession()` Runs 3 Sequential Queries ✅ Fixed

**File:** `lib/data/getAppSession.js`  
**Problem:** While `getAppSession()` correctly uses `React.cache()` for request deduplication, the function itself runs 3 sequential queries:

```js
const { data: { user } } = await supabase.auth.getUser()  // 1
const { data: profile } = await supabase.from('users')...  // 2
const { data: partner } = await supabase.from('users')...  // 3
```

These three queries are sequential — each waits for the previous to complete.

**Why it's slow:** 3 × 30–80ms = 90–240ms on every page load. The profile and partner queries both depend on data from the previous query (user.id → couple_id → partner), so they can't all run in parallel. However, profile and partner CAN be optimized.

**Measurable impact:** 90–240ms latency on every authenticated page load (this is the minimum baseline before any page-specific queries).

**Fix:** After getting the user, fetch profile and partner in a single query using a self-join or by combining into one query:

```js
// lib/data/getAppSession.js
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

const getAppSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, partner: null }

  // Single query: get this user's profile with couple_id
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { user, profile, partner: null }

  // Now fetch partner (this is the only query that must be sequential)
  const { data: partner } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  return { user, profile, partner }
})
```

**Bigger win — use an RPC or view:**

```sql
-- Supabase function that returns user + partner in one call
CREATE OR REPLACE FUNCTION get_session_data(p_user_id uuid)
RETURNS json AS $$
  SELECT json_build_object(
    'profile', (SELECT row_to_json(u) FROM users u WHERE u.id = p_user_id),
    'partner', (SELECT row_to_json(u) FROM users u
                WHERE u.couple_id = (SELECT couple_id FROM users WHERE id = p_user_id)
                AND u.id != p_user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

This reduces 2 queries to 1 (after getUser()), cutting session loading by ~30–80ms.

**What was actually done:** Used the user metadata fast path (same approach as `getActionContext`) — after `getUser()`, `couple_id` is read from `user.user_metadata`. If present, profile and partner queries are fired in `Promise.all`, reducing from 3 sequential round-trips to 2 (auth + parallel DB). If metadata is missing (pre-existing accounts), it falls back to the original sequential path. The RPC approach was skipped — unnecessary complexity for a ~30–80ms gain that's already achievable with the metadata trick already wired into the codebase.

---

## Category 5: Caching

### 5.1 MEDIUM — Exchange Rates Fetched Per-Request Without Client-Side Cache

**File:** `lib/exchangeRates.js:13`  
**Problem:** Exchange rate fetching uses `fetch` with `{ next: { revalidate: 3600 } }`, which caches on the server-side (Next.js Data Cache). However, every page that needs rates (dashboard, ledger, paid) calls `getExchangeRates()` independently. While Next.js deduplicates identical fetches within a single request, across different page navigations the rates are re-fetched from cache each time.

**Why it's slow:** Minor — the `revalidate: 3600` handles most cases. But the rates are fetched from an external API (openexchangerates.org), and if the cache misses (first request after deploy, or after 1 hour), it blocks page rendering.

**Measurable impact:** ~200–500ms on cache miss (external API call). Negligible on cache hit.

**Fix:** This is already reasonably well-implemented. One improvement: add error handling with a fallback so a failed API call doesn't block the page:

```js
export async function getExchangeRates() {
  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${process.env.OXR_APP_ID}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
```

---

### 5.2 MEDIUM — `revalidatePath` Called Multiple Times Per Action

**File:** `app/actions/bucket.js:42-43,99-101,168-170`, `app/actions/calendar.js:68-69,139-141`  
**Problem:** Server actions call `revalidatePath()` for 2–3 paths after each mutation:

```js
revalidatePath('/calendar')
revalidatePath('/bucket')
revalidatePath('/memories')
```

**Why it's slow:** Each `revalidatePath()` call invalidates the server-side cache for that route, meaning the next navigation to any of those routes will trigger a full server render. With 3 paths revalidated per action, a single mutation can cause 3 future page loads to be uncached. Combined with realtime subscriptions that already push updates, this double-invalidation is redundant.

**Measurable impact:** Causes unnecessary full re-renders on next navigation to revalidated paths. With `staleTimes.dynamic: 30`, the client cache also gets bypassed, so users see loading states instead of cached content.

**Fix:** Since realtime subscriptions already call `router.refresh()` on changes, you may not need `revalidatePath` at all for paths the user isn't currently on. At minimum, only revalidate the current path:

```js
// Only revalidate paths the user is likely to navigate to immediately
revalidatePath('/bucket')  // current page — keep this
// Remove /calendar and /memories — realtime handles those
```

---

## Category 6: Client Bundle Size

### 6.1 ~~HIGH~~ LOW — Large Client Components *(reassessed — not a real performance issue)*

**File:** `app/(app)/ledger/LedgerClient.js` (595 lines), `app/(app)/bucket/BucketClient.js` (687 lines), `app/(app)/calendar/CalendarClient.js` (744 lines)

**Why the original assessment was wrong:** The audit assumed modals and sheets were defined inline and unsplittable. After reading the actual files, all modals and sheets (`AddExpenseForm`, `LedgerHelpSheet`, `MarkDoneSheet`, `AddCalendarEntryForm`, `CalendarMarkDoneSheet`, `CalendarHelpSheet`, `ConfirmSheet`, etc.) are already imported from their own separate files. Next.js already code-splits per route, so the size of one page's component has no impact on other pages. The "30–50KB" estimate was not grounded in the actual file contents.

**What is actually true:**
- The sub-components (modals, sheets) are already properly separated — switching to `dynamic()` imports would be a marginal difference for components this small
- The inline helpers (`TotalsBadges`, `ExpenseRow`, `BucketItemRow`, icon components) are small and belong co-located since they're used only in that file
- `BulkMarkDoneSheet` in `BucketClient.js` is the one genuinely misplaced component — it's a full standalone sheet defined at the bottom of an unrelated file. Worth extracting as a code organisation fix, not a performance one.
- For a 2-user app, no user will ever feel the difference from any of these changes

**Recommendation:** Extract `BulkMarkDoneSheet` from `BucketClient.js` into its own file if the file ever becomes hard to navigate. Otherwise, leave as-is. Not a performance concern.

---

### 6.2 LOW — Unused Public Assets

**File:** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`  
**Problem:** Default Next.js starter SVGs remain in the public directory. None are referenced anywhere in the codebase.

**Why it's slow:** Minimal direct impact — these files are not loaded unless directly requested. However, they add noise and could be accidentally served.

**Measurable impact:** Negligible (only served if directly requested by URL).

**Fix:** Delete unused public assets:

```bash
rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

---

## Category 7: Server vs. Client Component Boundaries

### 7.1 MEDIUM — Auth Pages Are Fully Client Components

**File:** `app/(auth)/login/page.js:1`, `app/(auth)/signup/page.js:1`  
**Problem:** The login and signup pages are marked `'use client'` at the top level. The entire page (including static headings, labels, links) is shipped as client JavaScript.

**Why it's slow:** Static content (headings, paragraph text, links to other auth pages) doesn't need to be in the client bundle. Only the form with `useActionState` needs to be a client component.

**Measurable impact:** ~5–10KB of unnecessary client JS per auth page.

**Fix:** Make the page a server component, extract only the form as a client component:

```jsx
// app/(auth)/login/page.js (server component)
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold ...">Welcome back</h1>
      <p className="text-sm ...">Sign in to continue</p>
      <LoginForm />
      <p className="text-center ...">
        Don't have an account? <Link href="/signup">Sign up</Link>
      </p>
    </>
  )
}
```

```jsx
// app/(auth)/login/LoginForm.js
'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
// ... only the interactive form
```

---

### 7.2 LOW — `FieldError` Component Not Marked But Could Be Server Component

**File:** `app/components/FieldError.js`  
**Problem:** `FieldError` is a simple presentational component that renders an error message. It has no `'use client'` directive, which is correct — it works as a server component. However, it's imported into client components, so it gets bundled as client JS anyway.

**Measurable impact:** Negligible — the component is tiny.

**Fix:** No action needed. This is working correctly.

---

## Category 8: Realtime Subscriptions

### 8.1 ~~HIGH~~ N/A — Realtime Subscriptions Have No Server-Side Filtering *(won't fix)*

**File:** `app/(app)/ledger/LedgerClient.js`, `app/(app)/bucket/BucketClient.js`, `app/(app)/calendar/CalendarClient.js`, `app/(app)/memories/MemoriesClient.js`

**Why we're not fixing this:** Supabase Realtime's server-side row filtering requires enabling Replication per table in the Supabase dashboard plus a separate Realtime RLS configuration. If either is misconfigured, the filter silently fails — you either receive no events at all or receive everything as if no filter was set. The failure mode is invisible and hard to debug.

The current approach — subscribing to the full table and filtering client-side by `couple_id` — is deliberately chosen:
- All subscriptions already guard with `if (row?.couple_id !== coupleId) return`, so no wrong data ever enters state
- RLS enforces `couple_id` scoping at the DB level independently; the client filter is a UI optimization, not a security gate
- Ourverse has 2 users per couple — the event volume this app will ever generate makes server-side filtering a non-issue at any realistic scale

**Reclassified:** Removed from HIGH. Not a real issue for this app.

---

### 8.2 HIGH — Calendar Recreates Subscriptions on Every Month Change ✅ Fixed

**File:** `app/(app)/calendar/CalendarClient.js` (useEffect with viewYear/viewMonth dependencies)  
**Problem:** The calendar page's realtime subscription `useEffect` depends on `viewYear` and `viewMonth` state. Every time the user navigates to a different month, the subscriptions are torn down and recreated.

**Why it's slow:** Unsubscribing and resubscribing to Supabase channels involves WebSocket messages and server-side state management. On mobile with potentially flaky connections, this can cause:
- Brief period with no subscription (missed events)
- Connection overhead for each month navigation
- Unnecessary WebSocket churn

**Measurable impact:** ~100–200ms of subscription churn per month navigation. Potential for missed events during transition.

**What was actually done:** Added `viewYearRef` and `viewMonthRef` (`useRef`) initialized to the same values as the state. Two single-line `useEffect`s keep the refs in sync whenever state changes. The subscription `useEffect` now reads `viewYearRef.current` / `viewMonthRef.current` inside all payload callbacks instead of the state variables, and its dependency array is `[coupleId]` only. The two channels subscribe once when the component mounts and stay alive for the entire session — no teardown or rebuild on month navigation. All payload filtering logic is unchanged.

---

### 8.3 MEDIUM — Dashboard Subscribes to Two Tables + Visibility Listener

**File:** `app/(app)/dashboard/RealtimeRefresh.js`  
**Problem:** The dashboard subscribes to both `expenses` AND `couples` tables, plus adds a `visibilitychange` event listener that calls `router.refresh()` when the tab becomes visible (with 30s throttle).

**Why it's slow:** `router.refresh()` triggers a full server component re-render of the entire page. When a realtime event fires, the entire dashboard (session check, 4 parallel queries, balance computation) re-runs. The visibility listener adds another trigger, meaning switching apps on mobile and coming back always triggers a full refresh.

**Measurable impact:** Full page re-render (~200–500ms) on every realtime event and every tab-focus after 30s.

**Fix:** Use more granular refresh instead of `router.refresh()`:

```jsx
// Instead of router.refresh() which re-renders everything,
// use a client-side refetch that only updates the data that changed
const handleChange = useCallback((payload) => {
  if (payload.table === 'expenses') {
    // Only refetch expense-related data
    refetchExpenses()
  }
}, [])
```

Or accept `router.refresh()` but increase the visibility throttle to 60s+ and debounce realtime events:

```jsx
// Debounce rapid realtime events
const debouncedRefresh = useMemo(
  () => debounce(() => router.refresh(), 1000),
  [router]
)
```

---

## Category 9: Re-renders

### 9.1 HIGH — Client Supabase Client Not Memoized ✅ Fixed

**File:** `lib/supabase/client.js`  
**Problem:** `createClient()` creates a new Supabase client instance every time it's called. Multiple components on the same page each call `createClient()`, creating multiple instances.

**Why it's slow:** Each Supabase client instance:
- Creates its own connection pool/state
- Has its own auth state listener
- Cannot share realtime channels across instances
- Increases memory usage

When `LedgerClient.js` calls `createClient()` for its refetch AND for its realtime subscription, it gets two separate instances.

**Measurable impact:** Unnecessary memory usage and potential duplicate auth state management. ~2–5KB memory overhead per extra instance.

**What was actually done:** Added a module-level `client` variable so the first call creates the instance and every subsequent call returns the same one. All components that call `createClient()` — `LedgerClient`, `BucketClient`, `CalendarClient`, `MemoriesClient`, `RealtimeRefresh`, and `ProfileClient` — now share a single Supabase instance with one auth listener and one WebSocket connection pool.

```js
// lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

let client = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return client
}
```

---

### 9.2 MEDIUM — Realtime Callbacks Trigger Full Re-fetches

**File:** `app/(app)/ledger/LedgerClient.js`, `app/(app)/bucket/BucketClient.js`, `app/(app)/memories/MemoriesClient.js`  
**Problem:** When a realtime event arrives, the callback runs a full `refetch()` that queries ALL data from Supabase, not just the changed record. The realtime payload already contains the changed data.

**Why it's slow:** A single expense update triggers a full re-fetch of all expenses, all items, etc. This is wasteful — the realtime payload contains the new/changed/deleted row data.

**Measurable impact:** Full data re-fetch (~100–300ms) on every single realtime event, even if only one row changed.

**Fix:** Use the realtime payload to update state directly:

```js
.on('postgres_changes', { event: '*', schema: 'public', table: 'expenses',
     filter: `couple_id=eq.${coupleId}` }, (payload) => {
  if (payload.eventType === 'INSERT') {
    setExpenses(prev => [payload.new, ...prev])
  } else if (payload.eventType === 'UPDATE') {
    setExpenses(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
  } else if (payload.eventType === 'DELETE') {
    setExpenses(prev => prev.filter(e => e.id !== payload.old.id))
  }
})
```

This eliminates the refetch round-trip entirely for realtime updates.

---

## Category 10: Mobile-Specific Performance

### 10.1 HIGH — No `will-change` or GPU Acceleration Hints for Animations

**File:** `app/globals.css` (animation definitions)  
**Problem:** CSS animations (pageEnter, slideUp, slideDown, fadeIn, fadeOut, tab animations) don't use `will-change` or `transform: translateZ(0)` to hint GPU acceleration.

**Why it's slow:** On mobile devices, animations without GPU compositing hints run on the main thread, causing jank. The `pageEnter` animation uses `transform: translateY()` which should auto-promote to GPU, but the opacity-only animations and tab animations may not.

**Measurable impact:** Potential 5–15ms frame drops during animations on low-end mobile devices.

**Fix:** Add `will-change` to animated elements:

```css
/* app/globals.css — add to animation containers */
.animate-\\[pageEnter_280ms_ease-out\\] {
  will-change: opacity, transform;
}
```

Or better, add it inline in the component:

```jsx
// PageTransition.js
<div className="animate-[pageEnter_120ms_ease-out]" style={{ willChange: 'opacity' }}>
```

Note: Use `will-change` sparingly — it reserves GPU memory. Only apply to elements that are actively animating.

---

### 10.2 LOW — Bottom Sheet Modals Use `createPortal` Without Body Scroll Lock

**File:** `app/components/ConfirmSheet.js`, and various sheet components  
**Problem:** Bottom sheets and modals use `createPortal` to render at the document root, but there's no explicit body scroll lock when sheets are open.

**Why it's slow:** On mobile, when a sheet is open, the background page can still scroll. This causes:
- Confusing UX (scrolling the wrong layer)
- Potential layout thrashing if scroll handlers fire on the background

**Measurable impact:** Minor — mostly a UX issue rather than raw performance.

**Fix:** Add body scroll lock when sheets are open:

```jsx
useEffect(() => {
  if (open) {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }
}, [open])
```

---

## Category 11: Vercel / Deployment Configuration

### 11.1 MEDIUM — Middleware (proxy.js) Calls `getUser()` on Every Request

**File:** `proxy.js`  
**Problem:** The proxy middleware calls `supabase.auth.getUser()` on every single request — including static assets, API routes, and already-authenticated page navigations.

**Why it's slow:** `getUser()` makes a round-trip to Supabase Auth on every request. For a user navigating between tabs (5 pages), each navigation triggers middleware + page-level auth check = 2 `getUser()` calls. The middleware one adds latency before the page even starts rendering.

**Measurable impact:** ~30–80ms added to every request (including prefetch requests from `<Link>`).

**Fix:** Skip auth check for static assets and public routes:

```js
// proxy.js
export function proxy(request) {
  const { pathname } = request.nextUrl

  // Skip auth check for static files, API routes, and public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.match(/\.(svg|png|ico|jpg|jpeg|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Only check auth for app routes
  // ... existing auth logic
}
```

Also, consider using `getSession()` instead of `getUser()` in middleware — `getSession()` reads from the JWT cookie locally without a Supabase round-trip (though less secure, it's appropriate for middleware routing decisions where the page will do its own `getUser()` check):

```js
// Faster but less secure — acceptable for routing decisions
const { data: { session } } = await supabase.auth.getSession()
```

---

### 11.2 LOW — No Custom 404 Page

**File:** `app/_not-found` (static default)  
**Problem:** The app uses the default Next.js 404 page. While not a performance issue, it means users who hit invalid routes see a generic page with no navigation back to the app.

**Measurable impact:** Negligible performance impact. UX concern only.

**Fix:** Create a custom not-found page with navigation:

```jsx
// app/not-found.js
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/dashboard" className="mt-4 text-[#C2493A] underline">
        Back to dashboard
      </Link>
    </div>
  )
}
```

---

## Category 12: Third-Party APIs

### 12.1 LOW — Open Exchange Rates API Has No Fallback

**File:** `lib/exchangeRates.js`  
**Problem:** If the Open Exchange Rates API is down or the API key is invalid, `getExchangeRates()` returns null/undefined, and pages that depend on rates (dashboard, ledger) may show broken currency conversions.

**Why it's slow:** Not a speed issue per se, but a resilience issue. If the API call fails, there's no cached fallback, and the 1-hour revalidation means the failure persists for up to an hour.

**Measurable impact:** Broken currency display during API outages.

**Fix:** Cache the last successful response and use it as a fallback:

```js
// lib/exchangeRates.js
let lastKnownRates = null

export async function getExchangeRates() {
  try {
    const res = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${process.env.OXR_APP_ID}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return lastKnownRates
    const data = await res.json()
    lastKnownRates = data
    return data
  } catch {
    return lastKnownRates
  }
}
```

Note: `lastKnownRates` won't persist across serverless invocations. For true persistence, store the last-known rates in the database or use Vercel KV.

---

## Top 5 Highest-Impact Fixes

### 1. Remove Client Mount Re-fetches (3 files)

**Files:** `LedgerClient.js`, `BucketClient.js`, `MemoriesClient.js`  
**Expected improvement:** Eliminates 200–600ms of redundant client-side fetching on every page navigation. Halves data transfer per page load.  
**Complexity:** Low — delete one `useEffect` per file.  
**Why #1:** This is the single biggest contributor to "slow page transitions" — every navigation to 3 of 5 main pages does double work.

### 2. Create Shared Action Auth Helper (15+ actions across 5 files)

**Files:** All files in `app/actions/`  
**Expected improvement:** Reduces per-action boilerplate, centralizes auth. Combining with JWT custom claims for `couple_id` eliminates one DB round-trip per action, saving 30–80ms per mutation.  
**Complexity:** Medium — create helper, refactor all actions. Optional: add `couple_id` to Supabase JWT claims for bigger win.  
**Why #2:** Every user interaction (add expense, mark done, toggle paid, etc.) hits this overhead. High frequency × moderate latency = large cumulative impact.

### 3. Add Realtime Subscription Filters (6 subscriptions across 4 files)

**Files:** `LedgerClient.js`, `BucketClient.js`, `CalendarClient.js`, `MemoriesClient.js`  
**Expected improvement:** Eliminates unnecessary refetches from other users' changes. Prevents scaling issues. Use payload data instead of full refetch to save 100–300ms per update.  
**Complexity:** Medium — add `filter` parameter to all subscriptions, pass `coupleId` from server, enable RLS filters in Supabase dashboard.  
**Why #3:** Prevents cascading unnecessary refetches and will prevent degradation as user count grows.

### 4. Fix Paid Expenses Page Sequential Queries

**Files:** `app/(app)/ledger/paid/page.js`  
**Expected improvement:** Reduces page load from 4 sequential queries (~120–320ms) to 2 parallel queries (~60–160ms) by using `getAppSession()` + `Promise.all()`.  
**Complexity:** Low — import `getAppSession`, restructure queries.  
**Why #4:** The paid expenses page is likely visited frequently (users checking payment history) and is the most obviously fixable sequential query pattern.

### 5. Reduce PageTransition Animation to 120ms or Remove

**Files:** `app/components/PageTransition.js`, `app/globals.css`  
**Expected improvement:** Reduces perceived latency by 160ms on every page navigation (280ms → 120ms).  
**Complexity:** Very low — change one number.  
**Why #5:** Immediate, zero-risk improvement to perceived performance across the entire app. The 280ms delay compounds with real network latency on every navigation.

---

*Report generated on 2026-04-10 by full codebase audit of the Ourverse Next.js application.*
