import type { DateTime } from 'luxon'

/**
 * Luxon's own startOf('week')/endOf('week') follow the ISO week (Monday
 * first) regardless of locale. The app displays weeks Sunday-first, so
 * these compute that explicitly instead.
 */
export function startOfWeekSunday(dt: DateTime): DateTime {
  return dt.startOf('day').minus({ days: dt.weekday % 7 })
}

export function endOfWeekSunday(dt: DateTime): DateTime {
  return dt.endOf('day').plus({ days: 6 - (dt.weekday % 7) })
}
