import { Timestamp, orderBy, query, where } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { formatCents } from '../../lib/money'
import type { Appointment } from '../../types/models'
import BookingModal from './BookingModal'
import DayView from './DayView'
import MonthView from './MonthView'
import WeekView from './WeekView'

type ViewMode = 'day' | 'week' | 'month'

const LEGEND = [
  { label: 'Confirmed', swatch: 'bg-accent-soft' },
  { label: 'Awaiting reply', swatch: 'bg-warn-soft' },
  { label: 'Unpaid', swatch: 'bg-danger-soft' },
  { label: 'Done', swatch: 'bg-border-soft' },
] as const

export default function CalendarPage() {
  const { business } = useBusiness()
  const bizId = business!.id
  const timezone = business!.timezone

  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState<DateTime>(() => DateTime.now().setZone(timezone))
  const [bookingOpen, setBookingOpen] = useState(false)

  const range = useMemo(() => {
    if (view === 'day') return { start: anchor.startOf('day'), end: anchor.endOf('day') }
    if (view === 'week') return { start: anchor.startOf('week'), end: anchor.endOf('week') }
    // month view renders a padded grid (partial weeks before/after) — query that whole grid
    return { start: anchor.startOf('month').startOf('week'), end: anchor.endOf('month').endOf('week') }
  }, [view, anchor])

  const appointmentsQuery = useMemo(
    () =>
      query(
        appointmentsCol(bizId),
        where('startAt', '>=', Timestamp.fromDate(range.start.toJSDate())),
        where('startAt', '<=', Timestamp.fromDate(range.end.toJSDate())),
        orderBy('startAt'),
      ),
    [bizId, range.start, range.end],
  )
  const { data: appointments, loading, error } = useCollectionData(appointmentsQuery)

  const { data: households } = useCollectionData(useMemo(() => householdsCol(bizId), [bizId]))
  const { data: pets } = useCollectionData(useMemo(() => petsCol(bizId), [bizId]))

  const householdNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of households) map.set(h.id, h.displayName)
    return map
  }, [households])

  const petNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of pets) map.set(p.id, p.name)
    return map
  }, [pets])

  function householdName(householdId: string) {
    return householdNameById.get(householdId) ?? 'Unknown household'
  }

  function petNames(appointment: Appointment) {
    return appointment.petIds.map((id) => petNameById.get(id) ?? '?').join(', ')
  }

  function goToday() {
    setAnchor(DateTime.now().setZone(timezone))
  }

  function step(a: DateTime, direction: 1 | -1): DateTime {
    if (view === 'day') return a.plus({ days: direction })
    if (view === 'week') return a.plus({ weeks: direction })
    return a.plus({ months: direction })
  }

  function goPrev() {
    setAnchor((a) => step(a, -1))
  }

  function goNext() {
    setAnchor((a) => step(a, 1))
  }

  function selectDay(day: DateTime) {
    setAnchor(day)
    setView('day')
  }

  const activeAppointments = appointments.filter((a) => a.status !== 'cancelled')
  const bookedTotal = activeAppointments.reduce((sum, a) => sum + a.payment.subtotal, 0)

  const eyebrow =
    view === 'day'
      ? `${activeAppointments.length} appointments · ${formatCents(bookedTotal)} booked`
      : view === 'week'
        ? `Week of ${anchor.startOf('week').toFormat('LLL d')} · ${activeAppointments.length} appointments · ${formatCents(bookedTotal)} booked`
        : `${activeAppointments.length} appointments · ${formatCents(bookedTotal)} booked`

  const titleLabel =
    view === 'day' ? anchor.toFormat('cccc, LLLL d') : view === 'week' ? anchor.toFormat('LLLL yyyy') : anchor.toFormat('LLLL yyyy')

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            {eyebrow}
          </span>
          <h1 className="font-serif text-[46px] font-normal leading-[1.02] tracking-tight">
            {titleLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous"
              onClick={goPrev}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-white"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-10 rounded-[10px] border border-border bg-white px-3.5 text-[13.5px] font-medium"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-white"
            >
              →
            </button>
          </div>
          <div role="group" aria-label="View" className="flex gap-0.5 rounded-xl bg-border-soft p-[3px]">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`h-[34px] rounded-[9px] px-3.5 text-[13.5px] capitalize ${
                  view === mode ? 'bg-white font-medium shadow-[0_1px_2px_rgba(28,26,23,0.08)]' : 'text-ink-dim'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={() => setBookingOpen(true)}>+ New booking</Button>
        </div>
      </header>

      <div className="flex items-center gap-[18px]">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-ink-dim">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${item.swatch}`} />
            {item.label}
          </span>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-danger-text">{error}</p>}

      {!loading && view === 'day' && (
        <DayView
          date={anchor}
          business={business!}
          appointments={appointments}
          householdName={householdName}
          petNames={petNames}
        />
      )}
      {!loading && view === 'week' && (
        <WeekView
          weekStart={anchor.startOf('week')}
          business={business!}
          appointments={appointments}
          householdName={householdName}
          petNames={petNames}
          onSelectDay={selectDay}
        />
      )}
      {!loading && view === 'month' && (
        <MonthView
          month={anchor}
          appointments={appointments}
          householdName={householdName}
          onSelectDay={selectDay}
        />
      )}

      <BookingModal
        bizId={bizId}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialDate={anchor.toJSDate()}
        appointmentsForRange={appointments}
      />
    </div>
  )
}
