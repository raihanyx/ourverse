# PWA Launch Performance — Diagnosis & Fix Plan (2026-10-28)

Record of the long-running "app takes forever to open" problem: what was tried, what the
on-device measurements showed, and the ranked list of remaining fixes. Update the **Status**
column in [§6](#6-fix-plan) as fixes land, and add new measurement rounds to [§5](#5-measurements).

---

## 1. TL;DR

- **Symptom:** installed iOS PWA took **7–11s** to open after not being used for a while,
  **~5s** even when used recently.
- **Root cause #1 (FIXED 2026-10-26):** Vercel functions ran in **iad1 (Washington DC)** while
  Supabase is in **Singapore (ap-southeast-1)**. Every server-side Supabase call crossed the
  Pacific. Switched the Function Region to **sin1**. Result: cold **5–6s**, warm **1.5–3s**.
- **Remaining cause (MEASURED 2026-10-28):** **Vercel cold starts.** With the server warm, the
  app opens in **~1.0s**. With it cold, **4–8s** (worst 10.5s). The function goes cold after as
  little as **14 minutes** idle, so almost every real-life open is cold.
- **Next fixes, best first:** keep the functions warm (route + external pinger) → embed the
  JWKS public key → lengthen the Supabase access-token lifetime → stop exchange rates from
  blocking the dashboard. See [§6](#6-fix-plan).
- **2026-11-04 — architecture change (fix #7):** the dashboard (the PWA launch screen) is now a
  **static page served from Vercel's CDN** that shows the last-seen data from the phone instantly,
  then loads fresh data **from the phone straight to Supabase**. No Vercel function is on the
  app-open path any more, so cold starts can no longer delay opening the app. See
  [§3.1](#31-new-launch-path-fix-7-2026-11-04). Awaiting Round 4.
- **2026-11-03 (Round 3a, 5 opens):** exchange rates are NOT the problem (0.12–0.16s). Cold opens
  are dominated by the fresh Vercel instance: Supabase requests from it took 1–8s each (0.1–0.4s
  warm), plus up to ~6.7s before our code ran. A new instance was started even 25s after the
  previous open, which is why keep-warm could not work.
- **2026-11-03:** fix #4 shipped. The dashboard no longer waits more than 0.4s for exchange
  rates, and each dashboard query is now timed separately. Awaiting Round 3. Cron job deleted.
- **2026-11-03 (Round 2b):** #2, #3, #8 confirmed working. #1 (pinger) did not work. Cold opens
  are now a median of ~4.3s (from ~5.7s), warm 0.7–1.7s. The biggest remaining block is the
  dashboard query batch (1–5s cold). Next: per-query timing + exchange rates off the critical
  path (#4), then #7 (instant snapshot) for the unavoidable cold boot.
- **2026-10-28:** fixes #1 (keep-warm route) and #2 (build-time JWKS) shipped. The pinger needs
  setting up once ([§6.1](#61-keep-warm-pinger-setup-cron-joborg)). Awaiting Round 2 measurements.

---

## 2. History of attempts

| When | Change | Effect |
|---|---|---|
| Apr 2026 | Removed double fetching, redundant auth round-trips in actions (`performance-audit-2026-04-10.md`) | Helped navigation and actions, not launch |
| Aug 2026 (`88b8af6`) | Local JWT verification (`getClaims` + module JWKS cache), one parallel query batch per page, daily conversation streamed behind Suspense | Fewer serial round-trips |
| Aug 2026 (`6ad4530`, `5dc40ad`) | Removed the service-worker `fetch` handler entirely | Fixed an 8–10s regression caused by `preloadResponse`; launch reported ~3s at the time |
| Aug–Oct 2026 | Launch crept back to 7–11s cold / ~5s warm | Several AI-assisted attempts, no improvement |
| **2026-10-26** | **Vercel Function Region iad1 → sin1** (dashboard setting, redeploy) | **Cold 5–6s, warm 1.5–3s.** Verified with `x-vercel-id: sin1::sin1::…` |
| 2026-10-26 (`68b471c`) | Server uses the user's timezone for "today" (`lib/data/userToday.js`) | Fixed the "date cannot be in the future" bug after midnight; also removes an extra server action call the dashboard made between 00:00 and 07:00 |
| 2026-10-27 (`0c97ebc`) | Temporary `[perf]` instrumentation → `perf_logs` table | Produced the data in §5 |
| 2026-10-28 | Fix #2: JWKS public keys fetched at build time and inlined (`next.config.mjs` → `lib/supabase/jwks.js`) | Local cold proxy: JWKS 443ms → **0ms**. On-device: pending Round 2 |
| 2026-10-28 | Fix #1: `app/api/warm/route.js` + external 5-min pinger | ❌ No effect (Round 2b). Cron job deleted 2026-11-03 |
| 2026-10-28 | Fix #8: backfilled `couple_id` into Koko's auth metadata (SQL) | Koko page auth ~1.0s → 0.04–0.08s |
| 2026-10-28 | Fix #3: access-token expiry 3600s → 86400s | Refreshes 9/11 → 6/14 opens |
| 2026-11-03 | Fix #4: `getRatesFast()` (memo + 400ms cap) on the dashboard; per-query `[perf]` timing | Rates were 0.12–0.16s, not the cause. Showed cold Supabase requests at 1–8s (Round 3a) |
| 2026-11-04 | **Fix #7: static launch screen + on-device snapshot + browser → Supabase data** (supersedes #4's `getRatesFast`, #5 and "daily conversation in parallel") | Pending Round 4 |

### Why the region problem went unnoticed for months

- It is a **Vercel dashboard setting**. There is no `vercel.json`, so nothing in the repo shows it.
- CLAUDE.md said "sin1 region". That most likely came from the `x-vercel-id` header, whose
  **first** segment is the *edge PoP nearest the user* and is always `sin1` from Indonesia. The
  **second** segment is the function region. Later sessions trusted the doc instead of checking.
- **Lesson:** verify environment and config claims at the source (Vercel and Supabase settings,
  response headers) before optimising code.

---

## 3.1 New launch path (fix #7, 2026-11-04)

```
tap icon
 └─ iOS boots WebKit (~1s, unavoidable)
     └─ GET /dashboard → Vercel CDN (static HTML, NO function, proxy.js skipped)
         └─ JS from HTTP cache → hydrate
             ├─ snapshot in localStorage? → render it immediately (last-seen data)
             │   else → render the skeleton
             └─ browser Supabase client (all in parallel, no Vercel involved):
                  getSession()  (local cookie; refreshes over the network ~once/day)
                  members · couple · unpaid · recent · daily conversation  → Supabase (RLS)
                  /api/rates                                              → Vercel CDN (ISR, 1h)
                  → swap in fresh data, save the new snapshot
     └─ after the session settles: prefetch the other tabs (also wakes Vercel in the background)
```

What still touches Vercel functions: the other tabs' server pages (first visit may show their
skeleton while a cold function starts; the background prefetch makes this less likely) and
mutations (server actions).

Design notes:
- **Static page.** `dashboard/page.js` has no dynamic APIs, and `(app)/layout.js` no longer calls
  `getAuthUser()`. Every other `(app)` page authenticates itself, and proxy.js still guards them.
- **Auth in the browser.** No session → `/login`. A network error during a token refresh → keep
  showing the snapshot (offline). Missing `couple_id` → `/onboarding`.
- **Snapshot safety.** Tagged with the user id, hidden if a different user signs in, cleared on
  sign-out (`ProfileClient`). A daily question from a previous day is never shown from the
  snapshot.
- **Refresh-token race.** With the proxy off the launch path, the browser refreshes an expired
  token itself. Next's automatic tab prefetch would hit proxy.js at the same moment with the old
  refresh token, and a cold start could push that past Supabase's 10s reuse window, which revokes
  the session and signs the user out. So tab Links are `prefetch={false}` and `NavLinks`
  prefetches them only after `getSession()` resolves.
### 3.2 Known trade-offs of fix #7

| Trade-off | Impact | Mitigation / note |
|---|---|---|
| **Old data for a moment.** The snapshot is shown first, so for ~0.5–2s the numbers can be out of date (e.g. an expense the partner just added) | Low. Anything you act on (ledger, edit sheets) loads fresh | Swapped automatically. Realtime and focus reloads keep it current |
| **A brief skeleton → content swap.** The static HTML always contains the skeleton; the snapshot renders a few hundred ms later after JS hydrates | Cosmetic flicker on some opens | Could be removed later by rendering the snapshot before hydration |
| **Dashboard data stored on the phone** (`localStorage`): names, balances, recent expenses, today's question and answers | Anyone who can open the unlocked phone could already open the app; not a new exposure class (Supabase session cookies are already readable by JS) | User-tagged, never shown to another account, cleared on sign-out |
| **No offline launch.** With no network the phone cannot fetch the `/dashboard` HTML (`max-age=0`), so the app does not open, same as before | The "keep showing the snapshot" path only covers *flaky* networks (HTML loads, Supabase unreachable) | A service-worker cached shell would fix it, but needs on-device measurement first (rule 3) |
| **Other tabs are still server-rendered.** The first switch to Ledger/Bucket/… after opening can hit a cold function (skeleton for a few seconds) | Moves part of the wait from "opening" to "first tab switch" | Background prefetch after the session settles warms the server; not guaranteed (Vercel instance routing). Same pattern can be applied per tab later |
| **Mutations still go through server actions** (Vercel) | Saving can be slow on a cold function, though the UI updates instantly (optimistic) | Unchanged from before |
| **Residual refresh-token race.** On a day the token has expired, a tab tap within the first ~0.5s (before `getSession()` resolves) sends a request with the old token, so the proxy also refreshes | Only a problem if that proxy refresh lands >10s later (very slow cold start) → Supabase revokes the session → signed out | Prefetch is gated. Tapping that fast is unlikely. Raising the Supabase reuse interval (max 300s) would remove the risk |
| **Rates up to 1h old**, and `{rates: null}` for up to an hour if OER fails at revalidation | Converted totals hidden or slightly stale | The last good rates are kept from the snapshot |
| **The layout no longer guards auth.** Defence in depth is one layer thinner | A new `(app)` page that forgets to authenticate would rely on proxy.js alone | Documented in CLAUDE.md. RLS still protects all data |
| **Dashboard logic now lives in the browser** (queries, balance maths, daily-conversation creation and streak reset) | Slightly more JS work on the phone; trivial for this data size | RLS policies are the same ones the server used |

- **Not done (rule 3):** a service worker serving the shell from the phone would also remove the
  CDN round-trip, but CLAUDE.md forbids a fetch handler without on-device measurement. Revisit
  only if Round 4 shows the CDN fetch matters.

### 3.3 Ledger as a static shell (2026-11-03, trial)

**Problem after fix #7:** the app opened instantly, but tapping another tab right after opening
did nothing for several seconds. The tabs were dynamic server pages with `prefetch={false}`, and
Next.js navigates to an unprefetched dynamic route only once the server has rendered it, so every
tap waited on a cold proxy + page function. The dashboard's own loading was not the cause.

**Change (ledger only, to measure before doing the other tabs):** `/ledger` gets the dashboard
treatment. `page.js` is static, `LedgerClient` shows the on-device snapshot (`lib/pageSnapshot.js`,
key `ourverse-page-ledger-v1`) and loads fresh rows browser → Supabase (`lib/data/ledgerData.js`),
and proxy.js skips exactly `/ledger` (`ledger(?!/)` in the matcher — `/ledger/paid` is still
proxied and server-rendered). Static pages are prefetched in full from the CDN, so the tab switch
needs no function. Server actions posted from `/ledger` also skip the proxy; they authenticate
themselves (`getActionContext`), as the dashboard's already do.

**Optimistic-update guard:** a fresh load must never undo a change the user just made. Local
changes bump an `epoch` counter and server actions run through `track()`, which counts them as
pending; a load that may predate a change is dropped and redone once nothing is pending.

**Sign-out** calls `clearPageSnapshots()` (sweeps every `ourverse-page-*` key).

**To check on device:** tap Ledger within the first second of opening the app → it should switch
at once (snapshot, or skeleton on a first-ever visit) and then update. If it does, apply the same
pattern to the other tabs.

## 3. How a launch works (request path, before fix #7)

```
tap icon
 └─ iOS boots WebKit for the PWA            ← invisible to JS (before navigation start)
     └─ GET /dashboard  → Vercel edge (sin1)
         └─ proxy.js     (Node function — own instance, own cold start)
         │    ├─ getJwks()          fetch /.well-known/jwks.json if module cache empty
         │    └─ getClaims()        refreshes the session if the access token expired (>1h)
         └─ dashboard page (Node function — may be a second cold start)
              ├─ getAuthUser()      JWKS again (separate instance/module cache) + claims
              ├─ Promise.all        members, couple, unpaid, recent-3, fetchRates() (OER, US)
              └─ <Suspense> DailyConversation  2–4 sequential queries, streamed
     └─ HTML stream completes → iOS paints (splash stays up until then — see §4.6)
     └─ hydrate, realtime sockets connect
```

---

## 4. Diagnosis (from §5 data)

### 4.1 Confirmed: cold starts are the dominant cost
- The only fully warm open (27 Oct 13:43, row 10) painted at **1.0s**.
- Opens that found the proxy instance cold: **3.9–10.5s**.
- The proxy was cold on **7 of 8** of Koko's opens, including one after only **14 minutes**
  idle (row 7). Moe's opens were sometimes warm only because Koko had opened the app just before.

### 4.2 Confirmed: cold proxy costs ~0.8–0.96s, and both parts are fixable
- JWKS fetch on a cold instance: **0.36–0.95s**. Warm: 0ms.
- Session refresh when the token has expired (`refreshed=1` on 9 of 11 opens): **0.4–0.65s**.
- Warm proxy with a valid token: **2–4ms**.

### 4.3 Confirmed: page render is 0.36s warm vs 1.2–4.6s cold
- `authMs` (getAuthUser): 0.02–0.23s warm vs **1.0–3.7s** cold.
- `queriesMs` (one Promise.all): 0.13s warm vs **0.9–3.8s** cold.

### 4.4 Likely (not yet proven)
- **The page's auth step is slower than JWKS alone explains** (e.g. 1.17s with a valid token
  and no refresh, row 7). Likely contributors: the cold JWKS fetch (first outbound fetch in a new
  process means undici init, DNS and TLS), module evaluation of supabase-js on a cold instance, and
  possibly a second session refresh if refreshed cookies did not reach the page. The current
  instrumentation does not split this — add per-step timing if it persists after fix #1.
- **`fetchRates()` may block the dashboard.** It sits inside the page's single `Promise.all`.
  The Open Exchange Rates API is in the US. If the Vercel Data Cache entry is missing or slow on
  a cold instance, the whole dashboard waits for it. Row 6 (queries 3.8s) fits this. Unconfirmed.
- **Supabase free-tier compute** may answer the first queries after a long idle more slowly
  (pooled connections closed, cold buffers). Small, and not separable with the current data.

### 4.5 Ruled out
- **JS bundle / HTTP cache:** ~200KB gz total. Slowest script 4–48ms (one outlier 646ms).
  Not a factor.
- **Service worker:** controls the page (expected — it is registered for push) but `workerStart`
  is 4–48ms, and there is no fetch handler. Not a factor.
- **DNS / TCP connect:** 0ms on every open (connection reused). Not a factor.
- **Network region:** fixed (§2).

### 4.6 Observed: the loading skeleton never shows on iOS
`fcp` ≈ `htmlDone` on every open. WebKit does not paint the streamed `loading.js` skeleton.
The splash screen stays up until the whole HTML stream, including the Suspense'd daily
conversation, has arrived. Perceived launch time therefore equals full server time plus iOS boot.

### 4.7 One-off: 4s before the request was even sent
Row 1 (28 Oct 16:45): `requestStart` = 4.06s, so the phone waited 4s before sending the request.
This is iOS-side (radio wake or WebKit), not the server. Watch whether it repeats.

### 4.9 CONFIRMED (Round 2a): Koko's token lacks `couple_id`, adding 2 serial DB queries to every page

Checked 2026-10-28: Moe `true`, **Koko `false`** (other test accounts also `false`).

`getAuthUser()` takes `couple_id` from the JWT's `user_metadata`. When it is missing,
`resolveCoupleId()` falls back to `getAppSession()`, which runs a profile query and then a
partner query **one after the other**, before the page's own `Promise.all` can start. Server
actions pay a similar fallback query in `getActionContext()`.

The metadata write was only added on 2026-04-10 (`f7007d0`), so an account that created or joined
its couple before that date has no `couple_id` in its token. This fits the data:
- Koko's page auth: ~1.0s cold, 0.23–0.33s warm, i.e. two round trips.
- Moe's page auth: 0.02–0.15s, i.e. no DB query.

**Check** (Supabase SQL editor, read-only):

```sql
select u.name,
       au.raw_user_meta_data->>'couple_id' is not null as has_couple_id_in_token
from auth.users au
join public.users u on u.id = au.id;
```

**Fix if `false`:** backfill the metadata once. It takes effect at the next token refresh (≤1h).

```sql
update auth.users au
set raw_user_meta_data = coalesce(au.raw_user_meta_data, '{}'::jsonb)
                         || jsonb_build_object('couple_id', u.couple_id::text)
from public.users u
where u.id = au.id
  and u.couple_id is not null
  and au.raw_user_meta_data->>'couple_id' is null;
```

Safe by design: `couple_id` from metadata is only used to scope queries. RLS still enforces
`couple_id = get_my_couple_id()` from the `users` table, so a wrong value can read nothing.

### 4.8 Measurement caveats
- **`ttfb` / `serverMs` from Safari are unreliable here** (e.g. ttfb 85ms while the proxy alone
  took 770ms). Use `htmlDone` and `fcp` instead.
- **`page.cold` is unreliable.** It reports true on every row, including a 0.36s warm render,
  because `lib/perf.js` is a separate module copy in the page bundle that loads lazily. Trust
  `proxy.cold` and the size of `page.totalMs`.
- The time from tapping the icon to navigation start (iOS booting WebKit) is not captured.
  It is the gap between how long the open *felt* and `fcp`.

---

## 5. Measurements

Collected by the `[perf]` instrumentation (`lib/perf.js`, `app/components/PerfBeacon.js`,
`app/api/vitals/route.js`, `[perf]` lines in `proxy.js` and `dashboard/page.js`) into
`public.perf_logs`. Times in seconds. "Screen" = first contentful paint after navigation start.

### Round 1 — after region fix, before any other fix (27–28 Oct 2026)

| # | Opened (WIB) | Who | Idle | Proxy cold | Refresh | Proxy (JWKS / auth) | Page (auth / queries) | HTML done | Screen |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 28 Oct 16:45 | Koko | 147m | yes | yes | 0.88 (0.38 / 0.50) | 3.27 (0.99 / 2.28) | 10.36 | **10.49** |
| 2 | 28 Oct 14:18 | Koko | 811m | yes | yes | 0.77 (0.38 / 0.39) | 3.51 (2.18 / 1.32) | 6.15 | 6.29 |
| 3 | 28 Oct 00:47 | Moe | 526m | no | yes | 0.06 (0 / 0.06) | 1.17 (0.15 / 1.02) | 2.28 | 2.35 |
| 4 | 28 Oct 00:47 | Koko | 99m | yes | yes | 0.92 (0.42 / 0.50) | 1.74 (1.58 / 0.15) | 4.47 | 4.60 |
| 5 | 27 Oct 23:08 | Koko | 429m | yes | yes | 0.90 (0.44 / 0.46) | 4.65 (3.72 / 0.93) | 8.00 | 8.13 |
| 6 | 27 Oct 16:01 | Moe | – | no | yes | 0.65 (0 / 0.65) | 3.81 (0.02 / 3.79) | 5.29 | 5.43 |
| 7 | 27 Oct 15:59 | Koko | 14m | yes | no | 0.38 (0.36 / 0.02) | 1.62 (1.17 / 0.46) | 3.77 | 3.90 |
| 8 | 27 Oct 15:45 | Koko | 121m | yes | yes | 0.96 (0.95 / 0.01) | 2.77 (1.87 / 0.90) | 5.60 | 5.74 |
| 9 | 27 Oct 13:43 | Koko | 0m | no | no | 0.00 | 1.60 (1.17 / 0.43) | 2.11 | 2.21 |
| 10 | 27 Oct 13:43 | Koko | 0m | no | no | 0.00 | 0.36 (0.23 / 0.13) | 0.91 | **1.00** |
| 11 | 27 Oct 13:43 | Koko | first | yes | yes | 0.81 (0.45 / 0.36) | 1.99 (1.05 / 0.94) | 5.44 | 5.56 |

### Round 2a — first few hours after fixes #1 + #2 (28 Oct 2026, Koko only, 5 opens)

| # | Opened (WIB) | Who | Idle | Proxy cold | Refresh | Proxy (JWKS / auth) | Page (auth / queries) | HTML done | Screen |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 28 Oct 19:46 | Koko | 57m | yes | yes | 0.58 (**0** / 0.58) | 1.50 (1.11 / 0.40) | 3.80 | 3.95 |
| 2 | 28 Oct 18:50 | Koko | 41m | yes | no | 0.03 (**0** / 0.03) | 1.40 (1.02 / 0.38) | 3.16 | 3.30 |
| 3 | 28 Oct 18:00 | Koko | 49m | yes | yes | 0.60 (**0** / 0.59) | 1.37 (0.98 / 0.38) | 3.85 | 3.99 |
| 4 | 28 Oct 17:11 | Koko | 0m | no | no | 0.00 | 0.60 (0.33 / 0.27) | 1.03 | **1.13** |
| 5 | 28 Oct 17:11 | Koko | 26m | no | no | 0.02 | 1.08 (0.67 / 0.40) | 2.30 | 2.41 |

**Read-out:**
- **Fix #2 works.** `jwksMs` is 0 on every open, cold or not. Cold opens improved from typically
  5.6–6.3s (Round 1) to **3.3–4.0s**.
- **Fix #1 is not working yet.** The proxy was cold on 3 of the 3 opens after 17:11. The two warm
  opens at 17:11 were warmed by a manual `curl` at 17:05, not by the pinger (instance age ≈ 339s).
  **Checked:** cron-job.org history shows a successful `204` every 5 minutes since 17:10, mostly
  ~1.0–1.3s (from Germany), with occasional ~4.5s cold spikes. So the pings land and keep *an*
  instance warm, but the phone's requests still hit **fresh proxy instances** (`ageMs` 4ms).
  Likely cause: Vercel does not route the phone's requests (sin1 edge) to the instance the pings
  (fra1 edge) keep alive. The pinger has not helped the proxy so far. Keep it running through
  Round 2b to see whether it helps the page/DB side, then decide whether to delete it.
- **New suspect — Koko's page `authMs` is ~1.0s cold even with no JWKS fetch and no refresh**
  (row 2). Moe's was 0.02–0.15s in Round 1. See §4.9.
- The session refresh still costs ~0.6s whenever the token has expired (fix #3).

### Round 2b — after #1, #2, #3, #8 (28 Oct 21:00 → 2 Nov, both phones, 14 opens)

Times in seconds. Columns as Round 1, but compact: proxy and page totals only, plus the page's
auth/queries split.

| # | Opened (WIB) | Who | Idle | Proxy cold | Refresh | Proxy | Page (auth / queries) | HTML done | Screen |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 02 Nov 21:33 | Moe | 4.1d | no | yes | 0.49 | 0.55 (0.01 / 0.54) | 1.53 | 1.67 |
| 2 | 02 Nov 21:28 | Koko | 23.7h | yes | yes | 1.22 | 3.59 (0.08 / **3.51**) | 7.33 | **7.43** |
| 3 | 01 Nov 21:49 | Koko | 3.6h | yes | no | 0.03 | 1.76 (0.08 / 1.68) | 3.94 | 4.07 |
| 4 | 01 Nov 18:15 | Koko | 2.3h | yes | yes | 0.53 | 1.39 (0.07 / 1.31) | 4.49 | 4.83 |
| 5 | 01 Nov 15:58 | Koko | 2.5h | yes | no | 0.04 | 1.19 (0.08 / 1.11) | 3.32 | 3.44 |
| 6 | 01 Nov 13:27 | Koko | 20.5h | yes | no | 0.03 | 1.74 (0.08 / 1.65) | 4.17 | 4.29 |
| 7 | 31 Oct 16:59 | Koko | 42.7h | yes | yes | 0.72 | 3.74 (0.04 / **3.70**) | 6.88 | **6.97** |
| 8 | 29 Oct 22:19 | Koko | 53m | yes | yes | 0.83 | 5.40 (0.04 / **5.36**) | 8.46 | **8.58** |
| 9 | 29 Oct 21:26 | Koko | 3.4h | yes | no | 0.03 | 1.10 (0.04 / 1.06) | 3.04 | 3.17 |
| 10 | 29 Oct 18:01 | Koko | 0m | no | no | 0.00 | 0.48 (0.06 / 0.41) | 0.90 | **0.96** |
| 11 | 29 Oct 18:00 | Moe | 25m | no | no | 0.00 | 0.30 (0.02 / 0.28) | 0.65 | **0.74** |
| 12 | 29 Oct 17:38 | Koko | 19.4h | no | no | 0.00 | 0.93 (0.02 / 0.91) | 1.55 | 1.70 |
| 13 | 29 Oct 17:35 | Moe | 21.2h | yes | no | 0.03 | 1.11 (0.04 / 1.07) | 3.30 | 3.42 |
| 14 | 28 Oct 22:15 | Koko | 1.8h | yes | yes | 0.70 | 1.50 (0.04 / 1.46) | 4.16 | 4.30 |

**Read-out:**
- **#8 (couple_id backfill) works.** Koko's page auth went from ~1.0s cold to **0.04–0.08s**,
  the same as Moe's.
- **#2 (build-time JWKS) works.** `jwksMs` is 0 on every open.
- **#3 (24h token) helps partially.** Refresh fell from 9 of 11 opens (Round 1) to 6 of 14. The
  remaining refreshes are the roughly once-a-day expiry. A refresh costs 0.5–1.2s on a cold proxy.
- **#1 (pinger) does not work.** The proxy was cold on 10 of 14 opens despite a ping every 5
  minutes. Every warm open came right after the other partner had used the app. Decision: remove
  the cron job (see §6).
- **Cold opens improved but not enough:** median screen **~4.3s** (Round 1 ~5.7s). Warm opens
  **0.7–1.7s**.
- **The biggest remaining measured block is the dashboard's `Promise.all`:** 0.3–0.4s warm, but
  **1.1–1.7s typical cold and 3.5–5.4s in the three worst opens** (rows 2, 7, 8). The three worst
  opens are exactly the three slow-query ones. The current data cannot say whether that is the
  Supabase queries on a cold connection or `fetchRates()` (Open Exchange Rates, US). Next step:
  time each query separately (§6 #4).
- **~1.5–2.5s per cold open is still unaccounted for** (`htmlDone` minus proxy minus page): the
  function boot itself (before any of our code runs) plus the streamed daily conversation. On the
  Hobby plan this cannot be removed by code; only #7 hides it.

### Round 3a — after #4 (03 Nov 2026, Koko, 5 opens back-to-back, with stopwatch)

| Opened | Stopwatch | Screen (log) | Instance | Supabase requests (each) | Rates | Daily |
|---|---|---|---|---|---|---|
| 14:34:39 (first of the day) | ~9.x s | 8.2s | fresh | ~0.95s | 0.16s | 0.28s |
| 14:35:04 | 10.57s | 11.6s | **fresh again** | **6.8–8.2s** | 0.12s | **3.0s** |
| 14:35:14 | <2s | 1.1s | warm | 0.27–0.39s | 0.12s | 0.29s |
| 14:35:18 | <2s | 0.6s | warm | ~0.2s | 0s (memo) | 0.15s |
| 14:35:23 | <2s | 0.4s | warm | ~0.1s | 0s (memo) | 0.12s |

Read-out: the logs match the stopwatch to ~1s (the iOS boot). Rates are not the cause. Warm is
fast. On a fresh instance, either the instance boot (~6.7s unexplained in row 1) or Supabase
requests from it (row 2) dominate, and Vercel started a fresh instance even 25s after the
previous open. Conclusion: remove Vercel from the launch path entirely → fix #7.

### Round 4 — after #7 (pending)

The proxy no longer runs on launch, so `proxy` is null. New fields: `shown` = ms from navigation
start until real content (snapshot or fresh) was on screen; `fresh` = when fresh data arrived;
`had_snap` = whether a snapshot existed.

```sql
select json_agg(t) from (
  select
    to_char(p.created_at at time zone 'Asia/Jakarta', 'DD Mon HH24:MI:SS') as opened,
    u.name,
    p.data->>'sinceLastOpenMin'        as idle_min,
    p.data->'page'->>'mode'            as mode,
    p.data->'page'->>'hadSnapshot'     as had_snap,
    p.data->>'fcp'                     as fcp,
    p.data->'page'->>'shownAt'         as shown,
    p.data->'page'->>'authMs'          as auth,
    p.data->'page'->'q'->>'members'    as q_members,
    p.data->'page'->'q'->>'unpaid'     as q_unpaid,
    p.data->'page'->'q'->>'rates'      as q_rates,
    p.data->'page'->'q'->>'daily'      as q_daily,
    p.data->'page'->>'freshAt'         as fresh,
    p.data->>'htmlDone'                as html_done
  from perf_logs p
  join users u on u.id = p.user_id
  where p.data->'page'->>'mode' = 'static-shell'
  order by p.created_at desc
  limit 60
) t;
```

Success looks like: `html_done` < 0.5s, `shown` < ~0.8s with a snapshot, `fresh` mostly < 1.5s,
and the stopwatch about 1–1.5s from tap to seeing the dashboard on every open, cold or not.

### Round 3 query (for reference)

Run this after a day of normal use, both phones. Compared with earlier rounds it adds the
per-query timings (`q_*`, in ms), where the rates came from (`rates_src`: memo / fresh / stale /
none) and the daily conversation time (`daily`).

```sql
select json_agg(t) from (
  select
    to_char(p.created_at at time zone 'Asia/Jakarta', 'DD Mon HH24:MI') as opened,
    u.name,
    p.data->>'sinceLastOpenMin'          as idle_min,
    p.data->'proxy'->>'cold'             as px_cold,
    p.data->'proxy'->>'refreshed'        as refreshed,
    p.data->'proxy'->>'totalMs'          as px_ms,
    p.data->'page'->>'authMs'            as pg_auth,
    p.data->'page'->>'queriesMs'         as pg_queries,
    p.data->'page'->'q'->>'members'      as q_members,
    p.data->'page'->'q'->>'couple'       as q_couple,
    p.data->'page'->'q'->>'unpaid'       as q_unpaid,
    p.data->'page'->'q'->>'recent'       as q_recent,
    p.data->'page'->'q'->>'rates'        as q_rates,
    p.data->'page'->>'ratesSource'       as rates_src,
    p.data->'marks'->>'dailyMs'          as daily,
    p.data->>'htmlDone'                  as html_done,
    p.data->>'fcp'                       as fcp
  from perf_logs p
  join users u on u.id = p.user_id
  where p.created_at > '2026-11-03 18:00:00+07'
  order by p.created_at desc
  limit 120
) t;
```

**How to read it:** if `q_rates` is the largest and `rates_src` is `none`/`stale` on the slow
opens, OER was the bottleneck and #4 fixed it. If the `q_*` Supabase timings are the large ones
on cold opens, the cost is Supabase on a cold connection → #5 (fewer round-trips) and #7.

Query used for Rounds 1–2 (Supabase SQL editor):

```sql
select json_agg(t) from (
  select to_char(p.created_at at time zone 'Asia/Jakarta', 'DD Mon HH24:MI') as opened,
         u.name, p.standalone, p.data
  from perf_logs p join users u on u.id = p.user_id
  order by p.created_at desc limit 80
) t;
```

---

## 6. Fix plan

Ranked by expected gain per effort. Re-measure (same query) after each one before moving on.

| # | Fix | Expected gain | Effort | Risk / trade-off | Status |
|---|---|---|---|---|---|
| 0 | Function Region iad1 → sin1 | 7–11s → 5–6s cold | Setting | None | ✅ Done 2026-10-26 |
| 1 | ~~**Keep functions warm**~~ — `app/api/warm/route.js` (pre-loads JWKS, evaluates supabase-js, does one anon RLS query to open the connection pool to Supabase), pinged every 5 min from cron-job.org | Most opens behave like rows 9–10: **~1–2.5s** instead of 4–8s | Small code + 2 min setup | ~288 tiny invocations/day, far inside Hobby limits. Does not help if Vercel routes the real request to a *new* instance anyway — verify with `proxy.cold` | ❌ Did not work (Round 2b: proxy cold 10/14 despite 5-min pings). Delete the cron job; `app/api/warm` can stay (harmless) or be removed |
| 2 | **Embed the JWKS public key** — fetched once per build in `next.config.mjs`, inlined as `SUPABASE_JWKS_BUILD`, returned by `getJwks()` with no network call. No manual env var needed | ~0.4–0.9s on any cold open that still happens (proxy + page) | Small | The key is public. Rotation: an unknown `kid` makes supabase-js `fetchJwk` fall back to the live endpoint (verified in `auth-js` source). A *revoked* key stays trusted until the next deploy — redeploy after any key revocation. A failed build-time fetch silently falls back to the old runtime fetch | ✅ Confirmed on-device: `jwksMs` 0 on all Round 2a/2b opens |
| 3 | **Longer access-token lifetime** — Supabase → Auth → JWT expiry 3600s → e.g. 86400s | ~0.4–0.65s on most opens (refresh skipped) | Setting | A signed-out or revoked device keeps a valid token until it expires | ✅ Set to 86400s 2026-10-28 (Auth → Sessions → Access token expiry). Refresh-token reuse detection left on (default), reuse interval 10s. Round 2b: refreshes 9/11 → 6/14 (≈ once a day). Optional: 604800 (1 week) |
| 4 | **Time each dashboard query, and take exchange rates off the critical path** — `getRatesFast()` in `lib/exchangeRates.js`: per-instance memo (1h), else waits at most **400ms** for `fetchRates()`, then falls back to the stale memo or `null` (converted "≈ total" line hidden for that load); the fetch keeps running and fills the memo. Dashboard only; the ledger still uses `fetchRates()`. Each query in the dashboard `Promise.all` is timed (`page.q`), plus the streamed daily conversation (`marks.dailyMs`) | Up to 3–5s on the worst cold opens *if* rates are the slow part; otherwise the timings point at Supabase (→ #5, #7) | Small | On a rare cold miss the converted total is missing for one load. Streaming the rates later would not help, because the iOS splash waits for the whole stream (§4.6) | ✅ Done → answered: rates were not the bottleneck (Round 3a). `getRatesFast` removed again in #7; the dashboard now uses `/api/rates` (CDN) |
| 5 | **Collapse `loadDailyConversation` into one Postgres RPC** | 2–4 sequential round-trips → 1, inside the stream the splash screen waits for (§4.6) | Medium (SQL function) | Needs a migration | ➖ Superseded by #7 (the daily conversation loads from the browser in parallel with everything else) |
| 6 | **Narrow the proxy matcher** to app pages (skip `sw.js`, manifest, `/api/vitals`) | Fewer proxy invocations; small | Small | Keep auth redirects intact | ⬜ |
| 8 | **Backfill `couple_id` into auth metadata** for accounts that pre-date 2026-04-10 (§4.9) — one SQL update, no code | ~0.7–1.0s per cold open, ~0.3s warm, for the affected user, plus a query saved on every server action | SQL, 1 min | Writes to `auth.users.raw_user_meta_data` | ✅ Confirmed: Koko page auth ~1.0s → 0.04–0.08s cold |
| 7 | **Instant shell from a local snapshot** — dashboard renders last-known data from localStorage immediately, then refreshes | Launch *feels* ~1s whatever the server does (also hides §4.7) | Large | Stale numbers flash for a moment. Bigger architectural change | 🟡 Shipped 2026-11-04 · verified locally (static `/dashboard` from cache, proxy skipped, `/api/rates` ISR, other pages still guarded) · awaiting Round 4 on-device |

**Suggested order:** 1 + 2 together (one deploy) → set up the pinger → collect a day of data →
decide on 3 → confirm §4.4 with finer timing → 4 → re-measure → consider 5 and 7 only if still
slow.

### 6.1 Keep-warm pinger setup (cron-job.org)

Vercel Hobby crons only run once a day, so an external free scheduler does the pinging.

1. Sign up at <https://cron-job.org> (free).
2. **Create cronjob**:
   - Title: `Ourverse keep-warm`
   - URL: `https://ourverse-han.vercel.app/api/warm`
   - Schedule: **every 5 minutes**
   - Advanced: request method `GET`, timeout 30s. Leave notifications on failure enabled.
3. Save, then use **Test run**: the response should be `204 No Content`, with an `x-warm-ms`
   header that is small (tens of ms) on repeat runs.
4. If the domain ever changes, update the URL here.

The route returns no data and its single query runs as anon under RLS (no rows), so it is safe
to leave public. If it is ever abused, add a secret query parameter check.

### 6.2 How to confirm #1 and #2 worked (Round 2)

- `proxy.jwksMs` should be **0** on every row, cold or not (#2).
- `proxy.cold` should be mostly **0** (#1). If it is still mostly 1, Vercel is not reusing the
  pinged instance. Fall back to #3 and #7.
- `page.totalMs` should mostly be < 0.6s, and `fcp` mostly < 2.5s.

---

## 7. Verifying a fix

1. Deploy, wait for it to finish.
2. Use the app normally for a day (both phones). For a few opens, note the time and how long it felt.
3. Run the query in §5 and add a new "Round N" table.
4. Success looks like: `proxy.cold` mostly `0`, `page.totalMs` mostly < 0.6s, `fcp` mostly < 2.5s.

Region check at any time: on the logged-in dashboard, in the browser console,
`fetch('/dashboard').then(r => console.log(r.headers.get('x-vercel-id')))` must print
`sin1::sin1::…`.

---

## 8. Cleanup when done

Remove everything tagged `[perf]`. Do NOT remove the build-time JWKS, `/api/rates`, the
dashboard snapshot or the static launch screen: those are permanent fixes. `app/api/warm` is unused
since the cron job was deleted, so remove it too or keep it for a future retry. `[perf]` items
include the `timed()` calls in `lib/data/dashboardData.js` and the `perfPage`/`PerfBeacon` bits
in `DashboardClient.js`:
- `lib/perf.js`, `app/components/PerfBeacon.js`, `app/api/vitals/route.js`, `migrations/perf_logs.sql`
- the `[perf]` lines in `proxy.js` and `app/(app)/dashboard/DashboardClient.js`
- Supabase SQL: `drop table public.perf_logs;`

Keep this document.
