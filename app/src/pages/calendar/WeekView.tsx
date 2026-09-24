import { DateTime } from 'luxon'
import AppointmentBlock from './AppointmentBlock'
import type { Appointment, Business } from '../../types/models'
import { WEEKDAY_ORDER } from '../../types/models'

interface WeekViewProps {
  weekStart: DateTime // Monday
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((day, i) => {
        const dayKey = WEEKDAY_ORDER[i]
        const isOpen = business.hours[dayKey].isOpen
        const isToday = now.hasSame(day, 'day')
        const dayAppointments = appointments
          .filter((a) => DateTime.fromJSDate(a.startAt.toDate(), { zone: weekStart.zone! }).hasSame(day, 'day'))
          .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())

        return (
          <div key={day.toISODate()} className="rounded-xl border border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className={`mb-2 w-full rounded-md px-2 py-1 text-left text-xs font-semibold ${
                isToday ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {day.toFormat('EEE d')}
            </button>
            {!isOpen && <p className="px-2 text-xs text-slate-300">Closed</p>}
            <div className="space-y-1">
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
