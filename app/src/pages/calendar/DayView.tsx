import { DateTime } from 'luxon'
import { Link } from 'react-router-dom'
import { statusColorClasses, STATUS_LABELS } from '../../lib/appointmentStatus'
import { formatTime } from '../../lib/datetime'
import { openIntervalForDay } from '../../lib/scheduling'
import type { Appointment, Business } from '../../types/models'

const HOUR_HEIGHT_PX = 60

interface DayViewProps {
  date: DateTime
  business: Business
  appointments: Appointment[]
  householdName: (householdId: string) => string
  petNames: (appointment: Appointment) => string
}

export default function DayView({ date, business, appointments, householdName, petNames }: DayViewProps) {
  const openInterval = openIntervalForDay(business, date)
  const startHour = openInterval ? Math.max(0, openInterval.start!.hour - 1) : 7
  const endHour = openInterval ? Math.min(24, openInterval.end!.hour + 1) : 20
  const totalHours = Math.max(1, endHour - startHour)

  const now = DateTime.now().setZone(date.zone)
  const isToday = now.hasSame(date, 'day')
  const nowOffsetPx = ((now.hour + now.minute / 60 - startHour) / totalHours) * (totalHours * HOUR_HEIGHT_PX)

  const dayAppointments = appointments.filter((a) => {
    const start = DateTime.fromJSDate(a.startAt.toDate(), { zone: date.zone })
    return start.hasSame(date, 'day')
  })

  function minutesFromStart(dt: DateTime) {
    return (dt.hour - startHour) * 60 + dt.minute
  }

  if (!openInterval) {
    return (
      <div className="rounded-[18px] border border-dashed border-border p-8 text-center text-sm text-ink-muted">
        Closed on {date.toFormat('cccc')}s.
        {dayAppointments.length > 0 && (
          <p className="mt-2">There {dayAppointments.length === 1 ? 'is' : 'are'} still {dayAppointments.length} appointment(s) booked.</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex rounded-[18px] border border-border bg-white">
      <div className="w-16 shrink-0 border-r border-border-soft text-right text-[11.5px] tabular-nums text-ink-muted">
        {Array.from({ length: totalHours }, (_, i) => startHour + i).map((hour) => (
          <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="pr-2.5 pt-1">
            {DateTime.fromObject({ hour }).toFormat('h a')}
          </div>
        ))}
      </div>
      <div className="relative flex-1" style={{ height: totalHours * HOUR_HEIGHT_PX }}>
        {Array.from({ length: totalHours }, (_, i) => (
          <div
            key={i}
            className="absolute inset-x-0 border-t border-border-soft"
            style={{ top: i * HOUR_HEIGHT_PX }}
          />
        ))}
        {isToday && nowOffsetPx >= 0 && nowOffsetPx <= totalHours * HOUR_HEIGHT_PX && (
          <div className="absolute inset-x-0 z-10 border-t-2 border-danger-text" style={{ top: nowOffsetPx }}>
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger-text" />
          </div>
        )}
        {dayAppointments.map((appt) => {
          const start = DateTime.fromJSDate(appt.startAt.toDate(), { zone: date.zone })
          const end = DateTime.fromJSDate(appt.endAt.toDate(), { zone: date.zone })
          const top = (minutesFromStart(start) / 60) * HOUR_HEIGHT_PX
          const height = Math.max(20, (end.diff(start, 'minutes').minutes / 60) * HOUR_HEIGHT_PX)
          return (
            <Link
              key={appt.id}
              to={`/households/${appt.householdId}`}
              className={`absolute left-1 right-1 overflow-hidden rounded-[10px] px-2.5 py-1.5 text-xs no-underline hover:opacity-90 ${statusColorClasses(appt)}`}
              style={{ top, height }}
            >
              <div className="font-semibold">
                {formatTime(appt.startAt, date.zone!.name)} · {householdName(appt.householdId)}
              </div>
              <div className="truncate opacity-80">{petNames(appt)}</div>
              <div className="opacity-70">{STATUS_LABELS[appt.status]}</div>
            </Link>
          )
        })}
        {dayAppointments.length === 0 && (
          <p className="p-4 text-sm text-ink-muted">Nothing booked yet.</p>
        )}
      </div>
    </div>
  )
}
