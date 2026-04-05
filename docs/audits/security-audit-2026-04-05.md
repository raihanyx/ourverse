# Ourverse Security Audit — 2026-04-05

**Audited by:** Claude Code (claude-sonnet-4-6)
**Audit date:** 2026-04-05
**Codebase path:** `D:\Codebases\Ourverse\ourverse`
**Stack:** Next.js 16.2.1 (App Router), Supabase (auth + Postgres + realtime), Tailwind v4, Vercel

---

## Summary

| Severity | Count |
|---|---|
| 🔴 CRITICAL | 0 (3 fixed) |
| 🟠 HIGH | 2 (3 fixed, 1 false positive) |
| 🟡 MEDIUM | 0 (5 fixed, 2 downgraded, 1 reclassified) |
| 🟢 LOW | 8 |
| ➕ Post-audit | 1 (1 fixed) |
| **Total** | **25** |

---

## Section 1 — RLS & Database Security

### Tables in Use

| Table | Queried From | Typical Filter Pattern |
|---|---|---|
| `users` | Server actions, server pages, `getAppSession` | `.eq('id', user.id)` (own row) or `.eq('couple_id', ...)` (partner lookup) |
| `couples` | Dashboard, calendar, couple actions | `.eq('id', profile.couple_id)` |
| `expenses` | Ledger pages, dashboard, server actions | `.eq('couple_id', profile.couple_id)` |
| `bucket_items` | Bucket pages, server actions | `.eq('couple_id', profile.couple_id)` |
| `memories` | Memories page, server actions | `.eq('couple_id', profile.couple_id)` |
| `calendar_entries` | Calendar page, server actions | `.eq('couple_id', profile.couple_id)` |

### RLS Assessment

All server pages and most server actions fetch `couple_id` server-side from `users` using the authenticated `user.id`, then scope all subsequent queries with `.eq('couple_id', profile.couple_id)`. This is the correct pattern and provides defense-in-depth even if RLS policies are imperfect.

However, several important gaps were found:

---

### Finding 1.1 — ✅ FIXED (2026-04-05): `deleteBucketItem` had no couple-scope check

**File:** `app/actions/bucket.js`, line 224

```js
export async function deleteBucketItem(id) {
  // ...auth check only...
  const { error } = await supabase.from('bucket_items').delete().eq('id', id)
```

The delete is scoped only by `id`. There is no `.eq('couple_id', ...)` guard. An authenticated user from Couple A who somehow obtains the UUID of a bucket item belonging to Couple B can delete it by calling this server action directly.

**Why it matters:** Server Actions are callable as POST requests from any authenticated browser session. An attacker only needs a valid session + a target item's UUID. UUIDs are v4 (random) but can be leaked via realtime channels, browser logs, or insecure client state.

**Fix:**
```js
export async function deleteBucketItem(id) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { error } = await supabase
    .from('bucket_items')
    .delete()
    .eq('id', id)
    .eq('couple_id', profile.couple_id)   // <-- add this
  if (error) return { error: 'Could not delete item.' }
  return { success: true }
}
```

---

### Finding 1.2 — ✅ FIXED (2026-04-05): `bulkDeleteBucketItems` had no couple-scope check

**File:** `app/actions/bucket.js`, line 238

```js
export async function bulkDeleteBucketItems(ids) {
  // ...auth check only...
  const { error } = await supabase.from('bucket_items').delete().in('id', ids)
```

Same issue as 1.1 but for bulk deletion. An authenticated user can delete any array of bucket item UUIDs regardless of which couple owns them.

**Fix:** Fetch `profile.couple_id` and add `.eq('couple_id', profile.couple_id)` to the delete query.

---

### Finding 1.3 — ✅ FIXED (2026-04-05): `bulkUndoDone` fetched and modified records with no couple-scope check

**File:** `app/actions/bucket.js`, lines 172–211

```js
export async function bulkUndoDone(memoryIds) {
  // ...auth check only — no couple_id fetch...
  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', memoryIds)    // no .eq('couple_id', ...)

  // ...then updates bucket_items with no couple scope...
  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: false })
    .in('id', bucketItemIds)   // no couple scope
```

An authenticated user can pass memory IDs from any couple to undo done status and delete those memories. This is a cross-couple data manipulation vulnerability.

**Fix:** Fetch `profile.couple_id` at the top of the function and add `.eq('couple_id', profile.couple_id)` to every query.

---

### Finding 1.4 — ✅ FIXED (2026-04-05): `bulkDeleteMemories` fetched memories without couple-scope

**File:** `app/actions/bucket.js`, lines 307–310

```js
const { data: memories } = await supabase
  .from('memories')
  .select('id, bucket_item_id')
  .in('id', ids)   // no couple_id scope
```

The subsequent delete at line 315 also lacks couple-scope:
```js
const { error: deleteMemoriesError } = await supabase
  .from('memories').delete().in('id', ids)
```

This allows an authenticated user to delete memories (and their linked calendar entries and bucket items) from any couple if they know the UUIDs.

**Fix:** Add `.eq('couple_id', profile.couple_id)` to both the read and delete queries, and fetch `profile.couple_id` upfront.

---

### Finding 1.5 — ✅ FIXED (2026-04-05): `addCalendarEntry` used `couple_id` from the client form without server-side verification

**File:** `app/actions/calendar.js`, lines 19, 35, 49

```js
const coupleId = formData.get('couple_id')   // <- from hidden <input>

// Used directly to insert into bucket_items:
couple_id: coupleId,

// And into calendar_entries:
couple_id: coupleId,
```

The `coupleId` value is never cross-checked against the authenticated user's actual `couple_id` from the database. An attacker with a valid session can forge the hidden field and insert calendar entries and bucket items into any couple space.

**Fix:**
```js
// Fetch couple_id server-side, never trust client
const { data: profile } = await supabase
  .from('users').select('couple_id').eq('id', user.id).single()
if (!profile?.couple_id) return { error: 'No couple space found.' }
const coupleId = profile.couple_id   // use this instead of formData.get('couple_id')
```

---

### Finding 1.6 — 🟡 MEDIUM: Realtime subscriptions receive all couple changes without a server-side filter

**Files:** `app/(app)/ledger/LedgerClient.js` line 168–170, `app/(app)/bucket/BucketClient.js` line 129–136, `app/(app)/calendar/CalendarClient.js` line 149–151, `app/(app)/memories/MemoriesClient.js` line 43–45, `app/(app)/dashboard/RealtimeRefresh.js` lines 14–30

All realtime subscriptions use:
```js
{ event: '*', schema: 'public', table: 'expenses' }   // no filter
```

The client-side guard `if (row?.couple_id !== coupleId) return` correctly filters events before processing them. However, the raw payloads (including full row data) are delivered to the client browser before the filter runs. This means that if Supabase's RLS does not block realtime payloads at the channel level, a client could observe `payload.new` or `payload.old` from another couple momentarily.

**Note:** This is mitigated by Supabase RLS policies on realtime. As long as RLS policies are correctly configured to restrict `SELECT` on all relevant tables, the realtime system should not deliver cross-couple data. However, the code provides no defence if RLS is misconfigured.

**Recommendation:** Where Supabase supports it, add server-side realtime filters (e.g., `filter: 'couple_id=eq.' + coupleId`) as defense-in-depth. Verify that Supabase RLS policies include realtime-compatible SELECT restrictions.

---

## Section 2 — Server Action Security

### Authentication Check Coverage

Every server action begins with `await supabase.auth.getUser()` and returns `{ error: 'Not authenticated.' }` if `user` is null. This is correct practice (using the verified `getUser()` call, not the unverified `getSession()`).

### Action-by-Action Analysis

| Action | Auth check | Couple-scope verified server-side | Client-supplied IDs validated |
|---|---|---|---|
| `addExpense` | Yes | Yes — fetches `couple_id` from DB | `currency` and `category` validated against allowlists |
| `bulkSetPaid` | Yes | Yes — `.eq('couple_id', ...)` on update | IDs not individually verified as belonging to couple before use, but the `.eq('couple_id', ...)` filter on the UPDATE enforces it |
| `bulkDeleteExpenses` | Yes | Yes — `.eq('couple_id', ...)` on delete | Same — DB filter covers it |
| `togglePaid` | Yes | Yes — fetches and verifies expense | Correct |
| `addBucketItem` | Yes | Yes — fetches `couple_id` from DB | `category` validated |
| `markAsDone` | Yes | Yes — fetches bucket item scoped to `couple_id` | Correct — name/category read from DB |
| `bulkMarkDone` | Yes | Yes — `.eq('couple_id', ...)` on queries | Correct |
| `bulkUndoDone` | Yes | ✅ Fixed — see Finding 1.3 | Correct |
| `deleteBucketItem` | Yes | ✅ Fixed — see Finding 1.1 | Correct |
| `bulkDeleteBucketItems` | Yes | ✅ Fixed — see Finding 1.2 | Correct |
| `addDirectMemory` | Yes | Yes | `category` validated |
| `bulkDeleteMemories` | Yes | ✅ Fixed — see Finding 1.4 | Correct |
| `addCalendarEntry` | Yes | ✅ Fixed — see Finding 1.5 | `category` validated |
| `markCalendarEntryDone` | Yes | Yes — entry scoped to `profile.couple_id` | Correct |
| `deleteCalendarEntry` | Yes | Yes — entry scoped to `profile.couple_id` | Correct; personal-entry creator check present |
| `createCouple` | Yes | N/A | N/A |
| `joinCouple` | Yes | ✅ Fixed — see Finding 2.1 | Invite code validated for length; self-join check present |
| `saveAnniversaryDate` | Yes | Yes — updates own couple only | ✅ Fixed — date validated and normalised (see Finding 3.2) |
| `updateBaseCurrency` | Yes | Updates own user row only | Validated against `SUPPORTED_CURRENCIES` |
| `updateName` | Yes | Updates own user row only | Empty check only (no length limit) |
| `login` | N/A | N/A | N/A |
| `signup` | N/A | N/A | Name checked for empty only |
| `logout` | N/A | N/A | N/A |

### Finding 2.1 — ✅ FIXED (2026-04-05): `joinCouple` did not check if the user already belongs to a couple

**File:** `app/actions/couple.js`

A user who already has a `couple_id` could call `joinCouple` with a valid invite code and overwrite their `couple_id`, silently abandoning their existing couple space and joining another. This requires a deliberate action by the user themselves — it is not a cross-couple attack — but it could corrupt data (their expenses, bucket items, and memories would remain linked to the old `couple_id` while they now belong to a new couple).

**Fix:** Fetch the user's current profile at the top of `joinCouple` and return an error if `couple_id` is already set:
```js
const { data: currentProfile } = await supabase
  .from('users').select('couple_id').eq('id', user.id).single()
if (currentProfile?.couple_id) return { error: 'You are already in a couple space.' }
```

---

## Section 3 — Input Validation

### Finding 3.1 — ✅ FIXED (2026-04-05): No text field length limits anywhere

**Files:** All server actions

None of the text fields enforce a maximum length server-side. An attacker can submit expense names, bucket item names, memory notes, calendar entry titles, and profile names of arbitrary length.

**Impact:** Very long strings can degrade the UI, cause unexpected layout overflow, and depending on Postgres column configuration, could cause insertion failures (if column has a DB-level limit) or silently truncate data.

**Affected fields:**
- `name` in `addExpense` — no max length
- `notes` in `addExpense` — no max length
- `name` in `addBucketItem` — no max length
- `notes` in `addBucketItem` — no max length
- `note` in `markAsDone` — no max length
- `title` in `addCalendarEntry` — no max length
- `notes` in `addCalendarEntry` — no max length
- `name` in `updateName` — no max length
- `name` in `addDirectMemory` — no max length

**Fix:** Add max-length validation in every action, e.g.:
```js
if (name.length > 200) return { errors: { name: 'Name must be 200 characters or fewer.' } }
```

---

### Finding 3.2 — ✅ FIXED (2026-04-05): `saveAnniversaryDate` performed no date format or range validation

**File:** `app/actions/couple.js`, lines 99–121

```js
export async function saveAnniversaryDate(_, dateString) {
  // ...auth check...
  await supabase
    .from('couples')
    .update({ anniversary_date: dateString })
    .eq('id', profile.couple_id)
```

`dateString` is passed directly from the caller (a client component) to the DB without validating:
- That it is a valid date string (e.g., not `"'; DROP TABLE couples;--"`)
- That it is a date in the past (future anniversary dates make no logical sense)
- That it matches `YYYY-MM-DD` format expected by Postgres

**Note:** Postgres will reject non-date strings with an error, so SQL injection is not possible here. The main risk is storing logically invalid dates (far-future, wrong format) that break the `TogetherCard` display.

**Fix:**
```js
const parsed = new Date(dateString)
if (isNaN(parsed.getTime())) return { error: 'Invalid date.' }
if (parsed > new Date()) return { error: 'Anniversary date must be in the past.' }
// Normalise to YYYY-MM-DD
const normalized = parsed.toISOString().slice(0, 10)
```

---

### Finding 3.3 — ✅ FIXED (2026-04-05): Date fields in `markAsDone`, `addCalendarEntry`, `addDirectMemory`, `markCalendarEntryDone` accepted any string

**Files:** `app/actions/bucket.js` lines 60, 261; `app/actions/calendar.js` lines 16, 75

All completion date and entry date fields are passed through with only an empty check (`if (!date) return...`). No format validation or range check (e.g., future dates for "done" events) is performed.

**Impact:** A `date` value of `"invalid"` would be passed to Postgres, which would throw an error that returns a generic "Could not save" message. However, specially crafted date strings could cause unexpected sorting, display bugs, or edge cases in calendar logic.

**Fix:** Validate with a regex or `Date` parse before use:
```js
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }
```

---

### Finding 3.4 — ✅ FIXED (2026-04-05): `addExpense` accepted dates with no format validation

**File:** `app/actions/expenses.js`, line 21

The `date` field for expenses is not checked to ensure it is in the past or a reasonable range. This allows backdating expenses by arbitrary amounts, or setting far-future dates.

**Note:** This is a data integrity issue more than a strict security vulnerability. There may be legitimate reasons to backdate.

---

### Finding 3.5 — ✅ FIXED (2026-04-05): `bulkSetPaid`, `bulkDeleteExpenses`, `bulkMarkDone`, `bulkDeleteBucketItems`, `bulkDeleteMemories`, `bulkUndoDone` accepted arrays of unbounded size

**Files:** All bulk action files

No maximum array size is enforced. An attacker could call these actions with thousands of IDs, causing:
- Unnecessarily large DB queries
- Potential denial of service via resource exhaustion

**Fix:**
```js
if (ids.length > 500) return { error: 'Too many items selected.' }
```

---

### Finding 3.6 — 🟢 LOW: `signup` does not validate password complexity or minimum length server-side

**File:** `app/actions/auth.js`, lines 26–36

The client-side form has `minLength={6}`, but the server action calls `supabase.auth.signUp()` with no server-side password validation. The 6-character minimum is only enforced by browser-side HTML validation, which can be bypassed.

Supabase auth itself enforces a minimum (typically 6 characters) at the API level, so this returns an error, but the error message would be Supabase's raw message, not a user-friendly one.

**Fix:** Add server-side validation before calling `signUp`:
```js
if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }
```

---

### Finding 3.7 — 🟢 LOW: `signup` does not validate email format server-side

**File:** `app/actions/auth.js`, lines 24–25

Email validation is delegated entirely to the browser `type="email"` input and Supabase auth. The server action applies no regex or format check. Supabase will reject invalid emails, but with a raw error message.

---

## Section 4 — Environment Variables & Secrets

### Finding 4.1 — 🟢 LOW: `OPEN_EXCHANGE_RATES_APP_ID` is correctly server-only

**File:** `lib/exchangeRates.js`, line 9

```js
const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID
```

No `NEXT_PUBLIC_` prefix — correct. This secret is never exposed to the browser bundle.

---

### Finding 4.2 — 🟢 LOW: Supabase anon key is intentionally public but should be confirmed

**Files:** `lib/supabase/client.js`, `lib/supabase/server.js`, `proxy.js`

`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are correctly used as public environment variables. The anon key is designed to be public; security depends on RLS policies being correctly configured. No service role key was found anywhere in the codebase.

**Recommendation:** Confirm that no `.env.local` or production environment variable named `SUPABASE_SERVICE_ROLE_KEY` or similar is used anywhere in the codebase, as using the service role key from client or server components would bypass all RLS.

A `.env.local` file exists at the project root — confirm it contains only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPEN_EXCHANGE_RATES_APP_ID`. It must never be committed to version control.

---

### Finding 4.3 — 🟢 LOW: No hardcoded secrets found in source

A review of all source files found no hardcoded API keys, passwords, tokens, or secrets. All sensitive values are loaded from environment variables.

---

## Section 5 — Authentication & Route Protection

### Finding 5.1 — ✅ FALSE POSITIVE (reviewed 2026-04-05): `proxy.js` does not check for `couple_id`

**File:** `proxy.js`, lines 35–42

This finding was raised without reading `app/(app)/layout.js`. On review, `layout.js` calls `getAppSession()` at line 6, which redirects to `/onboarding` if `couple_id` is null. In Next.js App Router, a layout always runs for every route inside its route group — it cannot be bypassed. All routes inside `(app)/` (ledger, bucket, calendar, memories, profile, dashboard) are already protected centrally by the layout.

The concern that individual pages "might have different behaviours" does not apply because no page inside `(app)/` can render without first passing through `AppLayout`. `ledger/paid/page.js` is inside `(app)/ledger/paid/` and is therefore covered.

Server actions do not go through layouts, but all server actions were independently fixed in this session to enforce `couple_id` scoping.

**No action required.**

---

### Finding 5.2 — 🟢 LOW (downgraded, no action): `proxy.js` does not protect the `/api` route namespace

**File:** `proxy.js`, lines 35–42

There are currently no `/api/` routes in the codebase, making this a purely hypothetical risk. Adding `/api` to `isAppRoute` would also be an incomplete fix — the middleware only checks `!user`, not `couple_id`, so any future route handler would still need its own auth logic regardless. Adding blanket middleware protection could also break legitimate public or webhook endpoints under `/api/` that should not require auth.

**Decision:** No code change. Any future route handler under `/api/` must follow the established pattern: call `getUser()` server-side and verify `couple_id` where needed.

---

### Finding 5.3 — 🟢 LOW: Session expiry mid-use not explicitly handled

If a Supabase session expires while the user is actively using the app, client components performing realtime subscriptions or client-side fetches (e.g., `refetch()` in `LedgerClient.js`) will start receiving auth errors silently. The user will not be redirected to `/login`.

**Recommendation:** Add a global Supabase auth state change listener (e.g., `supabase.auth.onAuthStateChange`) that redirects to `/login` on `SIGNED_OUT`.

---

### Finding 5.4 — 🟢 LOW: `onboarding` is in `isAppRoute` but allows users without a couple

**File:** `proxy.js`, line 42

`/onboarding` is listed as an app route (requires auth), which is correct. The onboarding page server component correctly redirects authenticated users who already have a `couple_id` to `/dashboard`. This behaviour is correct.

---

## Section 6 — Data Exposure

### Finding 6.1 — 🟢 LOW (downgraded, deferred): `select('*')` used in several places where specific columns would suffice

**Files and lines:**

- `app/(app)/ledger/page.js`, line 19: `select('*')` on expenses — passes full expense rows to client including `created_at`, all fields
- `app/(app)/bucket/page.js`, line 12: `select('*')` on bucket_items
- `app/(app)/memories/page.js`, line 11: `select('*')` on memories
- `app/(app)/calendar/page.js`, lines 25, 32: `select('*')` on calendar_entries and memories
- `app/(app)/ledger/LedgerClient.js`, line 154: client-side `select('*')` on expenses
- `app/(app)/memories/MemoriesClient.js`, line 29: client-side `select('*')` on memories
- `app/(app)/calendar/CalendarClient.js`, lines 149, 151: client-side `select('*')`

**Why it matters:** Using `select('*')` returns all columns including any future columns that might be added. It also ensures that fields not needed for display (e.g., internal IDs, timestamps) are transmitted over the wire unnecessarily. More critically, if any column is added to a table in the future that should remain private, `select('*')` would expose it.

**Decision:** Deferred. Every table has a small, well-defined schema and all columns are already used by the UI — there are no hidden sensitive columns being leaked today. The future-column risk is real in principle but low probability in a tightly owned private app. Revisit when the schema stabilises after Phase 5/6.

---

### Finding 6.2 — ℹ️ OBSERVATION (not a finding): User email is passed to client component in `ProfilePage`

**File:** `app/(app)/profile/page.js`, line 16

```js
<ProfileClient name={profile?.name ?? ''} email={user.email} />
```

The user's email is passed as a prop to a client component, meaning it becomes visible in the serialized server component payload and is embedded in the client-side React tree. This is generally expected for a profile page, but note that:
- The email is rendered in the DOM (visible in source)
- It may be captured in browser extensions, analytics, or error tracking tools

**Assessment:** Not a finding. The profile page exists specifically to show the user their own information. Hiding the email from the RSC payload would mean not rendering it, which defeats the purpose of the page. Any authenticated app that displays personal data has this property. No action required.

---

### Finding 6.3 — 🟢 LOW: `currentUserId` and `partnerId` are passed as props to multiple client components

**Files:** `LedgerClient.js`, `BucketClient.js`, `PaidExpensesClient.js`

User UUIDs are passed as React props, making them visible in the browser's React DevTools, the serialized RSC payload, and potentially in error tracking. This is standard practice for Supabase apps (UUIDs are not secrets), but is worth noting.

---

### Finding 6.4 — 🟢 LOW: Error messages from Supabase auth forwarded verbatim to UI

**File:** `app/actions/auth.js`, lines 15, 39

```js
return { error: error.message }
```

`login` and `signup` return raw Supabase auth error messages. These can include information such as "Email not confirmed", "Invalid login credentials", "User already registered", etc. This is a minor information disclosure that could help an attacker enumerate whether an email is registered.

**Recommendation:** For `login`, return a generic "Invalid email or password." message regardless of the specific error.

---

### Finding 6.5 — 🟢 LOW: `profile.js updateName` returns raw Supabase error message

**File:** `app/actions/profile.js`, line 19

```js
if (error) return { error: error.message }
```

Raw DB error messages can leak schema details (table names, constraint names) in unexpected error conditions.

**Fix:** Return `{ error: 'Could not update name. Please try again.' }`.

---

## Section 7 — Dependency Security

### npm audit Results (run 2026-04-05)

```
# npm audit report

brace-expansion  <1.1.13
Severity: moderate
brace-expansion: Zero-step sequence causes process hang and memory exhaustion
Advisory: https://github.com/advisories/GHSA-f886-m6hf-6m8v
fix available via `npm audit fix`
node_modules/brace-expansion

1 moderate severity vulnerability
```

### Finding 7.1 — ✅ FIXED (2026-04-05): `brace-expansion` ReDoS vulnerability

**Severity:** Moderate (npm)
**Advisory:** GHSA-f886-m6hf-6m8v

`brace-expansion` versions below 1.1.13 are vulnerable to a Regular Expression Denial of Service (ReDoS) attack via a zero-step sequence that causes a process hang and memory exhaustion. This package is a transitive dependency (likely via `eslint` or another dev dependency).

**Impact Assessment:** This package is a dev dependency / build-time tool. It would not be present in production Vercel deployments unless used at build time. However, it could affect CI/CD pipelines, local development, or `next build`.

**Fix:** `npm audit fix` — 1 package updated, 0 vulnerabilities remaining.

---

## Top 5 Critical Fixes

### 1. Couple-scope deleteBucketItem
- **Issue:** `deleteBucketItem` has no couple-scope filter — any authenticated user can delete any bucket item by UUID
- **File + Line:** `app/actions/bucket.js`, line 224
- **Fix:** Fetch `profile.couple_id` server-side and add `.eq('couple_id', profile.couple_id)` to the delete query
- **Estimated complexity:** Quick (< 1 hour)

---

### 2. Couple-scope bulkDeleteBucketItems & bulkUndoDone & bulkDeleteMemories
- **Issue:** Three bulk actions lack couple-scope enforcement, allowing cross-couple data manipulation
- **Files + Lines:** `app/actions/bucket.js` lines 238, 172, 307
- **Fix:** Add `profile.couple_id` fetching and scoped queries to all three actions
- **Estimated complexity:** Quick (< 1 hour)

---

### 3. addCalendarEntry uses client-supplied couple_id
- **Issue:** `addCalendarEntry` reads `couple_id` from the client form hidden field and inserts it directly into the DB without server-side verification, allowing a user to inject calendar entries and bucket items into any couple space
- **File + Line:** `app/actions/calendar.js`, lines 19, 35, 49
- **Fix:** Fetch `couple_id` from the database using the authenticated `user.id`, discard the client-supplied value
- **Estimated complexity:** Quick (< 1 hour)

---

### 4. Add text field length limits to all server actions
- **Issue:** No server-side length limits on any text field — name, notes, title, note fields all accept unbounded input
- **Files:** All files in `app/actions/`
- **Fix:** Add `if (field.length > N) return { errors: { field: 'Too long.' } }` guards; recommended limits: name/title 200 chars, notes 1000 chars, note 2000 chars
- **Estimated complexity:** Medium (half day)

---

### 5. Run npm audit fix for brace-expansion ReDoS
- **Issue:** `brace-expansion < 1.1.13` allows ReDoS in build/dev tooling
- **File + Line:** `package.json` (transitive dependency)
- **Fix:** `npm audit fix` at the project root
- **Estimated complexity:** Quick (< 1 hour)

---

*End of audit — 2026-04-05*
