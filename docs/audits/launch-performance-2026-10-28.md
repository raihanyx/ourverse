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
| 2026-10-28 | Fix #1: `app/api/warm/route.js` + external 5-min pinger | Pending Round 2 |

### Why the region problem went unnoticed for months

- It is a **Vercel dashboard setting**. There is no `vercel.json`, so nothing in the repo shows it.
- CLAUDE.md said "sin1 region". That most likely came from the `x-vercel-id` header, whose
  **first** segment is the *edge PoP nearest the user* and is always `sin1` from Indonesia. The
  **second** segment is the function region. Later sessions trusted the doc instead of checking.
- **Lesson:** verify environment and config claims at the source (Vercel and Supabase settings,
  response headers) before optimising code.

---

## 3. How a launch works (request path)

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

### Round 2 — after fixes #1 + #2 (pending)

_Run the query below after a day of normal use with the pinger active and paste the table here._

Query used (Supabase SQL editor):

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
| 1 | **Keep functions warm** — `app/api/warm/route.js` (pre-loads JWKS, evaluates supabase-js, does one anon RLS query to open the connection pool to Supabase), pinged every 5 min from cron-job.org | Most opens behave like rows 9–10: **~1–2.5s** instead of 4–8s | Small code + 2 min setup | ~288 tiny invocations/day, far inside Hobby limits. Does not help if Vercel routes the real request to a *new* instance anyway — verify with `proxy.cold` | 🟡 Code shipped 2026-10-28 · pinger setup [§6.1](#61-keep-warm-pinger-setup-cron-joborg) · awaiting Round 2 |
| 2 | **Embed the JWKS public key** — fetched once per build in `next.config.mjs`, inlined as `SUPABASE_JWKS_BUILD`, returned by `getJwks()` with no network call. No manual env var needed | ~0.4–0.9s on any cold open that still happens (proxy + page) | Small | The key is public. Rotation: an unknown `kid` makes supabase-js `fetchJwk` fall back to the live endpoint (verified in `auth-js` source). A *revoked* key stays trusted until the next deploy — redeploy after any key revocation. A failed build-time fetch silently falls back to the old runtime fetch | 🟡 Shipped 2026-10-28 · verified locally (JWKS 0ms) · awaiting Round 2 |
| 3 | **Longer access-token lifetime** — Supabase → Auth → JWT expiry 3600s → e.g. 86400s | ~0.4–0.65s on most opens (refresh skipped) | Setting | A signed-out or revoked device keeps a valid token until it expires | ⬜ |
| 4 | **Exchange rates off the critical path** — module-scope memo + short timeout (e.g. 300ms → `null`, rates simply don't render), or stream converted totals behind Suspense | Up to ~0.5–3s on cold opens *if* §4.4 holds | Small | Converted totals may be missing on a rare cold miss. Add timing first to confirm | ⬜ |
| 5 | **Collapse `loadDailyConversation` into one Postgres RPC** | 2–4 sequential round-trips → 1, inside the stream the splash screen waits for (§4.6) | Medium (SQL function) | Needs a migration | ⬜ |
| 6 | **Narrow the proxy matcher** to app pages (skip `sw.js`, manifest, `/api/vitals`) | Fewer proxy invocations; small | Small | Keep auth redirects intact | ⬜ |
| 7 | **Instant shell from a local snapshot** — dashboard renders last-known data from localStorage immediately, then refreshes | Launch *feels* ~1s whatever the server does (also hides §4.7) | Large | Stale numbers flash for a moment. Bigger architectural change | ⬜ |

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

Remove everything tagged `[perf]` (NOT `app/api/warm` or the build-time JWKS — those are
permanent fixes):
- `lib/perf.js`, `app/components/PerfBeacon.js`, `app/api/vitals/route.js`, `migrations/perf_logs.sql`
- the `[perf]` lines in `proxy.js` and `app/(app)/dashboard/page.js`
- Supabase SQL: `drop table public.perf_logs;`

Keep this document.
