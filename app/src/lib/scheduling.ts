import { DateTime, Interval } from 'luxon'
import type { Appointment, Business, WeekdayKey } from '../types/models'

const LUXON_WEEKDAY_TO_KEY: Record<number, WeekdayKey> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
}

/** The business's single open interval for a given calendar day, or null if closed. */
export function openIntervalForDay(business: Business, date: DateTime): Interval | null {
  const dayKey = LUXON_WEEKDAY_TO_KEY[date.weekday]
  const hours = business.hours[dayKey]
  if (!hours.isOpen) return null

  const [openH, openM] = hours.opensAt.split(':').map(Number)
  const [closeH, closeM] = hours.closesAt.split(':').map(Number)
  const start = date.set({ hour: openH, minute: openM, second: 0, millisecond: 0 })
  const end = date.set({ hour: closeH, minute: closeM, second: 0, millisecond: 0 })
  if (end <= start) return null
  return Interval.fromDateTimes(start, end)
}

const ACTIVE_STATUSES = new Set(['booked', 'confirmed', 'checked_in', 'in_progress'])

/**
 * Every start time (in `slotIncrementMin` steps) on `date` where a booking
 * of `totalDurationMin` fits inside business hours without overlapping an
 * existing, non-cancelled appointment. Matches the mockup's "New booking"
 * screen: only show slots that actually fit the total service length.
 */
export function availableSlotsForDay(
  business: Business,
  existingAppointments: Appointment[],
  date: DateTime,
  totalDurationMin: number,
  slotIncrementMin = 15,
  excludeAppointmentId?: string,
): DateTime[] {
  const openInterval = openIntervalForDay(business, date)
  if (!openInterval || totalDurationMin <= 0) return []

  const busy = existingAppointments
    .filter((a) => a.id !== excludeAppointmentId && ACTIVE_STATUSES.has(a.status))
    .map((a) => Interval.fromDateTimes(DateTime.fromJSDate(a.startAt.toDate()), DateTime.fromJSDate(a.endAt.toDate())))

  const slots: DateTime[] = []
  let cursor = openInterval.start!

  while (cursor.plus({ minutes: totalDurationMin }) <= openInterval.end!) {
    const candidate = Interval.fromDateTimes(cursor, cursor.plus({ minutes: totalDurationMin }))
    const overlaps = busy.some((b) => b.overlaps(candidate))
    if (!overlaps) slots.push(cursor)
    cursor = cursor.plus({ minutes: slotIncrementMin })
  }

  return slots
}
