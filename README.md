# Ourverse

A shared space for couples to track expenses, plan dates, build a bucket list, and log memories together.

Built for long-distance, multi-currency couples (IDR, THB, AUD, MMK). The core concept is a **two-sided expense ledger**: an honest, running record of who paid what and what each person owes the other, without forcing a 50/50 split.

---

## Features

### Expense Ledger
- Two-sided view: *They owe me* and *I owe them*, each side tracked independently
- Add expenses with name, amount, currency, category, date, and notes
- Mark expenses as paid; settled entries are archived, not deleted
- Bulk mark paid, bulk delete from the paid archive
- Per-currency unpaid totals on each tab
- Unified converted total in your base currency (via live exchange rates)
- Realtime sync so your partner sees updates instantly

### Multi-Currency Support
- Supports IDR, THB, AUD, and MMK
- Live exchange rates via Open Exchange Rates API (server-side, cached 1 hour)
- Each partner sets their own base currency independently
- Rates are for display only; debts stay in their original currency

### Bucket List
- Shared list of places to eat, trips to take, activities, movies, and more
- Both partners can add and manage items
- Random picker: can't decide? Let it pick for you (filterable by category)
- Mark items as done with a date and note → becomes a memory
- Bulk mark done, bulk delete

### Memories
- Every completed bucket list item becomes a memory with a date
- Browse your shared history
- Log a memory directly without going through the bucket list
- Undo done to restore a memory back to an active bucket item

### Date Calendar
- Monthly calendar grid with animated month navigation
- Add couple entries (visible to both) or personal entries (visible only to you)
- Couple entries auto-create a linked bucket list item
- Mark an entry as done: pick the completion date → logs a memory
- Memories for the viewed month surface alongside planned entries
- Anniversary date highlighted on the grid
- Realtime sync with your partner

### Dashboard
- Balance summary showing what each side owes, converted to your base currency
- "Together since" card with days, months, and years since your relationship start date
- Invite code to connect with your partner

### Profile
- Edit your display name
- Set your base currency
- Sign out

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript (no TypeScript) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (auth, Postgres, realtime) |
| Exchange Rates | Open Exchange Rates API |
| Deployment | Vercel |

---

## Architecture

The app uses Next.js App Router with a clean split between server and client:

- **Server components** handle all data fetching with no client-side API calls for initial loads
- **Server actions** handle all mutations; form submissions go directly to the server
- **Client components** manage realtime subscriptions, local UI state, and interactivity
- **Supabase RLS** (Row Level Security) enforces data isolation at the database level; each couple's data is inaccessible to anyone else
- **Two shared helpers** keep auth consistent across the app:
  - `getAppSession()`: for server components, returns the current user + profile + partner
  - `getActionContext()`: for server actions, returns the Supabase client + user + couple ID

---

## Database

Six tables, all with RLS enabled:

- `users` — profile, base currency preference, couple link
- `couples` — invite code, anniversary date
- `expenses` — amount, currency, category, who paid, paid status
- `bucket_items` — shared wishlist items with category and done status
- `memories` — completed bucket items with date and note
- `calendar_entries` — planned dates, personal or shared, linked to bucket items

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Open Exchange Rates](https://openexchangerates.org) API key (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/your-username/ourverse.git
cd ourverse
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPEN_EXCHANGE_RATES_APP_ID=your_open_exchange_rates_app_id
```

### 3. Set up the database

In your Supabase project, create the following tables with RLS enabled. The schema mirrors the structure described in the [Architecture](#architecture) section above. You will also need:

- A `get_my_couple_id()` function (SECURITY DEFINER) to support RLS policies without infinite recursion
- A `toggle_expense_paid(p_expense_id, p_couple_id)` function for atomic paid-status toggling
- A DB trigger on `auth.users` to auto-create a row in `public.users` on signup

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  (app)/          Protected routes: dashboard, ledger, bucket, memories, calendar, profile
  (auth)/         Public routes: login, signup, onboarding
  actions/        Server actions for all mutations
  components/     Shared UI components
lib/
  supabase/       Browser and server Supabase clients
  data/           getAppSession, getActionContext (shared auth helpers)
  currency.js     Format amounts, dates, currency utilities
  exchangeRates.js  Fetch and convert live exchange rates
  constants.js    Category color/label maps
proxy.js          Session refresh and route protection (Next.js 16 middleware)
```

---

## Roadmap

- [x] Auth + couple connection
- [x] Two-sided expense ledger
- [x] Multi-currency with live exchange rates
- [x] Dashboard polish: anniversary counter, base currency selector
- [x] Bucket list + memories
- [x] Date calendar
- [ ] Trips: tag expenses to a trip, trip cost summary
- [ ] Export ledger to CSV
- [ ] PWA: installable on iOS and Android
