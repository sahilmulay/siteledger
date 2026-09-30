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
    if (typeof dateString === 'string') {
      const trimmed = dateString.trim()
      const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (ymdMatch) {
        return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`
      }
    }
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString
    if (!isValid(date)) return '—'
    return format(date, 'dd/MM/yyyy')
  } catch {
    return '—'
  }
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDateLong(dateString) {
  return formatDate(dateString)
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

/**
 * Auto-format typing number to Indian comma format (e.g. 100000 -> 1,00,000)
 */
export function formatIndianAmount(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return ''
  const clean = String(rawVal).replace(/,/g, '').trim()
  if (!clean) return ''
  
  const parts = clean.split('.')
  const integerDigits = parts[0].replace(/\D/g, '')
  if (!integerDigits && parts.length === 1) return ''

  let formattedInt = ''
  if (integerDigits) {
    try {
      formattedInt = new Intl.NumberFormat('en-IN').format(BigInt(integerDigits))
    } catch {
      formattedInt = integerDigits
    }
  } else {
    formattedInt = '0'
  }
  
  if (parts.length > 1) {
    const decimalDigits = parts[1].replace(/\D/g, '').slice(0, 2)
    return `${formattedInt}.${decimalDigits}`
  }
  return formattedInt
}

/**
 * Parse Indian formatted string to plain numeric float (e.g. "1,00,000.50" -> 100000.5)
 */
export function parseIndianAmount(formattedVal) {
  if (formattedVal === null || formattedVal === undefined || formattedVal === '') return 0
  const clean = String(formattedVal).replace(/,/g, '').trim()
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

