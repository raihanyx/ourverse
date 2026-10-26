import { cookies } from 'next/headers'

/**
 * "Today" as the USER sees it — server-side only.
 *
 * WHY: Vercel functions run in UTC. Both owners are UTC+7, so from 00:00 to
 * 07:00 local the server's "today" is still yesterday. Anything that compared a
 * user-picked date against `new Date()` on the server rejected today's date as
 * "in the future", and server-rendered pages showed yesterday's date.
 *
 * The browser writes its IANA timezone into the `tz` cookie on every load (see
 * the theme-init script in app/layout.js). Reading a cookie is free — no
 * network, no extra round-trip.
 */

export const TZ_COOKIE = 'tz'

// UTC+14 — the first place on Earth to reach a new date. If the cookie is
// missing (very first request on a device), validating against this means a
// genuine "today" is never rejected, wherever the user is.
const EARLIEST_ZONE = 'Pacific/Kiritimati'

function isValidTimeZone(tz) {
  if (!tz || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** The user's IANA timezone from the cookie, or null if absent/invalid. */
export async function getUserTimeZone() {
  const cookieStore = await cookies()
  const tz = cookieStore.get(TZ_COOKIE)?.value
  return isValidTimeZone(tz) ? tz : null
}

/** YYYY-MM-DD for `timeZone` ('en-CA' formats as ISO). */
export function todayIn(timeZone) {
  return new Date().toLocaleDateString('en-CA', { timeZone })
}

/**
 * Today's date for display and data loading (dashboard, calendar month, …).
 * Falls back to UTC when the timezone is unknown — same as the old behaviour.
 */
export async function userTodayISO() {
  return todayIn((await getUserTimeZone()) ?? 'UTC')
}

/**
 * Upper bound for "date cannot be in the future" checks. Uses the user's
 * timezone when known; otherwise the most lenient zone, so a real "today" is
 * never refused.
 */
export async function latestAllowedDateISO() {
  return todayIn((await getUserTimeZone()) ?? EARLIEST_ZONE)
}
