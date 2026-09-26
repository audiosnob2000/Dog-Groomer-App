import { DateTime } from 'luxon'
import { statusColorClasses } from '../../lib/appointmentStatus'
import { endOfWeekSunday, startOfWeekSunday } from '../../lib/week'
import type { Appointment } from '../../types/models'

interface MonthViewProps {
  month: DateTime // any day within the month
  appointments: Appointment[]
  householdName: (householdId: string) => string
  onSelectDay: (date: DateTime) => void
}

const MAX_CHIPS_PER_DAY = 3

export default function MonthView({ month, appointments, householdName, onSelectDay }: MonthViewProps) {
  const monthStart = month.startOf('month')
  const gridStart = startOfWeekSunday(monthStart) // Sunday on/before the 1st
  const gridEnd = endOfWeekSunday(month.endOf('month'))
  const days: DateTime[] = []
  for (let d = gridStart; d <= gridEnd; d = d.plus({ days: 1 })) days.push(d)

  const now = DateTime.now().setZone(month.zone)

  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-[14px] border border-border bg-border text-center text-xs font-semibold text-ink-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="bg-sidebar py-1.5">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-[14px] border-x border-b border-border bg-border">
        {days.map((day) => {
          const inMonth = day.hasSame(monthStart, 'month')
          const isToday = now.hasSame(day, 'day')
          const dayAppointments = appointments
            .filter((a) => DateTime.fromJSDate(a.startAt.toDate(), { zone: month.zone! }).hasSame(day, 'day'))
            .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())

          return (
            <button
              key={day.toISODate()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`min-h-24 bg-white p-1.5 text-left align-top hover:bg-page ${inMonth ? '' : 'bg-page/60'}`}
            >
              <span
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full font-serif text-xs ${
                  isToday ? 'bg-ink text-dark-text' : inMonth ? 'text-ink' : 'text-ink-muted/50'
                }`}
              >
                {day.day}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map((appt) => (
                  <div
                    key={appt.id}
                    className={`truncate rounded px-1 py-0.5 text-[10px] ${statusColorClasses(appt)}`}
                  >
                    {householdName(appt.householdId)}
                  </div>
                ))}
                {dayAppointments.length > MAX_CHIPS_PER_DAY && (
                  <p className="text-[10px] text-ink-muted">
                    +{dayAppointments.length - MAX_CHIPS_PER_DAY} more
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
