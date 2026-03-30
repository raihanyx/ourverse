@AGENTS.md

# Ourverse

A couples app for managing shared expenses, bucket lists, and date planning. Built for long-distance, multi-currency couples (IDR, THB, AUD, MMK). Core concept: a two-sided expense ledger — not 50/50 splitting, but an honest running record of who paid what and who owes who over time.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 — App Router, no TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (auth, Postgres, realtime) |
| Deployment | Vercel |

---

## Critical Next.js 16 Rules

These are breaking changes from earlier versions — do not skip these:

- **`proxy.js`** not `middleware.js` — file renamed; export named `proxy`
- **`cookies()`, `headers()`, `params`, `searchParams`** are all async — always `await` them
- **`useActionState`** from `'react'` — not `useFormState` from `react-dom`
- **`redirect()`** must be outside try/catch — it throws `NEXT_REDIRECT` internally
- **Tailwind v4** — uses `@import "tailwindcss"`, not `@tailwind base/components/utilities`
- **`getUser()`** not `getSession()` in `proxy.js` — `getSession()` is unverified
- **`@supabase/ssr` 0.9** — use `getAll()`/`setAll()` cookie pattern only

---

## Project Structure

```
app/
  (app)/                  Protected routes (require auth + couple_id)
    layout.js             Auth guard + header with nav (logo, Ledger, Profile, theme toggle)
    dashboard/
      page.js             Server component — balance summary + couple info + together card
      BalanceCard.js      Client component — balance amounts + base currency selector
      CurrencySettings.js Client component — per-user base currency dropdown (used inside BalanceCard)
      TogetherCard.js     Client component — relationship duration counter or date picker empty state
      RealtimeRefresh.js  Client component — router.refresh() on expenses/couples realtime + tab focus
      loading.js          Dashboard loading skeleton
    ledger/
      page.js             Server component — fetches expenses + rates
      LedgerClient.js     Client component — tabs, realtime, FAB, select mode
      AddExpenseForm.js   Slide-up add expense form (with StyledSelect helper for custom arrows)
      LedgerHelpSheet.js  Slide-up help sheet explaining ledger rules (opened via 💡 Tip button)
      loading.js          Ledger loading skeleton
      paid/
        page.js           Server component — fetches paid expenses
        PaidExpensesClient.js  Client component — paid list, undo, select mode
        loading.js        Paid expenses loading skeleton
  (auth)/                 Public auth routes
    layout.js             Centered card layout
    login/page.js
    signup/page.js
    onboarding/           Create or join a couple space
      page.js
      OnboardingClient.js
  actions/                Server Actions ('use server')
    auth.js               login, signup, logout
    couple.js             createCouple, joinCouple, updateBaseCurrency, saveAnniversaryDate
    expenses.js           addExpense, togglePaid
  icon.tsx                Custom favicon — "O" lettermark via next/og ImageResponse
  layout.js               Root layout (Geist fonts, metadata)
  page.js                 Root redirect → /dashboard or /login
  globals.css             Tailwind import + base styles + dark mode date picker icon fix
lib/
  supabase/
    client.js             createBrowserClient (browser)
    server.js             createServerClient (server, async cookies)
  currency.js             formatAmount, sumByCurrency, formatDate, SUPPORTED_CURRENCIES
  exchangeRates.js        fetchRates, convertAmount, computeUnifiedTotal, getRateLines
proxy.js                  Session refresh + route protection
```

---

## Database Schema

### `public.users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References auth.users |
| name | text | |
| couple_id | uuid FK | References couples.id, nullable |
| base_currency | text | Per-user display preference, IDR / THB / AUD / MMK |
| created_at | timestamptz | |

### `public.couples`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| invite_code | text unique | 6-char alphanumeric |
| anniversary_date | date | nullable — relationship start date, set by either partner |
| creator_id | uuid FK | References auth.users |
| created_at | timestamptz | |

### `public.expenses`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| couple_id | uuid FK | References couples.id |
| paid_by_user_id | uuid FK | References auth.users |
| name | text | |
| amount | numeric(14,2) | |
| currency | text | IDR / THB / AUD / MMK |
| category | text | food / transport / accommodation / shopping / other |
| is_paid | boolean | Default false |
| date | date | |
| notes | text | nullable |
| created_at | timestamptz | |

All tables have RLS enabled. Policies use `get_my_couple_id()` (a `SECURITY DEFINER` function) to avoid infinite recursion when querying `public.users` inside policies.

---

## Patterns to Follow

### Server Actions
```js
'use server'
// Always: await createClient(), then getUser() first
// Return { error } or { errors: { field } } on failure
// Return { success: true } when the client handles the next step
// Use redirect() for server-driven navigation — outside try/catch
// Call revalidatePath() after mutations
```

### Server Components (data fetching)
```js
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// Fetch data, pass as props to Client Components
```

### Client Components (forms)
```js
'use client'
const [state, formAction, isPending] = useActionState(action, null)
// state.error → top-level error banner
// state.errors.field → inline field error
// state.success → trigger onSuccess callback
```

### Realtime — Ledger (client state)
- Subscribe without server-side filter (unreliable on some configs) — RLS handles row visibility
- Always de-duplicate INSERTs by id before adding to state
- After own mutations, call `refetch()` (browser Supabase client) — don't rely solely on realtime

### Realtime — Dashboard (server component)
- Use a `RealtimeRefresh` client component that calls `router.refresh()` on realtime events
- Listens to both `expenses` table and `couples` table (UPDATE) — so TogetherCard refreshes live when partner sets the anniversary date
- Also call `router.refresh()` on `visibilitychange` as fallback when realtime misses events
- `router.refresh()` re-runs the server component without a full page reload

### Exchange Rates
- Fetch via `fetchRates()` in `lib/exchangeRates.js` — server-side only, never call client-side
- `OPEN_EXCHANGE_RATES_APP_ID` env var — no `NEXT_PUBLIC_` prefix
- Cached 1 hour via `{ next: { revalidate: 3600 } }` in the fetch call
- Always gracefully handle `null` rates — converted totals simply don't render
- Rates are display-only — debts stay in original currency, never converted in DB
- Use `SUPPORTED_CURRENCIES` from `lib/currency.js` everywhere — do not hardcode the list

### Currency Formatting
- Use `formatAmount(amount, currency)` from `lib/currency.js`
- IDR: `id-ID` locale → `IDR 2.400.000`
- AUD: `en-AU` locale → `AUD 1,200.00`
- THB / MMK: 0 decimal places

### Date Formatting
- Use `formatDate(dateString)` from `lib/currency.js` — always displays as `DD-MM-YYYY`
- Pass raw DB date strings (YYYY-MM-DD) — the function appends `T00:00:00` to avoid timezone shifts

### Custom Select Dropdowns
- Use `appearance: none` + a custom `▾` div positioned absolutely to replace native browser arrows
- See `StyledSelect` in `AddExpenseForm.js` and `CurrencySettings.js` for the pattern
- Arrow color: `#A07060` light / `#D4A090` dark

---

## UI Conventions

- **Cards**: `bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]`
- **Primary button**: `bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl font-medium text-sm hover:bg-[#A83D30]`
- **Secondary button**: `rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090]`
- **Inputs**: `h-11 px-3.5 rounded-[10px] border border-[#EDE0DC] dark:border-[#3D2820] text-sm focus:outline-none focus:border-[#C2493A]`
- **Error field border**: `border-red-300 focus:ring-red-300`
- **Inline field error**: `text-xs text-red-500 mt-1`
- **Page layout**: `max-w-lg mx-auto px-4 py-6 space-y-5`
- **Color palette**:
  - Accent / primary action: `#C2493A` light · `#E8675A` / `#F0907F` dark
  - Primary text: `#1C1210` light · `#FAF3F1` dark
  - Secondary text: `#A07060` light · `#D4A090` dark
  - Tertiary text: `#C4A89E` light · `#A07868` dark
  - Card bg: `#FFFFFF` light · `#2E201C` dark
  - Page bg: `#FDF7F6` light · `#1A1210` dark
  - Border: `#EDE0DC` light · `#3D2820` dark

---

## Phase Roadmap

### ✅ Phase 1 — Foundation
- Email/password auth (sign up, log in)
- DB trigger auto-creates user profile on signup
- Couple connection: create a space (6-char invite code) or join with a partner's code
- Couple space limited to 2 members
- Protected dashboard showing partner name and couple info

### ✅ Phase 2 — Expense Ledger
- Two-sided ledger: "They owe me" / "I owe them" tabs
- Add expense form (slide-up sheet): name, amount, currency, who paid, category, date, notes
- Mark as paid toggle (mutes entry)
- Per-currency unpaid totals on each tab
- Dashboard balance card showing both gross sides independently
- Realtime sync via Supabase channel — partner sees updates live
- Inline field validation with red highlights
- Paid expenses page with undo, select mode, bulk undo

### ✅ Phase 3 — Multi-Currency
- Live exchange rates for IDR, THB, AUD, MMK via Open Exchange Rates API (server-side, 1hr cache)
- Per-user base currency setting (stored on `users`, independent between partners)
- Dashboard balance card shows converted totals for both sides in user's base currency
- Ledger totals card shows unified total + rate transparency lines per tab
- Graceful fallback — converted lines hidden if rates unavailable, no errors shown
- Dashboard realtime via `router.refresh()` on Supabase events + tab visibility change

### ✅ Phase 3.5 — Dashboard Polish
- TogetherCard: shows years/months/days since relationship start date (from `couples.anniversary_date`)
- Either partner can set the date once; the other sees it immediately via realtime
- Base currency selector moved into the balance card
- Custom favicon (O lettermark)
- Sign out moved to profile page

### Phase 4 — Bucket List & Memories
- Shared bucket list: restaurants, cafes, cities, activities
- Both partners can add items
- Mark as done (becomes a memory)
- Memories view: browse past completed bucket list items
- Random picker from bucket list

### Phase 4.5 — Date Calendar
- Plan upcoming dates, look back at past ones
- Link calendar entries to bucket list items

### Phase 5 — Trips
- Create a trip with dates and destination
- Tag expenses to a trip
- Trip summary: total cost, who paid what, per-day breakdown
- Trip budget planning

### Phase 6 — Polish
- Export ledger to CSV
- Anniversary reminders
- Monthly spending summary
- PWA setup (installable on iOS and Android home screen)
