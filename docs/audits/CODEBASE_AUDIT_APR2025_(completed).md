# Ourverse Codebase Report

---

## 1. ARCHITECTURE OVERVIEW

**Structure:** Standard Next.js App Router layout. Route groups `(app)` and `(auth)` cleanly separate protected from public routes. The `(app)/layout.js` calls `getAppSession()` which is the single auth gate for all protected pages — clean.

**Data flow:**
- Server components fetch data and pass it as props to client components (`initialExpenses`, `initialItems`, etc.)
- Client components hydrate from those props, then immediately refetch on mount to correct any stale server cache (`refetch()` in `useEffect`)
- Realtime patches the live state after that

**Supabase usage:**
- Auth: `createServerClient` in proxy + server components, `createBrowserClient` for client-side
- DB: Used directly from both server (via `lib/supabase/server.js`) and client (via `lib/supabase/client.js`)
- Realtime: All major client components subscribe to `postgres_changes` on their relevant tables
- No Supabase Storage used

**Notable patterns:**
- `getAppSession()` uses React `cache()` — correctly deduplicates the user/profile fetch across parallel server component renders in a single request
- All bulk operations use optimistic UI (immediate local state update, async server sync)
- Dashboard uses `router.refresh()` for realtime (server component pattern); other pages manage client state directly

---

## 2. BUGS & BROKEN THINGS

### 🔴 Critical

~~**B1. `saveAnniversaryDate` has zero authentication** — `couple.js:99`~~
✅ **Fixed.** `saveAnniversaryDate` now calls `getUser()` and looks up `couple_id` from the user's own profile server-side. The client-supplied `coupleId` parameter is ignored entirely.

~~**B2. `addBucketItem` trusts `couple_id` and `added_by_user_id` from form data** — `bucket.js:18-19`~~
✅ **Fixed.** `addBucketItem` now ignores those hidden inputs and derives both `couple_id` (from profile lookup) and `added_by_user_id` (from `user.id`) server-side. `markAsDone` no longer trusts `couple_id`, `name`, or `category` from form data — `couple_id` is looked up from the user's profile, and `name`/`category` are fetched from the DB with an ownership filter before being written to memories. `bulkMarkDone` also had the same `coupleId`-from-caller issue and is fixed the same way.

~~**B3. `proxy.js` `isAppRoute` is incomplete** — `proxy.js:35-37`~~
✅ **Fixed.** `isAppRoute` now includes `/bucket`, `/calendar`, `/memories`, `/profile`, and `/onboarding`. All protected routes are covered at the proxy level.

~~**B4. N+1 queries in `bulkUndoDone`** — `bucket.js:152-164`~~
✅ **Fixed.** Replaced the serial loop with one batched `.select().in()` to fetch all relevant calendar entries, then `Promise.all()` for the updates. Down from 2N serial round trips to 1 read + N parallel writes. (Each entry has its own `original_date` so the writes can't be collapsed further into a single query.)

### 🟡 Medium

~~**B5. `addExpense` doesn't `revalidatePath('/ledger')`** — `expenses.js:61-62`~~
✅ **Fixed.** `addExpense` now calls `revalidatePath('/ledger')` in addition to `revalidatePath('/dashboard')`.

~~**B6. Missing `revalidatePath` in `addBucketItem` and `markAsDone`** — `bucket.js:32-34` and `bucket.js:77`~~
✅ **Fixed.** `addBucketItem` now calls `revalidatePath('/bucket')`. `markAsDone` now calls `revalidatePath('/bucket')` and `revalidatePath('/memories')`.

~~**B8. Stale `viewMonth` read inside `setViewYear` callback** — `CalendarClient.js:179, 191`~~
✅ **Fixed.** `prevMonth` and `nextMonth` now compute `newY`/`newM` directly from the closure values without using a functional updater. `viewYear` and `viewMonth` are both read from the closure at call time, which is correct and safe.

~~**B9. `useEffect` missing `onSuccess` in dependency array** — `AddExpenseForm.js:60`~~
✅ **Fixed.** `onSuccess` added to the `useEffect` dependency array.

### 🟢 Low

~~**B10. Currency options hardcoded in `AddExpenseForm`** — `AddExpenseForm.js:114-119`~~
✅ **Fixed.** Currency `<select>` now maps over `SUPPORTED_CURRENCIES` from `lib/currency.js`. Adding a currency to the constant will automatically appear in the dropdown.

~~**B11. After deleting a calendar entry, `selectedDate` panel shows empty state** — `CalendarClient.js:287-293`~~
✅ **Fixed.** `handleDelete` now reads `dateMap[selectedDate]` before the state update. If the deleted entry was the only item on that day (no other entries, no memories), `setSelectedDate(null)` is called and the panel closes.

---

## 3. PERFORMANCE ISSUES

### 🟡 Medium

**P1. Double-fetch on every page load (mount refetch pattern) — intentional, leave as-is**
Every major client component (`LedgerClient:166`, `BucketClient:137`, `MemoriesClient:46`) calls `refetch()` on mount:
```js
useEffect(() => { refetch() }, [refetch])
```
This fires 2 DB queries per navigation: one server-side (SSR) + one client-side (refetch). The refetch exists because `staleTimes: { dynamic: 30 }` in `next.config.mjs` lets Next.js serve a cached server render on back-navigation — meaning `initialExpenses` could be up to 30 seconds stale without it.

Two alternatives were evaluated and rejected:
- **Disable router cache (`staleTimes: { dynamic: 0 }`) + remove refetch** — eliminates the double-fetch but makes every navigation hit the server, losing the instant back-navigation feel.
- **Remove refetch only** — keeps back-navigation fast but risks showing stale data for up to 30 seconds, which is unacceptable for a finance-tracking app.

The current pattern is the correct tradeoff: instant page appearance from cache + always-fresh data after mount + realtime keeps it live from there. The extra DB query is negligible for a 2-user app.

**P2. Realtime subscriptions recreated on every month change — intentional, leave as-is** — `CalendarClient.js:245`
```js
}, [coupleId, viewYear, viewMonth])
```
Every month navigation tears down and rebuilds 2 Supabase realtime channels. `viewYear`/`viewMonth` are in the dependency array because the INSERT event handlers use them to filter events to the current month — without them, the handlers would be stale closures always filtering against the initial month.

The fix would be moving those values into refs so the subscription only depends on `coupleId`. The improvement is real but negligible: the ~100-500ms reconnect window is already self-healing because month navigation also calls `refetchMonthData()`, which fetches all entries and memories for the new month fresh from the DB. Any event missed during reconnect is covered by the refetch. For a 2-person app, the added ref complexity doesn't justify the gain.

**P3. `getAppSession` queries — not an issue**
```js
// lib/data/getAppSession.js
const { data: { user } } = await supabase.auth.getUser()  // auth round-trip
const { data: profile } = await supabase.from('users')...  // DB query
const { data: partner } = await supabase.from('users')...  // DB query
```
Wrapped in `React.cache()` — executes exactly once per request regardless of how many server components call it. `DashboardPage` calling `createClient()` again is cheap (no network call, just constructing an object with auth cookies). The "3 Supabase clients" observation is accurate but harmless. No action needed.

### 🟢 Low

~~**P4. `PaidExpensesClient` uses `router.refresh()` instead of local state** — `PaidExpensesClient.js:99-102`~~
✅ **Fixed.** `handleUndo` and `handleBulkUndo` now optimistically remove items from `localExpenses` immediately, matching the pattern in `LedgerClient`. The `router.refresh()` calls and the `useRouter` import are removed — `togglePaid`/`bulkSetPaid` already call `revalidatePath` server-side, so the server cache is correct without a client-driven refresh.

~~**P5. `RealtimeRefresh` triggers `router.refresh()` on every visibilitychange** — `RealtimeRefresh.js:37-43`~~
✅ **Fixed.** Added a 30-second time gate via `useRef`. Rapid tab switches no longer hammer the server — the fallback refresh only fires if at least 30 seconds have passed since the last visibility-triggered refresh. Realtime handles live updates in the interim.

---

## 4. SECURITY CONCERNS

### 🔴 Critical

~~**S1. `saveAnniversaryDate` — no auth guard** (same as B1)~~
✅ **Fixed.** See B1.

~~**S2. `addBucketItem` and `markAsDone` — server actions trust client-supplied `couple_id`** (same as B2)~~
✅ **Fixed.** See B2.

~~**S7. `addExpense` trusts `partner_id` from form data** — `expenses.js:24,37`~~
✅ **Fixed.** The hidden `partner_id` input is removed from `AddExpenseForm`. `addExpense` now looks up the real partner via `supabase.from('users').eq('couple_id', ...).neq('id', user.id)` — the client can never inject an arbitrary user ID as payer.

~~**S8. `bulkSetPaid`, `bulkDeleteExpenses`, `togglePaid` had no explicit couple ownership filter** — `expenses.js:74,86,108`~~
✅ **Fixed.** All three actions now look up `couple_id` from the authenticated user's profile and add `.eq('couple_id', profile.couple_id)` to every DB operation. A user cannot affect expenses outside their couple even if they know the expense IDs.

### 🟡 Medium

~~**S3. `markCalendarEntryDone` trusts `bucket_item_id`, `couple_id`, `name`, `category` from form data** — `calendar.js:75-99`~~
✅ **Fixed.** `markCalendarEntryDone` now looks up the calendar entry by `calendar_entry_id` + `couple_id` (from the authenticated user's profile) server-side. `bucket_item_id`, `title`, and `category` are all derived from that DB record — the client no longer supplies any of these values. Same pattern as the existing fixes in `bucket.js`.

~~**S4. Only entry creators can delete calendar entries** — `calendar.js:126-129`~~
✅ **Fixed.** `deleteCalendarEntry` now scopes the entry lookup to `couple_id` (from the authenticated user's profile), not `user_id`. Either partner can delete any couple entry. Personal entries still enforce creator-only deletion via an explicit `entry.is_personal && entry.user_id !== user.id` check.

### 🟢 Low

~~**S5. `proxy.js` incomplete route protection** (same as B3)~~
✅ **Fixed.** See B3.

**S6. Exchange rates API key correctly server-only** — `exchangeRates.js:4`
`OPEN_EXCHANGE_RATES_APP_ID` has no `NEXT_PUBLIC_` prefix. Correctly server-side only. No issue.

---

## 5. CODE QUALITY

### 🟡 Medium

**~~Q1. `CATEGORY_COLORS` object duplicated 5 times~~** ✅ Fixed
Extracted to `lib/constants.js` as `EXPENSE_CATEGORY_COLORS`/`EXPENSE_CATEGORY_LABELS` (ledger set) and `BUCKET_CATEGORY_COLORS`/`BUCKET_CATEGORY_LABELS` (bucket/calendar set). All 5 client files now import from there.

**~~Q2. `StyledSelect` component duplicated~~** ✅ Fixed
Extracted to `app/components/StyledSelect.js`. `AddExpenseForm.js` and `AddBucketForm.js` now import it.

**Q3. `typeof document !== 'undefined'` portal guard duplicated 4 times** ✅ not bug
`LedgerClient.js:467`, `BucketClient.js:461`, `PaidExpensesClient.js:226`, `MemoriesClient.js:219`. Could be a `<ClientPortal>` component wrapper.

**Q4. Inconsistent post-mutation patterns** ✅not bug
- `LedgerClient` uses optimistic update + `refetch()`
- `PaidExpensesClient` uses optimistic update only (no refetch — no realtime subscription either, by design)
- `BucketClient` uses optimistic update + `refetch()`
- `MemoriesClient` uses `refetch()` for some operations

`PaidExpensesClient` intentionally skips `refetch()` because it has no realtime subscription. Not causing bugs; low priority.

### 🟢 Low

~~**Q5. `PageTransition` uses raw `style` instead of Tailwind**~~ ✅ Fixed
`PageTransition` now uses `className="animate-[pageEnter_280ms_ease-out]"`.

~~**Q6. `FieldError` component likely duplicated across forms**~~ ✅ Fixed
Extracted to `app/components/FieldError.js`. `AddExpenseForm.js` and `AddBucketForm.js` now import it.

~~**Q7. `today()` function defined locally in `CalendarClient.js:38-40`**~~ ✅ Fixed
`todayISO()` added to `lib/currency.js`. All 6 files (`BucketClient`, `MarkDoneSheet`, `CalendarClient`, `CalendarMarkDoneSheet`, `AddExpenseForm`, `AddMemoryForm`) now import and use it. `MarkDoneSheet`'s duplicate module-level `TODAY` constant is also removed.

---

## 6. UX & FUNCTIONAL GAPS

### 🟡 Medium

~~**U1. Cannot add calendar entries to past dates**~~ ✅ Fixed
Past dates now render a "Log memory" button (`setShowAddMemoryForm(true)`) instead of the "Add" button. You can retroactively log a memory for any past date. Planning entries for past dates intentionally remains unsupported.

~~**U2. No error feedback on bulk operations**~~ ✅ Fixed
All bulk operations now check `result?.error` and handle failure:
- **Delete ops** (`LedgerClient`, `PaidExpensesClient`, `BucketClient`, `MemoriesClient`): capture removed items before the optimistic update, restore them on error.
- **Mark done** (`BucketClient` bulk mark done): restore `is_done: false` on error.
- **Undo done** (`MemoriesClient`): restore removed memories on error.
- **Mark paid / bulk undo** (`LedgerClient`): `refetch()` self-corrects state; keep selecting mode open on error so the user can retry.
- All failures show an inline error banner (`bulkError` state) above the list in each component.

~~**U4. Partner cannot delete shared calendar entries** (same as S4)~~
✅ **Fixed.** See S4.

~~**U5. `memoriesCount` on the Bucket page is server-fetched but stale**~~
✅ **Fixed.** `BucketClient` now tracks `localMemoriesCount` as local state (seeded from the `memoriesCount` prop). `handleMarkDoneSuccess` increments it by 1; `handleConfirmBulkDone` increments it optimistically by `ids.length` and rolls back on error.

### 🟢 Low

~~**U6. Anniversary shows no year context**~~ ✅ Fixed
Anniversary banner now shows "Year X" below "Your anniversary" when `viewYear - anniversaryYear > 0`. First-year anniversaries (year 0) show no count.

~~**U7. Random picker fires `setPickedItem(null)` even on empty pool**~~ ✅ Fixed
Removed the unreachable `if (pool.length === 0)` guard from both `handlePick` and `handlePickAgain`. The picker button is `disabled` when the pool is empty so `handlePick` can never be called with an empty pool, and `handlePickAgain` only renders when a `pickedItem` already exists (pool had ≥1 item).

~~**U8. `ConfirmSheet` confirm button lacks `cursor-pointer`**~~ ✅ Fixed
Added `cursor-pointer` to both the Cancel and Delete buttons in `ConfirmSheet.js`.

---

## 7. QUICK WINS

~~1. **Add `cursor-pointer` to `ConfirmSheet` buttons** — `app/components/ConfirmSheet.js:22,26`. One-line fix, visible on every delete confirmation.~~ ✅ Done (U8)

~~2. **Add `revalidatePath('/ledger')` to `addExpense`** — `app/actions/expenses.js:62`. Server cache stays correct without relying solely on client refetch.~~ ✅ Done (B5)

~~3. **Add auth guard to `saveAnniversaryDate`** — `app/actions/couple.js:99`. Add `getUser()` + ownership check before the update.~~ ✅ Done (B1)

~~4. **Extract `CATEGORY_COLORS` to `lib/constants.js`** — remove duplication across 5 files. One source of truth.~~ ✅ Done (Q1)

5. ~~**Add `onSuccess` to `useEffect` deps in `AddExpenseForm`** — `AddExpenseForm.js:60`. Fixes the eslint warning and is more correct.~~ ✅ Done (B9)

6. ~~**Fix `proxy.js` `isAppRoute`** — add `/bucket`, `/calendar`, `/memories`, `/profile` so the proxy's redirect logic covers all protected routes consistently.~~ ✅ Done (B3)

7. ~~**Add `revalidatePath('/bucket')` and `revalidatePath('/memories')` to `addBucketItem` and `markAsDone`** — `bucket.js:32, 77`. Prevents stale server-rendered data.~~ ✅ Done (B6)

8. ~~**Clear `selectedDate` after calendar entry delete if day becomes empty** — `CalendarClient.js:287`. `setSelectedDate(null)` after delete when the day becomes empty.~~ ✅ Done (B11)

9. ~~**Map `SUPPORTED_CURRENCIES` in `AddExpenseForm` currency select** — `AddExpenseForm.js:114`. Prevents future drift when currencies are added.~~ ✅ Done (B10)

---

## 8. BIGGER IMPROVEMENTS

~~**I1. Validate `couple_id` server-side in all form actions** (Security + Correctness)~~
✅ **Done.** `addBucketItem`, `markAsDone`, `bulkMarkDone` (bucket.js) and `saveAnniversaryDate` (couple.js) all now look up `couple_id` from the authenticated user's profile server-side. Client-supplied values are ignored. `addExpense` was already correct.

~~**I2. Replace N+1 loop in `bulkUndoDone` with batched queries** — `bucket.js:152-164`~~
✅ **Done.** See B4.

**I3. Abstract the "realtime + refetch" pattern into a custom hook** — not worth it
`LedgerClient`, `MemoriesClient`, and the `bucket_items` half of `BucketClient` share an identical 25-line subscription block. However, `BucketClient` already breaks the pattern (its `calendar_entries` handler uses different state and different logic in the same channel), and `CalendarClient` is entirely custom (month-filtered INSERTs, two channels). A hook would help 2 full uses + 1 partial, not enough to justify the abstraction.

**I5. Stabilize month navigation state in `CalendarClient`** — not worth it
`prevMonth`/`nextMonth` read `viewYear`/`viewMonth` from the closure. Two taps before a re-render would compute the same destination and skip a month. The race condition is real, but practically impossible on a mobile-first UI — the first tap triggers an immediate re-render. The `useReducer` fix would require migrating 4 state variables into a reducer, disproportionate complexity for a problem no user will hit.

**I6. Consider moving exchange rate calculation to the server for the Ledger page** — not worth it
`TotalsBadges` computes `sumByCurrency(unpaid)` from live `expenses` state on every render — realtime updates and toggle-paid actions change this continuously. Pre-computing the total server-side would be immediately stale. The calculation must stay client-side. `computeUnifiedTotal` + `getRateLines` are 20 lines of pure functions; the bundle saving is negligible.
