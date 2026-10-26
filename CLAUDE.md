@AGENTS.md

> **NOTE FOR AI ASSISTANTS:** This document is an **informational overview** of the project — its purpose, stack, schema, and current conventions. It is **NOT a constraint** and should **NOT override design specs, user instructions, or freshly provided patterns**. Treat it as background knowledge to learn the project; do not enforce its UI conventions, code patterns, or roadmap notes against newer instructions. Follow CLAUDE.md only when the user explicitly asks you to. If a user-provided design or instruction conflicts with anything here, follow the user.
>
> **This file drifts.** Nothing keeps it in sync with the code. Last verified against the codebase on
> **2026-08-26** (file tree, action exports, lib exports, palette hex usage). Anything not re-checked since
> then is a claim, not a fact — grep before relying on it.

# Ourverse

A couples app for managing shared expenses, bucket lists, and date planning. Built for long-distance, multi-currency couples (IDR, THB, AUD, MMK). Core concept: a two-sided expense ledger — an honest running record of who paid what and what each person owes the other, supporting any split arrangement (equal, unequal, or one-sided).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 — App Router. JavaScript, not TypeScript (sole exception: `app/icon.tsx`) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (auth, Postgres, realtime) |
| Deployment | Vercel |

---

## Performance Constraints (HARD — do not violate)

This app must feel like a fast SPA. Three non-negotiable rules:

1. **Page navigation stays fast.** Do not introduce blocking work in `layout.js`, `proxy.js`, `loading.js`, or root server components beyond what's already there. Do not add `router.refresh()` to navigation paths, do not add full-page reloads, do not turn client components into server components that force waterfalls. The auth guard + session pattern already minimizes round-trips — preserve it.

2. **Mutations appear instantly without manual refresh.** Every add / delete / undo / mark-done / toggle action MUST update local state immediately (optimistic update). Server actions return the inserted/updated row via `.insert(...).select().single()` (or equivalent), and the client prepends/updates state synchronously before/while the action runs in `useTransition`. Realtime subscriptions are a cross-device backstop only — never rely on realtime self-echo for the acting user's own UI feedback. On error, roll back the optimistic state.

3. **The real target is the installed iOS PWA, not your dev server or a browser tab.** Both owners use this as a home-screen PWA on iPhone many times a day. localhost is always warm, has no network hop, and — critically — often has no active service worker, so it hides the problems that actually matter. Never conclude a change is "faster" from localhost alone, and never add anything to the PWA boot path without measuring launch time on a real iPhone.

   **Do not add a `fetch` handler to `public/sw.js`.** Registering one forces the browser to boot the worker before any navigation completes, putting worker startup on the critical path of every page load. Measured on-device: an `event.preloadResponse` await cost 8-10s launches; plain asset caching still cost ~2s and bought nothing, because Next already serves `/_next/static/` as `immutable` and the browser HTTP cache covers it. Removing both took launch from 8-10s to ~3s. Push and notificationclick need no fetch handler.

**Do not:** add `await` chains in server components that block initial render (use `Promise.all`) · add a `refetch()` after a mutation that already returns the row · replace optimistic updates with `router.refresh()` "to be safer" (it re-runs the server component and feels like a page reload) · add loading spinners on actions that should feel instant (the optimistic update IS the feedback) · convert a working client-side flow into a server action redirect for "consistency" · add anything to the service worker that intercepts requests — see rule 3; "it should be faster in theory" was wrong twice here.

**Do:** keep server actions returning `{ success, data }` so clients can prepend rows immediately · wrap network work in `useTransition` · preserve realtime subscriptions for partner-device sync, with id-based de-duplication.

If a future change conflicts with any of these rules, stop and ask the user before proceeding.

**Function region MUST match Supabase (Singapore → `sin1`).** Until 2026-10-26 the Vercel Function Region was the default `iad1` (Washington DC) while Supabase is in ap-southeast-1, so every server-side Supabase call (JWKS, token refresh, page queries) crossed the Pacific — 7-11s cold / ~5s warm launches. It is set in Vercel → Settings → Functions (no `vercel.json`). Verify with the `x-vercel-id` header on an authenticated page: `sin1::sin1::…` — the FIRST segment is only the edge PoP, the SECOND is the function region (the old "sin1 region" note here misread the first segment).

**Known launch-time budget** (measured Aug 2026, iPhone 13/14 Pro Max — while functions were still in iad1, re-measure): ~3s cold PWA launch, of which ~1.1s is Vercel cold start (functions idle out on Hobby; only fixable by keeping them warm, not by code) and the rest is iOS booting WebKit plus hydration. Warm in-app navigation is ~150ms. If launch time regresses well past ~3s, check the function region, then the service worker.

---

## Critical Next.js 16 Rules

Breaking changes from earlier versions — do not skip:

- **`proxy.js`** not `middleware.js` — file renamed; export named `proxy`
- **`cookies()`, `headers()`, `params`, `searchParams`** are all async — always `await` them
- **`useActionState`** from `'react'` — not `useFormState` from `react-dom`
- **`redirect()`** must be outside try/catch — it throws `NEXT_REDIRECT` internally
- **Tailwind v4** — uses `@import "tailwindcss"`, not `@tailwind base/components/utilities`
- **`getClaims()`** in `proxy.js`, via `getVerifiedClaims()` — verifies the JWT signature locally against the cached JWKS. Never `getSession()`: that one is unverified, it only decodes cookies. `getClaims()` still refreshes an expired session internally, so proxy.js keeps forwarding cookies.
- **`@supabase/ssr` 0.9** — use `getAll()`/`setAll()` cookie pattern only

---

## Project Structure

```
app/
  (app)/                  Protected routes (require auth + couple_id)
    layout.js             Auth guard (getAuthUser only — renders no user data) + sticky header + NavLinks
    NavLinks.js           Client — fixed bottom tab bar (Home, Ledger, Bucket, Calendar, Profile)
    dashboard/
      page.js             Server — balance summary + couple info + together card + daily conversation
      BalanceCard.js      Client — balance amounts; renders in the `baseCurrency` prop (no selector; moved to profile)
      CurrencySettings.js ORPHANED — nothing imports this. Currency picker now lives in profile/ProfileClient.js.
      InviteCodeBadge.js  Client — displays + copies invite code
      TogetherCard.js     Client — relationship duration counter, or date picker empty state
      RecentExpenses.js   Recent expense strip with category-tinted boxes
      DailyConversation.js  Async server component + `DailyConversationFallback` skeleton — rendered inside
                            <Suspense> so the page's slowest query streams instead of blocking the shell
      DailyConversationSection.js  Client wrapper — orchestrates card / answer / results states
      DailyConversationCard.js     Question card + streak + countdown to next local midnight
      DailyConversationAnswer.js   Answer composer (partner's answer hidden until both submit)
      DailyConversationResults.js  Both answers revealed side by side
      RealtimeRefresh.js  Client — router.refresh() on expenses/couples realtime + tab focus
      loading.js          Dashboard skeleton
    ledger/
      page.js             Server — fetches expenses + rates
      LedgerClient.js     Client — tabs, realtime, header Add button, select mode, detail/edit sheets
      AddExpenseForm.js   Slide-up add form (uses StyledSelect for custom arrows)
      EditExpenseForm.js  Slide-up edit form — prefilled; amount + currency disabled once is_paid
      ExpenseSheet.js     Reusable sheet shell (grabber, title row, close X) for detail/edit
      ExpenseDetailSheet.js  Read-only detail — amount hero, status/paid-by/category/date rows, full notes,
                             actions (Delete · Mark paid|Undo · Edit)
      LedgerHelpSheet.js  Help sheet explaining ledger rules (opened via Tip button)
      loading.js          Ledger skeleton
      paid/               page.js (server, paid expenses) · PaidExpensesClient.js (paid list, undo, select
                          mode, bulk delete, back link to /ledger, same detail/edit sheets) · loading.js
    bucket/
      page.js             Server — bucket items + memories count + recent memories + linked calendar dates
      BucketClient.js     Client (V2) — header (Info/Edit/+Add icons), filter pills, Memories link card,
                          section rule + Pick-for-us button, 2-col WishCard grid (category-tinted,
                          dot/checkbox + label + optional date pill, dark inset panel, "Done" button),
                          pick-for-us modal w/ rolling animation, memories strip, edit-mode bulk bar (Delete)
      AddBucketForm.js    V2 sheet — title + category chips (5 cats, default activity) + notes + coral CTA
      BucketHelpSheet.js  V2 TipSheet — 5 sections, **bold** coral accents, callouts §2/§4, "Got it" CTA
      MarkDoneSheet.js    V2 sheet — category-tinted summary, optional early-date callout, date, note, CTA
      loading.js          Bucket skeleton
    shopping/
      page.js             Server — open items (unbounded) + bought items (limit 20), one Promise.all,
                          merged into ONE array; client splits on is_bought
      ShoppingClient.js   Client — single-column checklist (not a card grid). Always-visible inline add
                          input (no sheet — one field, and it keeps focus so several items go in a row)
                          with a LIVE hint underneath: matches what you type against loaded rows and warns
                          "already on the list" (hard block) or "{who} bought this {when}" within
                          RECENT_BUY_DAYS (advisory — an "Add anyway" button waves it through). Every row
                          carries a relative added/bought stamp + who; labels are coarse (just now / Xh /
                          Xd / DD-MM-YYYY) and recompute on `visibilitychange`, NEVER on an interval.
                          Tap-row-to-tick w/ a 6s Undo toast; collapsed "Bought" disclosure (tap an entry
                          to re-add it as a NEW row) + Clear; select mode + bulk Delete; realtime.
                          Bought is a flat log — one row per purchase, newest first, NOT grouped by name.
                          Buying the same thing twice shows two entries; they read as separate trips
                          rather than as duplicates because each row carries BOTH stamps:
                          `added {rel} → bought {rel} · {buyer}` (the adder is named too, but only when
                          they are not also the buyer, otherwise the line stutters). A grouped
                          "bought N×" variant was tried and removed — it hid the individual dates, which
                          are the whole point.
      ShoppingHelpSheet.js  V2 TipSheet — 4 sections, callouts §2/§3
      loading.js          Shopping skeleton
    memories/
      page.js             Server — fetches memories
      MemoriesClient.js   Client (V2) — header w/ back chevron + Tip + Edit + Add, 2-col MemoryCard grid
                          (italic quoted note, right-aligned date footer w/ check icon), bulk bar
                          (Delete + Move to bucket)
      AddMemoryForm.js    V2 LogMemorySheet — title + category chips (default other) + native date input
                          (color-scheme follows theme) + optional note + "Log memory" CTA
      MemoriesHelpSheet.js V2 TipSheet — 3 sections (What shows up, Move to bucket, Delete) + callouts
      loading.js          Memories skeleton
    calendar/
      page.js             Server — calendar_entries + memories for current month + couple anniversary_date
      CalendarClient.js   Client — month grid, day detail panel, animated month nav, realtime sync
      AddCalendarEntryForm.js  Slide-up — title, date, category, notes, personal/couple toggle; couple
                               entries auto-create a linked bucket_item
      AddMemoryForm.js         Slide-up — log a memory directly from calendar (uses addDirectMemory)
      CalendarMarkDoneSheet.js Slide-up — mark entry done, pick completion date, creates memory + updates
                               bucket_item
      CalendarHelpSheet.js     Help sheet explaining calendar rules
      loading.js               Calendar skeleton
    profile/
      page.js             Server — profile + couple anniversary, computes duration string, passes
                          { name, email, partnerName, inviteCode, duration, baseCurrency } to ProfileClient
      ProfileClient.js    Client — the whole settings surface: local SlideSheet/SectionLabel/ProfileRow
                          helpers, inline name edit, base currency sheet, invite share, push toggle
                          (subscribe/unsubscribe + permission state), and the sign out form
      loading.js          Profile skeleton
  (auth)/                 Public auth routes — layout.js (centered card) · login/ · signup/ ·
                          onboarding/ (page.js + OnboardingClient.js — create or join a couple space)
  actions/                Server Actions ('use server')
    auth.js               login, signup, logout
    couple.js             createCouple, joinCouple, updateBaseCurrency, saveAnniversaryDate
    expenses.js           addExpense, updateExpense, togglePaid (uses `toggle_expense_paid` RPC — atomic
                          single round-trip), bulkSetPaid, bulkDeleteExpenses
    daily.js              getOrCreateDailyConversation (thin wrapper over loadDailyConversation),
                          submitAnswer (streak bookkeeping + partner push)
    push.js               savePushSubscription, deletePushSubscription
    bucket.js             addBucketItem, markAsDone, bulkUndoDone, deleteBucketItem,
                          bulkDeleteBucketItems, addDirectMemory, bulkDeleteMemories
    shopping.js           addShoppingItem (case-insensitive dedupe against OPEN rows only — a bought
                          row is history and is never reused), setShoppingItemBought (true = tick off,
                          false = undo a mistap; silent both ways), bulkDeleteShoppingItems,
                          clearBoughtItems
    calendar.js           addCalendarEntry, markCalendarEntryDone, deleteCalendarEntry (personal entries
                          deletable only by creator; couple entries by either partner)
    profile.js            updateName
  components/
    PageTransition.js     Fade-in wrapper used on all protected pages
    PullToRefresh.js      Pull-to-refresh gesture — mounted once in the root layout
    ConfirmSheet.js       Slide-up confirm dialog (message, confirmLabel, onConfirm, onCancel) — used for
                          bulk deletes across ledger, paid expenses, bucket, memories, shopping
    FieldError.js         Inline field error — `<p>` in accent red if message set, else null
    StyledSelect.js       Custom select wrapper — `appearance: none` + absolute `▾` arrow div
  ThemeProvider.js        Client context — dark/light theme, persisted to localStorage
  icon.tsx                Custom favicon — "O" lettermark via next/og ImageResponse
  manifest.js             PWA manifest route — standalone display, start_url /dashboard, icons
  layout.js               Root layout (Geist Sans, metadata, iOS splash links, Supabase preconnect,
                          theme-init script, ThemeProvider, PullToRefresh)
  loading.js              Root loading — full-screen centered spinner
  page.js                 Root redirect → /dashboard or /login
  globals.css             Tailwind import + base styles + dark mode date picker icon fix
lib/
  supabase/
    client.js             createBrowserClient (browser)
    server.js             createServerClient (server, async cookies)
    jwks.js               Module-scope JWKS cache + `getVerifiedClaims()` / `claimsToUser()`. Auth is
                          verified LOCALLY (ES256, WebCrypto) — no Auth-server round-trip. The cache is
                          load-bearing: supabase-js caches JWKS per client instance and we build one client
                          per request, so without it getClaims() refetches the key set every request.
  data/
    getAppSession.js      `getAuthUser()` — React-cached, auth ONLY (verified user + couple_id from auth
                          metadata, no users-table query); redirects to /login. `getAppSession()` — full
                          { user, profile, partner }, for pages with no other data to fetch.
                          `coupleMembersQuery()` / `splitMembers()` / `resolveCoupleId()` — let a page fold
                          its profile/partner lookup into its OWN Promise.all instead of paying a serial
                          round-trip. Pages that fetch data should prefer the latter.
    getDailyConversation.js  `loadDailyConversation(ctx, localDate)` — takes an already-resolved
                          { supabase, user, coupleId }. Server components import this directly.
    userToday.js          Server-only. The user's "today" from the `tz` cookie (written by the theme-init
                          script in app/layout.js). `userTodayISO()` for display/loading, `latestAllowedDateISO()`
                          for "cannot be in the future" checks. Servers run in UTC — never use `new Date()` on
                          the server as the user's date (UTC+7 is a day ahead from 00:00 to 07:00).
    getActionContext.js   Server action helper — { supabase, user, coupleId } or { error }; couple_id from
                          auth metadata (fast path) with DB fallback. Use in all server actions.
  constants.js            EXPENSE_CATEGORY_COLORS/LABELS, BUCKET_CATEGORY_COLORS/LABELS
  currency.js             formatAmount, sumByCurrency, formatDate, todayISO, SUPPORTED_CURRENCIES
  exchangeRates.js        fetchRates, convertAmount, computeUnifiedTotal, getRateLines
  questions.js            Question bank + pickQuestion(coupleId, date) — deterministic per couple/day
  push/
    client.js             isPushSupported, getRegistration, getCurrentSubscription, subscribeToPush,
                          unsubscribeFromPush, serializeSubscription
    send.js               sendPushToUser, notifyPartner (partner-only fan-out)
proxy.js                  Session refresh + route protection
public/sw.js              Push + notificationclick ONLY. NO `fetch` handler — see Performance rule 3.
migrations/               Hand-run SQL — apply in the Supabase SQL editor
  push_subscriptions.sql  Table + RLS policies
docs/audits/              Point-in-time audit write-ups (security, performance, ledger, bugs)
```

---

## Database Schema

All tables have RLS enabled. Policies use `get_my_couple_id()` (a `SECURITY DEFINER` function) to avoid infinite recursion when querying `public.users` inside policies. All have `id uuid PK` and `created_at timestamptz` unless noted.

**`users`** — `name` text · `couple_id` uuid FK→couples.id, nullable · `base_currency` text (IDR/THB/AUD/MMK, per-user display preference). `id` references auth.users.

**`couples`** — `invite_code` text unique (6-char alphanumeric) · `anniversary_date` date, nullable (relationship start, set by either partner) · `streak` int (consecutive days both answered the daily conversation) · `last_completed_date` date, nullable (last date *both* answered; drives streak continuation) · `last_any_answer_date` date, nullable (last date *either* answered) · `creator_id` uuid FK→auth.users.

**`expenses`** — `couple_id` FK · `paid_by_user_id` uuid FK→auth.users · `name` text · `amount` numeric(14,2) · `currency` text (IDR/THB/AUD/MMK) · `category` text (food/transport/accommodation/shopping/other) · `is_paid` bool default false · `date` date · `notes` text nullable.

**`bucket_items`** — `couple_id` FK · `added_by_user_id` uuid FK→auth.users · `name` text · `category` text (restaurant/travel/activity/movie/other) · `notes` text nullable · `is_done` bool default false (true when marked as a memory).

**`shopping_items`** — `couple_id` FK · `added_by_user_id` uuid FK→auth.users · `name` text · `is_bought` bool default false · `bought_at` timestamptz nullable · `bought_by_user_id` uuid FK→auth.users nullable · `sort_at` timestamptz (open-list sort key; set on insert and never changed after) · `created_at` (the "added" date shown in the UI). **Bought rows are permanent history and are never revived** — buying something again inserts a NEW row, so `bought_at` is never nulled out by a later purchase and "we bought this three times" stays on the record. The one exception is undoing a mistap within the toast window, which clears `is_bought`/`bought_at` because the purchase never really happened. Fully shared — all four RLS policies are `couple_id = get_my_couple_id()`, so either partner can add, tick off, undo, or delete. Migration: `migrations/shopping_items.sql`.

**`memories`** — `couple_id` FK · `bucket_item_id` FK→bucket_items.id, nullable (null for memories from personal calendar entries) · `name` text (copied from bucket item or entry title at mark-done) · `category` text (copied likewise) · `date` date (when it was done, user-selected) · `note` text nullable.

**`calendar_entries`** — `couple_id` FK · `user_id` uuid FK→auth.users (creator) · `bucket_item_id` FK→bucket_items.id, nullable (set for couple entries) · `title` text · `date` date (display date; moves to completion date when marked done) · `original_date` date (planned date, unchanged after mark-done) · `category` text (restaurant/travel/activity/movie/other) · `notes` text nullable · `is_personal` bool default false (visible to creator only).

**`daily_conversations`** — `couple_id` FK · `date` date, unique with couple_id (one question per couple per day) · `question` text (snapshot of the picked question). Created via upsert with `onConflict: 'couple_id,date', ignoreDuplicates: true` so both partners can open the dashboard simultaneously without racing.

**`daily_answers`** — `conversation_id` FK→daily_conversations.id · `couple_id` FK · `user_id` uuid FK→auth.users · `text` text · `answered_at` timestamptz. One answer per user per conversation — `submitAnswer` checks for an existing row and returns `{ error: 'Already answered' }`.

**`push_subscriptions`** — `user_id` uuid FK→auth.users on delete cascade · `couple_id` FK (required for the partner-read policy) · `endpoint` text unique (upserted `onConflict: 'endpoint'`) · `p256dh` text · `auth` text · `user_agent` text nullable. One row per device/browser. RLS: select allowed for own rows *and* same-couple rows (partners must read each other's endpoints to send); insert/update/delete restricted to `user_id = auth.uid()`.

---

## Patterns to Follow

### Server Actions
```js
'use server'
import { getActionContext } from '@/lib/data/getActionContext'
// Always call getActionContext() first — { supabase, user, coupleId } or { error }
const { supabase, user, coupleId, error } = await getActionContext()
if (error) return { error }
// Return { error } or { errors: { field } } on failure; { success: true } when the client continues.
// redirect() for server-driven navigation — outside try/catch. revalidatePath() after mutations.
```

### Server Components (data fetching)
```js
import { getAuthUser, resolveCoupleId, coupleMembersQuery, splitMembers } from '@/lib/data/getAppSession'
// Pages that fetch their own data: auth first, then ONE parallel batch.
const { supabase, user, coupleId: meta } = await getAuthUser()
const coupleId = await resolveCoupleId(meta)
const [{ data: members }, ...rest] = await Promise.all([coupleMembersQuery(supabase, coupleId), /* ... */])
const { profile, partner } = splitMembers(members, user.id)
// Pages with no other data to fetch may just use getAppSession().
```

### Client Components (forms)
```js
'use client'
const [state, formAction, isPending] = useActionState(action, null)
// state.error → top-level banner · state.errors.field → inline error · state.success → onSuccess callback
```

### Realtime — Ledger / Bucket (client state)
Subscribe without server-side filter (unreliable on some configs — RLS handles row visibility) · always de-duplicate INSERTs by id before adding to state · after own mutations call `refetch()` (browser Supabase client) rather than relying solely on realtime.

### Realtime — Dashboard (server component)
Use a `RealtimeRefresh` client component calling `router.refresh()` on realtime events · listens to both `expenses` and `couples` (UPDATE) so TogetherCard refreshes live when a partner sets the anniversary date · also `router.refresh()` on `visibilitychange` as a fallback when realtime misses events · `router.refresh()` re-runs the server component without a full page reload.

### Push Notifications
- **Env vars**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. If any is missing, `lib/push/send.js` logs `[push] VAPID env vars missing; skipping send` and no-ops — sends *look* fine but nothing is delivered.
- **Always notify via `notifyPartner(supabase, actorUserId, coupleId, buildPayload)`** — it resolves the couple's other member and hard-guards against pushing to the actor. Never call `sendPushToUser` directly for couple events; that's the low-level primitive. `notifyPartner` never throws (whole body try/caught), so a push failure can't fail the mutation.
- **Send inside `after()` from `next/server`**, not inline. A web-push round-trip is ~200–500ms; awaiting it inside a server action puts that latency in front of the mutation's response, breaking the "mutations appear instantly" rule. Cookie reads work inside `after` in Server Functions, and `lib/supabase/server.js` try/catches `setAll`, so reusing the request's Supabase client is safe.
- **Current triggers** (all partner-only): `addExpense` → `"{actor} added {name} · {amount}"`, deep-links `/ledger` · `submitAnswer` → `"{actor} answered today's daily conversation"`, deep-links `/dashboard` · `addShoppingItem` and `setShoppingItemBought(id, false)` → `"{actor} added {name} to the shopping list"`, deep-links `/shopping`. Ticking an item *off* deliberately sends nothing — a full shop would be a pile of pings.
- **Stale endpoint pruning** goes through the `prune_push_subscriptions(uuid[])` RPC, *not* a direct delete — the sender doesn't own the recipient's rows and the delete policy is `user_id = auth.uid()`, so a direct delete silently no-ops. The RPC is `SECURITY DEFINER`, pinned `search_path`, scoped to `couple_id = get_my_couple_id()`, execute revoked from `anon`. It lives only in the database (no migration file), so read the definition from Supabase before changing it.
- **Subscriptions are origin-scoped** — a `localhost:3000` subscription is unreachable from production and vice versa; each device re-subscribes per origin. **iOS requires the PWA installed** to the home screen; push in a plain Safari tab is silently dropped even when the toggle succeeds.

### Exchange Rates
Fetch via `fetchRates()` in `lib/exchangeRates.js` — server-side only, never client-side · `OPEN_EXCHANGE_RATES_APP_ID` env var, no `NEXT_PUBLIC_` prefix · cached 1 hour via `{ next: { revalidate: 3600 } }` · always handle `null` rates gracefully (converted totals simply don't render) · rates are display-only, debts stay in original currency and are never converted in the DB · use `SUPPORTED_CURRENCIES` from `lib/currency.js`, never hardcode the list.

### Formatting & Shared Helpers
- **Currency**: `formatAmount(amount, currency)` from `lib/currency.js`. IDR → `id-ID` locale (`IDR 2.400.000`) · AUD → `en-AU` (`AUD 1,200.00`) · THB/MMK → 0 decimals.
- **Dates**: `formatDate(dateString)` from `lib/currency.js` — always `DD-MM-YYYY`. Pass raw DB date strings (YYYY-MM-DD); it appends `T00:00:00` to avoid timezone shifts.
- **Today (ISO)**: client side, `todayISO()` from `lib/currency.js` — `YYYY-MM-DD` in the device's timezone. Use as `defaultValue` and as `max` to prevent future dates. Server side (actions, server components), use `lib/data/userToday.js` instead — `todayISO()` there returns the UTC date.
- **Selects**: use the shared `StyledSelect` (`app/components/StyledSelect.js`) — `appearance: none` + absolutely positioned `▾`. Arrow color `#A07060` light / `#D4A090` dark.
- **Categories**: use `BUCKET_CATEGORY_COLORS` / `BUCKET_CATEGORY_LABELS` and `EXPENSE_CATEGORY_COLORS` / `EXPENSE_CATEGORY_LABELS` from `lib/constants.js` — do not inline category color classes.

---

## UI Conventions

- **Cards**: `bg-white dark:bg-[#2E201C] rounded-2xl border border-[#ECDFD2] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none`
- **Slide-up sheet body**: `bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto`
- **Primary button**: `bg-[#D8513E] dark:bg-[#E8675A] hover:bg-[#C04830] dark:hover:bg-[#D45849] text-white rounded-xl font-semibold text-sm cursor-pointer`
- **Secondary button**: `rounded-xl border border-[#ECDFD2] dark:border-[#3D2820] text-sm text-[#7A5C4E] dark:text-[#D4A090] cursor-pointer`
- **Inputs**: `h-11 px-3.5 rounded-[10px] border border-[#ECDFD2] dark:border-[#3D2820] text-sm focus:outline-none transition-colors` · error border `border-red-300 focus:ring-red-300` · inline error `text-xs text-red-500 mt-1`
- **Page layout**: `max-w-lg mx-auto px-4 py-6 space-y-5`
- **All interactive buttons** must have `cursor-pointer` — do not rely on browser defaults
- **Slide-up overlays** use `z-30` — the bottom nav is `z-20`; `z-20` on an overlay lets the nav paint on top
- **Bottom nav**: `fixed bottom-0 z-20 h-16` — main content uses `pb-24` to clear it
- **Bulk action bars** (select mode — paid expenses, bucket, memories): outer `position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; paddingBottom: env(safe-area-inset-bottom)`. Inner `max-w-lg mx-auto` with `padding: '0 12px 80px'` (80px clears the tab bar). Floating pill: `background: #321E1A`, `border: 1px solid #3A2418`, `borderRadius: 16`, `boxShadow: 0 10px 30px rgba(0,0,0,0.55)`. Two states — empty: "Tap items to select" + small Done button; with selection: "{n} selected" + action buttons (32px tall, radius 9). The older `h-16` matched-to-nav approach is deprecated.
- **Hiding without layout shift** — use `invisible` (not conditional rendering) when an element should keep its space (e.g. back links during select mode)
- **Disabled nav tabs** — add `disabled: true` to the tab config; render as `<Link href="#">` with `pointer-events-none opacity-30`; never render a different element type (e.g. `<span>`) in the same map — causes hydration mismatch
- **Theme init script** — `<Script id="theme-init" strategy="beforeInteractive">` from `next/script`, not a bare `<script>` tag — React 19 does not execute bare script tags in components
- **Color palette** (V2 — verified against actual usage counts in `app/`; pre-V2 values `#C2493A`, `#EDE0DC`, `#FDF7F6`, `#A07060` are retired and appear at most once each):
  - Accent / primary action `#D8513E` light · `#E8675A` dark (`#F0907F` for accent *text* on dark) — hover `#C04830` / `#D45849`
  - Text: primary `#221714` / `#FAF3F1` · secondary `#7A5848`,`#7A5C4E` / `#C89080`,`#D4A090` · tertiary `#B19A8B` / `#A07868`
  - Card bg `#FFFFFF` / `#2E201C` (sheets `#2A1C18`) · page bg `#F8F2EB` / `#1A1210` · border `#ECDFD2` / `#3D2820` (`#3A2418` on dark floating pills / insets)
  - Category tints: never inline them — they are full Tailwind class strings in `lib/constants.js`, each bundling bg + text for light and dark

---

## Phase Roadmap

**✅ Phase 1 — Foundation.** Email/password auth (sign up, log in) · DB trigger auto-creates user profile on signup · couple connection: create a space (6-char invite code) or join with a partner's code · space limited to 2 members · protected dashboard showing partner name and couple info.

**✅ Phase 2 — Expense Ledger.** Two-sided ledger ("They owe me" / "I owe them" tabs) · add expense sheet (name, amount, currency, who paid, category, date, notes) · mark-as-paid toggle (mutes entry) · per-currency unpaid totals per tab · dashboard balance card showing both gross sides independently · realtime sync via Supabase channel · inline field validation with red highlights · paid expenses page with undo, select mode, bulk undo.

**✅ Phase 3 — Multi-Currency.** Live rates for IDR/THB/AUD/MMK via Open Exchange Rates (server-side, 1hr cache) · per-user base currency on `users`, independent between partners · dashboard balance card shows converted totals for both sides · ledger totals card shows unified total + rate transparency lines per tab · graceful fallback (converted lines hidden if rates unavailable, no errors shown) · dashboard realtime via `router.refresh()` on Supabase events + tab visibility change.

**✅ Phase 3.5 — Dashboard Polish.** TogetherCard showing years/months/days since `couples.anniversary_date` · either partner can set the date once, the other sees it immediately via realtime · base currency selector moved into the balance card — *superseded*: it now lives in `profile/ProfileClient.js` as a slide-up sheet, and `BalanceCard` only consumes the `baseCurrency` prop · custom favicon (O lettermark) · sign out moved to profile (rendered inside `ProfileClient.js`, not `profile/page.js`).

**✅ Phase 4 — Bucket List & Memories.** Shared bucket list (restaurants, cafes, cities, activities, movies), both partners add, realtime sync · mark as done with a date → creates a memory · memories view: 2-col MemoryCard grid (italic note + right-aligned date footer), select mode w/ Delete + Move to bucket · random picker filterable by category — Pick-for-us modal with rolling animation, "Pick again" / "Let's do it" · bulk delete with ConfirmSheet on all pages · mixed-selection guard on ledger (selecting both paid and unpaid hides action buttons, shows a warning) · memories link card on bucket page showing count · **V2 visual redesign** (dark palette `#1A1210`/`#2A1C18`/`#E8675A`, category-tinted cards, V2 TipSheets w/ **bold** coral inline accents).

**✅ Phase 4.5 — Date Calendar.** Monthly grid with day-level detail panel and animated month navigation · add entries (title, date, category, notes, personal or couple toggle) · couple entries auto-create a linked bucket_item so they appear in the bucket list · mark done: pick completion date → creates a memory + marks linked bucket_item done · delete entry also removes the linked bucket_item if not yet done · memories for the viewed month surface alongside planned entries · anniversary date highlighted if set · realtime sync for partner's entries · personal entries visible only to the creator (RLS-enforced).

**✅ Phase 4.8 — Daily Conversations.** One shared question per couple per day, picked deterministically from `lib/questions.js` by `(coupleId, date)` · partner's answer hidden until both have answered, then both reveal together · streak counter on `couples`, incrementing when both answer on consecutive days · countdown to next local midnight on the dashboard card.

**✅ Phase 4.9 — PWA & Push Notifications.** Installable PWA (`app/manifest.js`, standalone display, iOS splash assets) · pull-to-refresh mounted in the root layout · web push via VAPID with per-device subscriptions in `push_subscriptions`, toggle in /profile · partner-only notifications on new expenses and daily conversation answers · service worker handles push display + notification click routing.

**✅ Phase 4.95 — Ledger Item Detail & Edit.** Tap any ledger or settled row to open a detail sheet (surfaces notes, which had no other UI) · edit from the detail sheet, or from select mode when exactly one item is selected · amount and currency freeze once an expense is settled, enforced server-side and not just disabled in the UI · same flows on both /ledger and /ledger/paid.

**✅ Phase 4.96 — Shopping List.** Shared always-open list of things to buy at `/shopping`, its own (6th) bottom-nav tab · name-only items, added from an always-visible inline input that keeps focus for rapid entry · tap a row to tick it off, with a 6s Undo toast (one tap was too easy to trigger by accident, but adding friction to the correct path was the wrong trade) · **Bought is permanent history**: buying something again inserts a new row rather than reviving the old one, so purchase dates survive · every row shows both stamps (added, and for bought rows the purchase too) plus who did it, recomputed on focus rather than on a timer · Bought is a flat per-purchase log, deliberately not grouped by name · the add input warns live before you commit — hard block if it is already on the list, advisory "{who} bought this {when}" within `RECENT_BUY_DAYS` with an Add-anyway override · partner push on add only; tick-off and undo are silent · select mode + bulk delete, Clear for the Bought section · fully shared RLS.

**Phase 5 — Trips.** Create a trip with dates and destination · tag expenses to a trip · trip summary (total cost, who paid what, per-day breakdown) · trip budget planning.

**Phase 6 — Polish.** Export ledger to CSV · anniversary reminders · monthly spending summary.
