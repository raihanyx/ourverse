import { SUPPORTED_CURRENCIES } from './currency'

const OER_URL = 'https://openexchangerates.org/api/latest.json'
const SUPPORTED = SUPPORTED_CURRENCIES

// Fetch latest rates from OER (USD base). Cached 1 hour by Next.js fetch cache.
// Returns { rates: { IDR: 16000, THB: 36, ... } } or null on any failure.
export async function fetchRates() {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID
  if (!appId) return null
  try {
    const res = await fetch(
      `${OER_URL}?app_id=${appId}&symbols=${SUPPORTED.join(',')}&prettyprint=false&show_alternative=false`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (!json.rates) return null
    return { rates: json.rates }
  } catch {
    return null
  }
}

// Convert amount between any two currencies via USD as intermediary.
// Returns null if rates are missing or a currency is not found.
export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return Number(amount)
  if (!rates || !rates[fromCurrency] || !rates[toCurrency]) return null
  const inUsd = Number(amount) / rates[fromCurrency]
  return inUsd * rates[toCurrency]
}

// Given a { currency: total } object (from sumByCurrency), return the unified
// total in baseCurrency. Returns null if any conversion is impossible.
export function computeUnifiedTotal(totals, baseCurrency, rates) {
  if (!rates) return null
  let sum = 0
  for (const [currency, amount] of Object.entries(totals)) {
    if (amount <= 0) continue
    const converted = convertAmount(amount, currency, baseCurrency, rates)
    if (converted === null) return null
    sum += converted
  }
  return sum
}

// Returns human-readable rate lines for all non-base currencies.
// e.g. ["1 THB = IDR 441", "1 AUD = IDR 10,240", "1 MMK = IDR 0.0047"]
export function getRateLines(baseCurrency, rates) {
  if (!rates) return []
  return SUPPORTED
    .filter(c => c !== baseCurrency)
    .map(c => {
      const rate = convertAmount(1, c, baseCurrency, rates)
      if (rate === null) return null
      const formatted = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: rate < 1 ? 4 : 0,
        minimumFractionDigits: 0,
      }).format(rate)
      return `1 ${c} = ${baseCurrency} ${formatted}`
    })
    .filter(Boolean)
}
