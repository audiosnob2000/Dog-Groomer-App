/**
 * Normalizes a US phone number to E.164 (+15550142231) so inbound-message
 * matching (PLAN.md §4, `numberIndex`) is a simple lookup later. Returns the
 * input unchanged if it doesn't look like a 10 or 11-digit US number, so a
 * groomer can still save an odd/foreign number rather than being blocked.
 */
export function normalizeUsPhoneE164(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (input.trim().startsWith('+')) return input.trim()
  return input.trim()
}

export function formatPhoneForDisplay(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  if (!match) return e164
  return `(${match[1]}) ${match[2]}-${match[3]}`
}
