import { DateTime } from 'luxon'
import AppointmentBlock from './AppointmentBlock'
import type { Appointment, Business, WeekdayKey } from '../../types/models'

// Sunday-first, to match how the week grid is displayed and queried
// (see lib/week.ts) — types/models.ts's WEEKDAY_ORDER is Monday-first,
// used only for the onboarding hours-editor list order.
const SUNDAY_FIRST_ORDER: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

interface WeekViewProps {
  weekStart: DateTime // Sunday
  business: Business
  appointments: Appointment[]
  householdName: (householdId: string) => string
  petNames: (appointment: Appointment) => string
  onSelectDay: (date: DateTime) => void
}

export default function WeekView({
  weekStart,
  business,
  appointments,
  householdName,
  petNames,
  onSelectDay,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }))
  const now = DateTime.now().setZone(weekStart.zone)

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
      {days.map((day, i) => {
        const dayKey = SUNDAY_FIRST_ORDER[i]
        const isOpen = business.hours[dayKey].isOpen
        const isToday = now.hasSame(day, 'day')
        const dayAppointments = appointments
          .filter((a) => DateTime.fromJSDate(a.startAt.toDate(), { zone: weekStart.zone! }).hasSame(day, 'day'))
          .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())

        return (
          <div key={day.toISODate()} className="rounded-[14px] border border-border bg-white p-2.5">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-page"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-lg leading-none ${
                  isToday ? 'bg-ink text-dark-text' : 'text-ink'
                }`}
              >
                {day.day}
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold">{day.toFormat('EEE')}</span>
                <span className="text-[11px] text-ink-muted">
                  {dayAppointments.length} {dayAppointments.length === 1 ? 'booking' : 'bookings'}
                </span>
              </span>
            </button>
            {!isOpen && <p className="px-1.5 text-xs text-ink-muted/60">Closed</p>}
            <div className="flex flex-col gap-1">
              {dayAppointments.map((appt) => (
                <AppointmentBlock
                  key={appt.id}
                  appointment={appt}
                  timezone={weekStart.zone!.name}
                  householdName={householdName(appt.householdId)}
                  petNames={petNames(appt)}
                  compact
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
