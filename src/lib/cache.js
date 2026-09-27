/**
 * Simple in-memory session cache for Supabase data.
 * Prevents re-fetching the same data every time the user navigates between pages.
 * Cache is cleared when the user logs out or the app is refreshed.
 */

const cache = {}
const TTL_MS = 30_000 // 30 seconds — short enough to stay fresh, long enough to prevent duplicate calls

export function getCached(key) {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.ts > TTL_MS) {
    delete cache[key]
    return null
  }
  return entry.data
}

export function setCached(key, data) {
  cache[key] = { data, ts: Date.now() }
}

export function invalidateCache(prefix) {
  Object.keys(cache).forEach(k => {
    if (!prefix || k.startsWith(prefix)) delete cache[k]
  })
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k])
}
