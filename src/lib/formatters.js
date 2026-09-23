import { format, parseISO, isValid } from 'date-fns'

/**
 * Format number as Indian Rupee
 * e.g. 1234567.89 → ₹12,34,567.89
 */
export function formatINR(amount, showDecimals = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0'
  const num = Number(amount)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(num)
}

/**
 * Format date as DD/MM/YYYY (Indian format)
 */
export function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    if (!isValid(date)) return '—'
    return format(date, 'dd/MM/yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format date as DD MMM YYYY (e.g. 23 Sep 2026)
 */
export function formatDateLong(dateString) {
  if (!dateString) return '—'
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    if (!isValid(date)) return '—'
    return format(date, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

/**
 * Convert date to input[type=date] format YYYY-MM-DD
 */
export function toInputDate(dateString) {
  if (!dateString) return ''
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    if (!isValid(date)) return ''
    return format(date, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * Today as YYYY-MM-DD for default input values
 */
export function todayInputDate() {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Compact INR e.g. ₹12.3L, ₹4.5K
 */
export function formatINRCompact(amount) {
  const num = Number(amount || 0)
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  return `₹${num.toFixed(0)}`
}
