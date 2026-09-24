/**
 * Helper to parse contact name and deduplicate 10-digit phone numbers
 * from the navigator.contacts Contact Picker API
 */
export function parseContactNumbers(contact) {
  if (!contact) return { name: '', validNumbers: [] }

  const name = Array.isArray(contact.name) ? (contact.name[0] || '') : (contact.name || '')
  const rawNumbers = Array.isArray(contact.tel) ? contact.tel : (contact.tel ? [contact.tel] : [])

  const validNumbers = rawNumbers
    .map(t => {
      const raw = String(t).trim()
      const clean = raw.replace(/\D/g, '').slice(-10)
      return { raw, clean }
    })
    .filter(item => item.clean.length === 10)
    .filter((item, idx, arr) => arr.findIndex(x => x.clean === item.clean) === idx)

  return { name, validNumbers }
}
