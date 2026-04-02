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

**B6. Missing `revalidatePath` in `addBucketItem` and `markAsDone`** — `bucket.js:32-34` and `bucket.js:77`
Neither calls any `revalidatePath`. The server-rendered bucket page will serve stale data after mutations. Only the memories count on the bucket page (fetched server-side) will be wrong since there's no cache invalidation path.

**B7. `bulkDeleteMemories` silently deletes the linked bucket_items** — `bucket.js:219-222`
```js
const bucketItemIds = memories.map(m => m.bucket_item_id).filter(Boolean)
if (bucketItemIds.length > 0) {
  await supabase.from('bucket_items').delete().in('id', bucketItemIds)
}
```
The user clicks "Delete" on the Memories page, expecting to delete the memory record. Instead, the underlying bucket list item is also permanently deleted. `bulkUndoDone` (the intended "undo" flow) correctly restores them — so these two actions are inconsistently paired. A user who just wants to clean up memories will also lose their bucket list history.

**B8. Stale `viewMonth` read inside `setViewYear` callback** — `CalendarClient.js:179, 191`
```js
setViewYear(y => {
  const newY = viewMonth === 0 ? y - 1 : y   // viewMonth is a stale closure value
  const newM = viewMonth === 0 ? 11 : viewMonth - 1
  setViewMonth(newM)
  refetchMonth(newY, newM)
  return newY
})
```
`viewMonth` is read from the outer closure inside a state updater callback. In React 18+ with concurrent mode, the updater could theoretically run with a different `viewMonth` than what was in the closure. This is fragile and could cause wrong-month data fetches during rapid navigation.

**B9. `useEffect` missing `onSuccess` in dependency array** — `AddExpenseForm.js:60`
```js
useEffect(() => {
  if (state?.success) onSuccess()
}, [state])  // onSuccess missing
```
ESLint exhaustive-deps rule violation. In practice, `onSuccess` is stable, but if it changes identity it would silently break.

### 🟢 Low

**B10. Currency options hardcoded in `AddExpenseForm`** — `AddExpenseForm.js:114-119`
Options are hardcoded `IDR/THB/AUD/MMK` instead of mapping over `SUPPORTED_CURRENCIES` from `lib/currency.js`. Adding a currency to the constant won't update this dropdown.

**B11. After deleting a calendar entry, `selectedDate` panel shows empty state** — `CalendarClient.js:287-293`
`handleDelete` removes the entry from state but doesn't clear `selectedDate`. If that was the only item on that day, the detail panel stays open showing "Nothing here yet" — which is jarring. Should `setSelectedDate(null)` after delete if the day becomes empty.

---

## 3. PERFORMANCE ISSUES

### 🟡 Medium

**P1. Double-fetch on every page load (mount refetch pattern)**
Every major client component (`LedgerClient:166`, `BucketClient:137`, `MemoriesClient:46`) calls `refetch()` on mount:
```js
useEffect(() => { refetch() }, [refetch])
```
This means every page navigation fires: one server-side DB query (for SSR) + one client-side DB query (refetch). That's 2x DB queries per page. The comment says "corrects stale initialData from router cache" — that's the right reason, but `staleTimes: { dynamic: 30 }` in `next.config.mjs` means the cache is at most 30 seconds stale. For most users, an extra 30-second delay is acceptable.

**P2. Realtime subscriptions recreated on every month change** — `CalendarClient.js:249`
```js
}, [coupleId, viewYear, viewMonth])
```
Every time the month changes, the existing realtime channels are torn down and new ones created. This is 2 subscription handshakes per month navigation. Should subscribe once and filter incoming events by date client-side instead.

**P3. `getAppSession` calls `getUser` + 2 DB queries per protected page**
```js
// lib/data/getAppSession.js
const { data: { user } } = await supabase.auth.getUser()  // Supabase auth round-trip
const { data: profile } = await supabase.from('users')...  // DB query
const { data: partner } = await supabase.from('users')...  // DB query
```
React `cache()` deduplicates this within a single render, but `DashboardPage` also creates its own `supabase` client and calls `createClient()` again. Three Supabase clients per page load is fine but worth noting.

### 🟢 Low

**P4. `PaidExpensesClient` uses `router.refresh()` instead of local state** — `PaidExpensesClient.js:99-102`
When undoing a paid expense, it calls `router.refresh()` which re-fetches the entire server component tree. `LedgerClient` optimistically updates local state. These are inconsistent patterns for the same operation in sibling components.

**P5. `RealtimeRefresh` triggers `router.refresh()` on every visibilitychange** — `RealtimeRefresh.js:37-43`
```js
document.addEventListener('visibilitychange', handleVisibility)
```
Every time the user switches apps and comes back, the entire dashboard server component is re-fetched. Could add a debounce or minimum-time-since-last-refresh check.

---

## 4. SECURITY CONCERNS

### 🔴 Critical

~~**S1. `saveAnniversaryDate` — no auth guard** (same as B1)~~
✅ **Fixed.** See B1.

~~**S2. `addBucketItem` and `markAsDone` — server actions trust client-supplied `couple_id`** (same as B2)~~
✅ **Fixed.** See B2.

### 🟡 Medium

**S3. `markCalendarEntryDone` trusts `bucket_item_id` from form data without ownership check** — `calendar.js:75`
The action updates `bucket_items.is_done` and creates a `memories` row using a `bucket_item_id` supplied by the client. If RLS permits, a malicious user could mark another couple's bucket item as done.

**S4. Only entry creators can delete calendar entries** — `calendar.js:126-129`
```js
.eq('user_id', user.id)  // ownership filter
```
This means a partner cannot delete a couple entry the other person created, even though it's a shared event. This could frustrate users and seems like an unintentional restriction.

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

**U3. Deleting a memory from the Memories page also deletes the bucket item** (same as B7)
This is confusing UX — the user sees "Delete" expecting to remove a memory, not knowing the bucket list item disappears too.

**U4. Partner cannot delete shared calendar entries** (same as S4)
If your partner creates a couple date entry and it becomes stale/cancelled, you can't delete it. Only the creator can.

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

5. **Add `onSuccess` to `useEffect` deps in `AddExpenseForm`** — `AddExpenseForm.js:60`. Fixes the eslint warning and is more correct.

6. ~~**Fix `proxy.js` `isAppRoute`** — add `/bucket`, `/calendar`, `/memories`, `/profile` so the proxy's redirect logic covers all protected routes consistently.~~ ✅ Done (B3)

7. **Add `revalidatePath('/bucket')` and `revalidatePath('/memories')` to `addBucketItem` and `markAsDone`** — `bucket.js:32, 77`. Prevents stale server-rendered data.

8. **Clear `selectedDate` after calendar entry delete if day becomes empty** — `CalendarClient.js:287`. `setSelectedDate(null)` after delete when the day becomes empty.

9. **Map `SUPPORTED_CURRENCIES` in `AddExpenseForm` currency select** — `AddExpenseForm.js:114`. Prevents future drift when currencies are added.

---

## 8. BIGGER IMPROVEMENTS

~~**I1. Validate `couple_id` server-side in all form actions** (Security + Correctness)~~
✅ **Done.** `addBucketItem`, `markAsDone`, `bulkMarkDone` (bucket.js) and `saveAnniversaryDate` (couple.js) all now look up `couple_id` from the authenticated user's profile server-side. Client-supplied values are ignored. `addExpense` was already correct.

~~**I2. Replace N+1 loop in `bulkUndoDone` with batched queries** — `bucket.js:152-164`~~
✅ **Done.** See B4.

**I3. Abstract the "realtime + refetch" pattern into a custom hook**
`LedgerClient`, `BucketClient`, `MemoriesClient` all repeat the same 30-line pattern: subscribe to postgres changes, de-duplicate INSERTs, handle UPDATE/DELETE. A `useRealtimeTable(tableName, coupleId, { onInsert, onUpdate, onDelete })` hook would make each component cleaner and ensure consistent de-duplication logic.

**I4. Reconsider the `bulkDeleteMemories` → delete bucket items behavior**
Currently deleting a memory is destructive to the bucket list. Options:
- **Separate the actions**: "Remove from memories" (keeps bucket item at `is_done: true`) vs "Delete completely" (removes memory + bucket item)
- Or make `bulkDeleteMemories` only delete memory rows, leaving bucket items in `is_done: true` state (orphaned but browsable under the "Done" filter)

**I5. Stabilize month navigation state in `CalendarClient`**
Refactor `prevMonth`/`nextMonth` to derive next state fully inside a single `useReducer` dispatch, eliminating the stale-closure risk and making month changes atomic:
```js
dispatch({ type: 'PREV_MONTH' }) // reducer computes newYear + newMonth atomically
```

**I6. Consider moving exchange rate calculation to the server for the Ledger page**
Currently `LedgerClient` receives raw `rates` as a prop and does `computeUnifiedTotal` client-side. Since rates are already available server-side when the ledger page renders, the unified total could be computed once on the server and passed as a prop — reducing client bundle usage of `lib/exchangeRates.js`.
