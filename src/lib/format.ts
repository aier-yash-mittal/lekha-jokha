const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$'
}

export const CURRENCIES = Object.keys(CURRENCY_SYMBOLS)

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code + ' '
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const sym = currencySymbol(currency)
  const abs = Math.abs(amount)
  return `${sym}${abs.toFixed(2)}`
}

export function formatSignedMoney(amount: number, currency = 'USD'): string {
  const sign = amount < 0 ? '-' : ''
  return sign + formatMoney(amount, currency)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function initials(name?: string | null, email?: string | null): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/[\s@.]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// Deterministic pleasant color from a string (for avatars).
export function colorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const palette = ['#f43f5e', '#ea580c', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b']
  return palette[Math.abs(hash) % palette.length]
}
