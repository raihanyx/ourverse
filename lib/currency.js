export const SUPPORTED_CURRENCIES = ['IDR', 'THB', 'AUD', 'MMK']

export function todayISO() {
  return new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD'
}

export function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const CURRENCY_CONFIG = {
  IDR: { locale: 'id-ID', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  THB: { locale: 'th-TH', minimumFractionDigits: 0, maximumFractionDigits: 0 },
  AUD: { locale: 'en-AU', minimumFractionDigits: 2, maximumFractionDigits: 2 },
  MMK: { locale: 'en-US', minimumFractionDigits: 0, maximumFractionDigits: 0 },
}

export function formatAmount(amount, currency) {
  const config = CURRENCY_CONFIG[currency]
  if (!config) return `${currency} ${amount}`
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits,
  }).format(amount)
  return `${currency} ${formatted}`
}

// Returns { IDR: 2400000, AUD: 50.00, ... } — coerces strings to numbers
export function sumByCurrency(expenses) {
  return expenses.reduce((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + Number(e.amount)
    return acc
  }, {})
}
