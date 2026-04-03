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

**B5. `addExpense` doesn't `revalidatePath('/ledger')`** — `expenses.js:61-62`
```js
revalidatePath('/dashboard')
return { success: true }
```
`/ledger` is missing. The ledger page's server component cache is never invalidated when a new expense is added. The client handles it via `refetch()` on mount, but a direct navigation or hard refresh will show stale data until ISR expires.

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

**Q1. `CATEGORY_COLORS` object duplicated 5 times**
Defined separately in: `LedgerClient.js:14`, `PaidExpensesClient.js:11`, `CalendarClient.js:20`, `BucketClient.js:13`, `MemoriesClient.js:11`. The expense categories use slightly different color sets than the bucket/calendar ones (food/transport vs restaurant/travel), which is correct, but the identical-key objects are still duplicated. Should be in `lib/constants.js`.

**Q2. `StyledSelect` component duplicated**
Defined inline in `AddExpenseForm.js:26-41`. Almost certainly duplicated in `AddBucketForm.js`. Should be a shared component in `app/components/`.

**Q3. `typeof document !== 'undefined'` portal guard duplicated 4 times**
`LedgerClient.js:467`, `BucketClient.js:461`, `PaidExpensesClient.js:226`, `MemoriesClient.js:219`. Could be a `<ClientPortal>` component wrapper.

**Q4. Inconsistent post-mutation patterns**
- `LedgerClient` uses optimistic update + `refetch()`
- `PaidExpensesClient` uses `router.refresh()`
- `BucketClient` uses optimistic update + `refetch()`
- `MemoriesClient` uses optimistic update (no refetch for undo, only for delete)

Same operation (undo a paid item) behaves differently on the Ledger vs Paid Expenses pages.

### 🟢 Low

**Q5. `PageTransition` uses raw `style` instead of Tailwind**
```js
<div style={{ animation: 'pageEnter 280ms ease-out' }}>
```
The animation class `pageEnter` must be defined in `globals.css`. Fine, but inconsistent with the Tailwind-first pattern.

**Q6. `FieldError` component likely duplicated across forms**
Defined in `AddExpenseForm.js:6-9`. Should be shared.

**Q7. `today()` function defined locally in `CalendarClient.js:38-40`**
Uses `new Date().toLocaleDateString('en-CA')`. The same pattern appears as a local `const today` in `AddExpenseForm.js:64`. A shared `todayISO()` utility would ensure consistency.

---

## 6. UX & FUNCTIONAL GAPS

### 🟡 Medium

**U1. Cannot add calendar entries to past dates**
`CalendarClient.js:480`: The Add button only renders when `selectedDate >= todayStr`. You can't log "we went here last Tuesday" retroactively from the calendar view. This contradicts the bucket list's `markAsDone` flow which explicitly asks "what date did you do this?" and allows any past date.

**U2. No error feedback on bulk operations**
`BucketClient.js:260-262` and similar in other components:
```js
startTransition(async () => {
  await bulkMarkDone(ids, coupleId)
})
```
If the server action returns `{ error }`, it's silently ignored. The optimistic update has already happened, so the UI shows items as done even if the DB update failed. No toast, no error state, no rollback.

~~**U4. Partner cannot delete shared calendar entries** (same as S4)~~
✅ **Fixed.** See S4.

**U5. `memoriesCount` on the Bucket page is server-fetched but stale**
`bucket/page.js` fetches `memoriesCount` once server-side. After marking items as done (which creates new memories), the count shown in the Memories link card doesn't update without a full page refresh — the realtime subscription doesn't update this count.

### 🟢 Low

**U6. Anniversary shows no year context**
The calendar shows a heart ♥ on the anniversary day, but there's no tooltip or label indicating how many years. A couple celebrating year 3 vs year 10 deserves to see that.

**U7. Random picker fires `setPickedItem(null)` even on empty pool**
`BucketClient.js:186-189`:
```js
function handlePick() {
  const pool = getPickerPool()
  if (pool.length === 0) { setPickedItem(null); return }
```
The button is disabled when pool is empty (line 367), so this branch never runs. Dead code.

**U8. `ConfirmSheet` confirm button lacks `cursor-pointer`**
`ConfirmSheet.js:22-26`: The cancel and confirm buttons are missing `cursor-pointer` class, violating the UI convention stated in CLAUDE.md.

---

## 7. QUICK WINS

1. **Add `cursor-pointer` to `ConfirmSheet` buttons** — `app/components/ConfirmSheet.js:22,26`. One-line fix, visible on every delete confirmation.

2. **Add `revalidatePath('/ledger')` to `addExpense`** — `app/actions/expenses.js:62`. Server cache stays correct without relying solely on client refetch.

3. ~~**Add auth guard to `saveAnniversaryDate`** — `app/actions/couple.js:99`. Add `getUser()` + ownership check before the update.~~ ✅ Done (B1)

4. **Extract `CATEGORY_COLORS` to `lib/constants.js`** — remove duplication across 5 files. One source of truth.

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

**I3. Abstract the "realtime + refetch" pattern into a custom hook**
`LedgerClient`, `BucketClient`, `MemoriesClient` all repeat the same 30-line pattern: subscribe to postgres changes, de-duplicate INSERTs, handle UPDATE/DELETE. A `useRealtimeTable(tableName, coupleId, { onInsert, onUpdate, onDelete })` hook would make each component cleaner and ensure consistent de-duplication logic.

**I5. Stabilize month navigation state in `CalendarClient`**
Refactor `prevMonth`/`nextMonth` to derive next state fully inside a single `useReducer` dispatch, eliminating the stale-closure risk and making month changes atomic:
```js
dispatch({ type: 'PREV_MONTH' }) // reducer computes newYear + newMonth atomically
```

**I6. Consider moving exchange rate calculation to the server for the Ledger page**
Currently `LedgerClient` receives raw `rates` as a prop and does `computeUnifiedTotal` client-side. Since rates are already available server-side when the ledger page renders, the unified total could be computed once on the server and passed as a prop — reducing client bundle usage of `lib/exchangeRates.js`.
