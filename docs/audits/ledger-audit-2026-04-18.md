# Ourverse Ledger Feature Audit — 2026-04-18

## Scope

Full audit of the expense ledger feature — every file that makes up the ledger, its actions, and shared utilities used exclusively by the ledger.

**Files audited:**
- `app/(app)/ledger/page.js`
- `app/(app)/ledger/LedgerClient.js`
- `app/(app)/ledger/AddExpenseForm.js`
- `app/(app)/ledger/LedgerHelpSheet.js`
- `app/(app)/ledger/loading.js`
- `app/(app)/ledger/paid/page.js`
- `app/(app)/ledger/paid/PaidExpensesClient.js`
- `app/(app)/ledger/paid/loading.js`
- `app/actions/expenses.js`
- `lib/currency.js` (ledger-relevant exports)
- `lib/exchangeRates.js`

**Cross-references checked against:** `bug-audit-2026-04-07.md`, `performance-audit-2026-04-10.md`

---

## Summary

| Severity | Bugs | Security | Performance | Total |
|----------|------|----------|-------------|-------|
| 🔴 HIGH | 3 | — | 1 | 4 |
| 🟠 MEDIUM | 3 | — | 2 | 5 |
| 🟡 LOW | 3 | 2 | 3 | 8 |
| **Total** | **9** | **2** | **6** | **17** |

Items marked **OPEN** were identified in prior audits but not yet fixed. All other items are new findings from this audit.

---

## Category 1 — Bugs

### 1.1 ✅ FIXED — `togglePaid` and `bulkSetPaid` missing `revalidatePath('/ledger')` *(was OPEN from bug-audit-2026-04-07 items 1.4 and 1.5)*

**File:** `app/actions/expenses.js`

**Bug:** Both `bulkSetPaid` and `togglePaid` were revalidating `/ledger/paid` and `/dashboard`, but not `/ledger`. Toggling or bulk-marking expenses as paid/unpaid left the ledger page's server cache stale.

**Reproduction:** Mark an expense as paid. Navigate away (e.g., to Dashboard), then return to `/ledger` within 30 seconds (the `staleTimes.dynamic` window). The server-rendered unpaid count in the subtitle ("X outstanding") still reflected the pre-mutation count, and the expense row still appeared as unpaid momentarily before client-side state took over.

**Resolution (2026-04-18):** Added `revalidatePath('/ledger')` to both `togglePaid` and `bulkSetPaid` in `app/actions/expenses.js`, matching the pattern already used by `bulkDeleteExpenses`.

---

### 1.2 ✅ FIXED — `ledger/paid/page.js` missing `export const dynamic = 'force-dynamic'`

**File:** `app/(app)/ledger/paid/page.js`

**Bug:** `ledger/page.js` had `export const dynamic = 'force-dynamic'` (added in the performance audit), but the sibling `ledger/paid/page.js` did not. With `staleTimes.dynamic: 30` in `next.config.mjs`, the router cache was serving stale paid expenses for up to 30 seconds after mutations.

**Reproduction:**
1. Mark an expense as paid on the ledger — it moves to the paid list.
2. Navigate to `/ledger/paid`. The expense correctly appears (fresh server render).
3. On the paid page, undo the expense (toggles back to unpaid).
4. Navigate away, then back to `/ledger/paid` within 30 seconds.
5. The stale router cache shows the expense as still paid.

**Resolution (2026-04-18):** Added `export const dynamic = 'force-dynamic'` to `app/(app)/ledger/paid/page.js`, matching `ledger/page.js`.

---

### 1.3 ✅ FIXED — `PaidExpensesClient` had no realtime subscription

**Files:** `app/(app)/ledger/paid/PaidExpensesClient.js`, `app/(app)/ledger/paid/page.js`

**Bug:** The paid expenses page had no Supabase realtime channel. If a partner marked expenses as paid, undid payments, or the current user performed mutations from the ledger page — none of those changes reached the paid expenses page while it was open.

**Reproduction:**
1. User A opens `/ledger/paid` and keeps it visible.
2. User B marks several expenses as paid from the ledger page.
3. User A's paid expenses page never updated — the new paid items didn't appear.

**Resolution (2026-04-18):**
- Added `coupleId={profile.couple_id}` to the `<PaidExpensesClient>` prop in `paid/page.js`
- Added `useCallback`/`useEffect` imports and `createClient` import to `PaidExpensesClient.js`
- Added a `refetch` function (mirrors the select from the server page, filtered to `is_paid: true`)
- Added a realtime subscription on the `expenses` table with full `INSERT`/`UPDATE`/`DELETE` handling:
  - `INSERT`: adds item only if `is_paid: true`
  - `UPDATE`: replaces or adds if now paid; removes if now unpaid (handles the "marked paid on ledger → appears here" flow)
  - `DELETE`: removes item
- Wired `refetch()` into `handleUndo` and `handleBulkUndo` so own mutations also sync after the server action settles, closing the gap noted in audit items 3.5 and 3.6

---

### 1.4 ✋ NOT A BUG — Rollback array order reassessed

**Files checked:**
- `app/(app)/ledger/LedgerClient.js:297`
- `app/(app)/ledger/paid/PaidExpensesClient.js:157` and `:196`

**Original claim:** When a server action fails, `[...removed, ...prev]` prepends rolled-back items to the front of the state array, causing them to visually appear at the top of the sorted list.

**Reassessment (2026-04-18):** Both components re-derive their display lists with a fresh `.sort()` on every render, independent of the underlying state array order:

```js
// LedgerClient.js — display lists always re-sorted from expenses state
const unpaidSorted = [...activeList].filter(e => !e.is_paid).sort(...)
const paidSorted   = [...activeList].filter(e =>  e.is_paid).sort(...)

// PaidExpensesClient.js — display list always re-sorted from localExpenses state
const sorted = [...activeList].sort(...)
```

The `[...removed, ...prev]` prepend only affects the unsorted internal state array — the next render immediately re-sorts it into the correct display order. Users never see the wrong order.

**Verdict:** No fix needed. The rollback is visually correct.

---

### 1.5 ✅ FIXED — Expense date validation accepts structurally valid but logically invalid dates

**Files:** `app/actions/expenses.js`, `app/(app)/ledger/AddExpenseForm.js`

**Bug:** The server-side date validator only checked format with a regex, accepting impossible dates like `2026-02-30` or `2026-13-01`. Postgres rejects these at the DB level, surfacing as a generic `"Could not save expense."` error instead of an inline field message. The date input also had no `max` attribute, so future dates were accepted without any client-side hint.

**Resolution (2026-04-19):**
- Extended the server-side validation chain in `addExpense` with two additional `else if` guards after the format check: `isNaN(new Date(date + 'T00:00:00').getTime())` catches impossible calendar dates; `date > new Date().toISOString().slice(0, 10)` rejects future dates. Both return inline `errors.date` messages.
- Added `max={today}` to the date input in `AddExpenseForm.js` so the browser picker disables future dates at the UI level too.

---

### 1.6 🟠 MEDIUM — No maximum amount validation — DB overflow causes cryptic error

**File:** `app/actions/expenses.js:27-28`

**Bug:** The amount validation only checks `amount > 0` with no upper bound:
```js
if (!formData.get('amount') || formData.get('amount') === '') errors.amount = 'Please enter an amount.'
else if (isNaN(amount) || amount <= 0) errors.amount = 'Amount must be greater than zero.'
```

The database column is `numeric(14,2)`, which has a maximum of `999,999,999,999.99`. Any value above this (e.g., `1e13`) will pass client and server validation but fail at the DB insert, returning the generic `"Could not save expense. Please try again."` error.

**Reproduction:** Submit `amount=1e13` via API or DevTools. Server returns `{ error: "Could not save expense. Please try again." }`.

**User experience:** No inline field error indicating the amount is too large. Unlikely for legitimate use (who logs a trillion-dollar expense?) but worth closing defensively.

**Fix:**
```js
else if (isNaN(amount) || amount <= 0) errors.amount = 'Amount must be greater than zero.'
else if (amount > 999_999_999_999.99) errors.amount = 'Amount is too large.'
```

---

### 1.7 🟡 LOW — `PaidExpensesClient` Edit button visibility is inconsistent with subtitle count

**File:** `app/(app)/ledger/paid/PaidExpensesClient.js:208-221`

**Bug:** The "Edit" button renders based on `sorted.length > 0`, where `sorted` is the active tab's list. The subtitle renders `localExpenses.length` which counts ALL paid expenses across both tabs:

```js
// Subtitle — uses ALL expenses
{localExpenses.length > 0
  ? `${localExpenses.length} expense${...} settled`
  : 'No paid expenses yet'}

// Edit button — uses active tab only
{sorted.length > 0 && (
  <button onClick={isSelecting ? handleCancelSelecting : handleStartSelecting}>
    {isSelecting ? 'Cancel' : 'Edit'}
  </button>
)}
```

If the user is on the "They owe me" tab (empty) but "I owe them" tab has 10 paid expenses, they see "10 expenses settled" with no Edit button. No indication they need to switch tabs to select items.

**Reproduction:** Have paid expenses only in the "I owe them" tab. Load the paid page — defaults to "They owe me" tab. Subtitle says "X expenses settled" but there's no Edit button.

**User experience:** Confusing — the count implies there are items but the Edit button is absent with no explanation.

**Fix:** Render the Edit button when either tab has items:
```js
{(theyOweMe.length > 0 || iOweThem.length > 0) && (
  <button ...>
```

Or change the subtitle to reflect the active tab count:
```js
{sorted.length > 0
  ? `${sorted.length} expense${sorted.length === 1 ? '' : 's'} settled`
  : (localExpenses.length > 0 ? 'Switch tabs to see expenses' : 'No paid expenses yet')}
```

---

### 1.8 🟡 LOW — `addExpense` allows future dates with no server-side guard

**File:** `app/actions/expenses.js:29`

**Bug:** There is no server-side check preventing expense dates in the future. The client-side date input has no `max` attribute either (unlike `AddMemoryForm.js` and `AddCalendarEntryForm.js` which use `max={today}`).

This differs from `addDirectMemory` (bucket.js) which the prior bug audit (item 3.2) called out explicitly for the same missing check.

**Reproduction:** Submit an expense with `date=2099-01-01`. It saves successfully and appears at the top of the sorted ledger list due to date-descending order.

**User experience:** Future-dated expenses sort to the top of both tabs, above all real expenses, which looks wrong. Partners may be confused by an expense dated "2099-01-01".

**Fix:**
```js
// app/actions/expenses.js — add after date format check
else {
  const parsed = new Date(date + 'T00:00:00')
  if (isNaN(parsed.getTime())) errors.date = 'Please enter a valid date.'
  else {
    const today = new Date().toISOString().slice(0, 10)
    if (date > today) errors.date = 'Date cannot be in the future.'
  }
}
```

And on the client, add `max={today}` to the date input in `AddExpenseForm.js`:
```jsx
<input name="date" type="date" defaultValue={today} max={today} ... />
```

---

### 1.9 🟡 LOW — AddExpenseForm buttons missing `cursor-pointer`

**File:** `app/(app)/ledger/AddExpenseForm.js:163-174`

**Bug:** The Cancel and Submit buttons in `AddExpenseForm` lack the `cursor-pointer` class, violating the CLAUDE.md convention ("All interactive buttons must have `cursor-pointer`").

```js
// Line 163-166 — Cancel button
<button type="button" onClick={onCancel}
  className="flex-1 py-3 rounded-xl border ... text-sm text-[#A07060] ...">
  Cancel
</button>

// Line 168-174 — Submit button
<button type="submit" disabled={isPending}
  className="flex-1 py-3 bg-[#C2493A] ... text-white rounded-xl ...">
```

**User experience:** On desktop the button shows the default `auto` cursor, not the hand pointer. Visually inconsistent with all other buttons in the app.

**Fix:** Add `cursor-pointer` to both buttons:
```js
// Cancel
className="... text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors cursor-pointer"

// Submit
className="... disabled:opacity-50 transition-colors cursor-pointer"
```

---

## Category 2 — Security

### 2.1 🟡 LOW — `bulkSetPaid` `isPaid` parameter not type-validated

**File:** `app/actions/expenses.js:68`

**Bug:** `bulkSetPaid(ids, isPaid)` validates the `ids` array but not the `isPaid` parameter:

```js
export async function bulkSetPaid(ids, isPaid) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { error } = await supabase
    .from('expenses')
    .update({ is_paid: isPaid })  // isPaid never validated
```

`isPaid` is used directly in the Postgres update. If a caller passes a non-boolean value (e.g., `null`, `1`, `"true"`, or an object), Postgres will either coerce it silently or return an error. Supabase's typed client provides some protection, but there is no explicit server-side guard.

**Risk:** Low — the action is called internally from `LedgerClient.js` and `PaidExpensesClient.js` with literal `true`/`false`, and server actions are only callable by authenticated users within the same couple. No cross-user exploit is possible. But defense-in-depth recommends validating all external inputs.

**Fix:**
```js
export async function bulkSetPaid(ids, isPaid) {
  if (typeof isPaid !== 'boolean') return { error: 'Invalid request.' }
  // ... rest of action
```

---

### 2.2 🟡 LOW — `togglePaid` and `bulkDeleteExpenses` `id` parameters not validated as UUID format

**Files:** `app/actions/expenses.js:111` (togglePaid), `app/actions/expenses.js:89` (bulkDeleteExpenses)

**Bug:** `expenseId` in `togglePaid` and each element of `ids` in `bulkDeleteExpenses` are not validated as UUID format before being used in queries. Any string is accepted.

```js
export async function togglePaid(expenseId) {
  // no format validation on expenseId
  const { data: expense } = await supabase
    .from('expenses')
    .select('is_paid')
    .eq('id', expenseId)   // arbitrary string
    .eq('couple_id', coupleId)
```

**Why this is low risk:** Supabase uses parameterized queries — SQL injection is impossible. The `couple_id` scope means even a valid UUID from another couple returns no rows. The function returns `{ error: 'Expense not found.' }` for any invalid ID. No data is exposed or corrupted.

**Why it's worth fixing:** A garbage ID reaching the DB is wasteful, and validating UUID format at the action boundary is a standard defense-in-depth practice. It also prevents unnecessarily hitting the DB for clearly malformed IDs.

**Fix:** Add a UUID format check before the DB query:
```js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function togglePaid(expenseId) {
  if (!expenseId || !UUID_RE.test(expenseId)) return { error: 'Invalid expense ID.' }
  // ...
}

// For bulkDeleteExpenses and bulkSetPaid — validate each ID in the array:
if (ids.some(id => !UUID_RE.test(id))) return { error: 'Invalid expense ID.' }
```

---

## Category 3 — Performance

### 3.1 ✅ FIXED — `togglePaid` reduced from 3 to 2 sequential DB round-trips *(was OPEN from performance-audit-2026-04-10 item 3.3)*

**File:** `app/actions/expenses.js`

**Problem:** `togglePaid` was doing: auth (1) → `SELECT is_paid` (2) → `UPDATE` (3). The SELECT existed only to read the current boolean value in order to invert it — a job Postgres can do atomically in a single statement.

**Resolution (2026-04-19):**

Created a `plpgsql` function `toggle_expense_paid(p_expense_id uuid, p_couple_id uuid)` that does `UPDATE ... SET is_paid = NOT is_paid RETURNING is_paid` in one operation. Uses `SECURITY INVOKER` (default) so RLS still applies; the explicit `couple_id` check in the WHERE clause is defense-in-depth. Returns `NULL` if no row matched (not found or wrong couple), which the action treats as "Expense not found."

Updated `togglePaid` in `expenses.js` to call `supabase.rpc('toggle_expense_paid', ...)` instead of SELECT + UPDATE. Round-trip count: 3 → 2. Estimated saving: 30–80ms per "Mark paid" tap.

SQL function deployed to Supabase on 2026-04-19.

---

### 3.2 ✋ NOT WORTH FIXING — `useMemo` on sort computations

**Files checked:** `app/(app)/ledger/LedgerClient.js:303-326`, `app/(app)/ledger/paid/PaidExpensesClient.js:141-148`

**Original claim:** Both components re-sort on every render including unrelated state changes, which is wasteful.

**Reassessment (2026-04-19):** The sort operates on at most half the total expense list (expenses are split by `paid_by_user_id`). For a 2-person app, that's realistically 25–100 items per sort. `Array.sort` on 100 items takes well under 0.5ms on any device — less than 3% of a 60fps frame budget.

Adding `useMemo` with its dependency arrays (`expenses`, `activeTab`, `currentUserId`, `partnerId`) introduces real cognitive overhead for a gain that is imperceptible at these data sizes. Not worth it.

---

### 3.3 ✋ NOT WORTH FIXING — Duplicate Supabase server client creation

**File checked:** `app/(app)/ledger/page.js`, `lib/supabase/server.js`, `lib/data/getAppSession.js`

**Original claim:** `ledger/page.js` calls `createClient()` a second time after `getAppSession()` already created one, adding unnecessary overhead.

**Reassessment (2026-04-19):** `server.js`'s `createClient()` is not memoized — each call does `await cookies()` (in-memory request context lookup) and `createServerClient(...)` (pure JS object construction). No network I/O, no DB connection. The overhead is microseconds.

The fix would require returning `supabase` from `getAppSession()` and updating every caller (`ledger/page.js`, `paid/page.js`, `bucket/page.js`, `calendar/page.js`, `memories/page.js`, `profile/page.js`). A broad refactor for a sub-microsecond gain. Not worth it.

---

### 3.4 🟡 LOW — `LedgerClient` `refetch` fetches ALL expenses including all paid history

**File:** `app/(app)/ledger/LedgerClient.js:151-159`

**Problem:** The `refetch` function fetches every expense in the couple's history:
```js
const refetch = useCallback(async () => {
  const supabase = createClient()
  const { data } = await supabase
    .from('expenses')
    .select('*')                // all columns
    .eq('couple_id', coupleId)  // all expenses ever
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (data) setExpenses(data)
}, [coupleId])
```

The ledger page only shows 5 paid expenses per tab in the preview. A couple that has been using the app for months could have hundreds of paid expenses, all of which are transferred on every `refetch` call — which runs after every single-expense toggle and every bulk operation.

**Fix (option A):** Separate paid and unpaid queries — only fetch enough paid for the preview:
```js
const refetch = useCallback(async () => {
  const supabase = createClient()
  const [{ data: unpaid }, { data: paid }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('is_paid', false)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('is_paid', true)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),  // only need 5 per tab = 10 total max
  ])
  if (unpaid && paid) setExpenses([...unpaid, ...paid])
}, [coupleId])
```

**Fix (option B):** Accept the current approach — for 2 users with typical usage, paid expense counts are unlikely to be prohibitive. Optimize only if user feedback indicates slow ledger refreshes.

---

### 3.5 🟡 LOW — `LedgerClient.handleConfirmDelete` does not call `refetch` after successful deletion

**File:** `app/(app)/ledger/LedgerClient.js:286-301`

**Problem:** Unlike `handleToggle` and `handleBulkMarkPaid`/`handleBulkUndo` which always call `await refetch()`, `handleConfirmDelete` uses pure optimistic deletion with no server sync on success:

```js
startDeleteTransition(async () => {
  const result = await bulkDeleteExpenses(ids)
  if (result?.error) {
    setExpenses(prev => [...removed, ...prev])  // rollback on error
    setBulkError('Something went wrong. Please try again.')
  }
  // No refetch on success — relies on optimistic delete + realtime
})
```

If realtime misses a concurrent INSERT from the partner (network blip, Supabase outage), the partner's new expense is never added to local state. After a bulk delete, the app won't notice.

**Fix:** Add a refetch after successful deletion to close the gap:
```js
startDeleteTransition(async () => {
  const result = await bulkDeleteExpenses(ids)
  if (result?.error) {
    setExpenses(prev => [...removed, ...prev])
    setBulkError('Something went wrong. Please try again.')
  } else {
    await refetch()  // ADD — sync with server after delete
  }
})
```

Note: `PaidExpensesClient.handleConfirmDelete` has the same gap (line 164-170) — apply the same fix there with its own `refetch`.

---

### 3.6 ✅ FIXED (as part of 1.3) — `PaidExpensesClient` mutations did not call `refetch` after success

**File:** `app/(app)/ledger/paid/PaidExpensesClient.js`

**Problem:** `handleUndo` and `handleBulkUndo` used optimistic updates with no server sync on success. If realtime missed an event, local state could drift.

**Resolution (2026-04-18):** Fixed as part of the 1.3 realtime addition — `refetch()` is now called at the end of both `handleUndo` and `handleBulkUndo` transition handlers, regardless of success or error outcome.

---

## Prioritised Fix List

### Fix immediately (bugs affecting correctness):

| # | Finding | File | Effort |
|---|---------|------|--------|
| ~~1.1~~ | ~~Add `revalidatePath('/ledger')` to `togglePaid` and `bulkSetPaid`~~ | ✅ Fixed 2026-04-18 | — |
| ~~1.2~~ | ~~Add `force-dynamic` to `paid/page.js`~~ | ✅ Fixed 2026-04-18 | — |
| ~~1.5~~ | ~~Validate expense date for invalid calendar dates~~ | ✅ Fixed 2026-04-19 | — |
| 1.9 | Add `cursor-pointer` to `AddExpenseForm` buttons | `AddExpenseForm.js:164,169` | Trivial |
| 2.1 | Validate `isPaid` type in `bulkSetPaid` | `expenses.js:68` | Trivial — 1 line |

### Fix soon (correctness + UX):

| # | Finding | File | Effort |
|---|---------|------|--------|
| ~~1.3~~ | ~~Add realtime subscription to `PaidExpensesClient`~~ | ✅ Fixed 2026-04-18 | — |
| ~~1.4~~ | ~~Fix rollback sort order~~ | Not a bug — display re-sorts on every render | — |
| 1.6 | Add max amount validation to `addExpense` | `expenses.js:28` | Trivial |
| 1.7 | Fix Edit button visibility in `PaidExpensesClient` | `PaidExpensesClient.js:214` | Small |
| 1.8 | Add future-date guard to `addExpense` | `expenses.js:29` | Small |

### Performance (impact-ordered):

| # | Finding | File | Effort |
|---|---------|------|--------|
| ~~3.1~~ | ~~Reduce `togglePaid` to 2 DB round-trips via RPC~~ | ✅ Fixed 2026-04-19 | — |
| ~~3.2~~ | ~~Wrap sort computations in `useMemo`~~ | Not worth it — <0.5ms at realistic data sizes | — |
| 3.5 | Add `refetch` after `handleConfirmDelete` success | `LedgerClient.js`, `PaidExpensesClient.js` | Trivial |
| 3.4 | Limit paid expense fetches in `refetch` | `LedgerClient.js:151` | Small |

---

*Audit completed 2026-04-18. All source files read directly from the working codebase. No theoretical or speculative findings — each issue was traced to specific lines.*
