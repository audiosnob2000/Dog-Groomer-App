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

/**
 * Status pill/block colors, matching the design mockup's palette exactly
 * (https://claude.ai/artifact/Tg96dmvG8sMc8nWSVFwDPJ — Main.dc.html and
 * Calendar.dc.html's status pills and legend).
 */
export function statusColorClasses(appointment: Appointment): string {
  switch (appointment.status) {
    case 'confirmed':
      return 'bg-accent-soft text-accent-soft-text border-transparent'
    case 'booked':
      return 'bg-warn-soft text-warn-text border-transparent'
    case 'checked_in':
    case 'in_progress':
      return 'bg-accent text-white border-transparent'
    case 'completed':
      return appointment.payment.status !== 'paid'
        ? 'bg-danger-soft text-danger-text border-transparent'
        : 'bg-border-soft text-ink-dim border-transparent'
    case 'no_show':
      return 'bg-danger-soft text-danger-text border-transparent'
    case 'cancelled':
      return 'bg-border-soft text-ink-muted border-transparent line-through'
    default:
      return 'bg-border-soft text-ink-dim border-transparent'
  }
}
