import { Link } from 'react-router-dom'
import { statusColorClasses, STATUS_LABELS } from '../../lib/appointmentStatus'
import { formatTime } from '../../lib/datetime'
import type { Appointment } from '../../types/models'

interface AppointmentBlockProps {
  appointment: Appointment
  timezone: string
  householdName: string
  petNames: string
  compact?: boolean
}

export default function AppointmentBlock({
  appointment,
  timezone,
  householdName,
  petNames,
  compact = false,
}: AppointmentBlockProps) {
  return (
    <Link
      to={`/households/${appointment.householdId}`}
      className={`block rounded-[10px] px-2.5 py-1.5 text-left text-xs leading-tight no-underline hover:opacity-90 ${statusColorClasses(appointment)}`}
    >
      <div className="font-semibold">
        {formatTime(appointment.startAt, timezone)} · {householdName}
      </div>
      {!compact && (
        <>
          <div className="opacity-80">{petNames}</div>
          <div className="opacity-70">{STATUS_LABELS[appointment.status]}</div>
        </>
      )}
    </Link>
  )
}
