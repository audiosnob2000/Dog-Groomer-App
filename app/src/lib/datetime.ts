import type { Timestamp } from 'firebase/firestore'
import { DateTime } from 'luxon'

/** Converts a Firestore Timestamp to a Luxon DateTime in the business's own time zone. */
export function toBusinessDateTime(ts: Timestamp, timezone: string): DateTime {
  return DateTime.fromJSDate(ts.toDate(), { zone: timezone })
}

export function formatDate(ts: Timestamp, timezone: string): string {
  return toBusinessDateTime(ts, timezone).toFormat('MMM d, yyyy')
}

export function formatTime(ts: Timestamp, timezone: string): string {
  return toBusinessDateTime(ts, timezone).toFormat('h:mm a')
}

export function formatDateTime(ts: Timestamp, timezone: string): string {
  return toBusinessDateTime(ts, timezone).toFormat('MMM d, yyyy · h:mm a')
}

/** "Today" / "Tomorrow" in the business's own day, otherwise a short date. */
export function formatRelativeDay(ts: Timestamp, timezone: string): string {
  const dt = toBusinessDateTime(ts, timezone)
  const now = DateTime.now().setZone(timezone)
  const diffDays = dt.startOf('day').diff(now.startOf('day'), 'days').days
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return dt.toFormat('EEE, MMM d')
}

const VACCINE_WARNING_DAYS = 30

export function vaccineStatus(expiresOn: Timestamp, timezone: string): 'expired' | 'expiring' | 'ok' {
  const now = DateTime.now().setZone(timezone)
  const expiry = toBusinessDateTime(expiresOn, timezone)
  const daysLeft = expiry.diff(now, 'days').days
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= VACCINE_WARNING_DAYS) return 'expiring'
  return 'ok'
}
