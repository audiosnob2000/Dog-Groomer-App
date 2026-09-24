import type { Appointment } from '../types/models'

export const STATUS_LABELS: Record<Appointment['status'], string> = {
  booked: 'Awaiting reply',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  in_progress: 'In progress',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

/** Background/text color for a status pill or calendar block, per PLAN.md §2 (status colors on the calendar). */
export function statusColorClasses(appointment: Appointment): string {
  switch (appointment.status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'booked':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'checked_in':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'completed':
      return appointment.payment.status !== 'paid'
        ? 'bg-orange-100 text-orange-800 border-orange-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'
    case 'no_show':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'cancelled':
      return 'bg-slate-100 text-slate-400 border-slate-200 line-through'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}
