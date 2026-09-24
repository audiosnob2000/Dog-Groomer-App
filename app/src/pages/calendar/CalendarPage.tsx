import { Timestamp, orderBy, query, where } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import type { Appointment } from '../../types/models'
import BookingModal from './BookingModal'
import DayView from './DayView'
import MonthView from './MonthView'
import WeekView from './WeekView'

type ViewMode = 'day' | 'week' | 'month'

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

  const headerLabel =
    view === 'day'
      ? anchor.toFormat('cccc, LLLL d, yyyy')
      : view === 'week'
        ? `${anchor.startOf('week').toFormat('LLL d')} – ${anchor.endOf('week').toFormat('LLL d, yyyy')}`
        : anchor.toFormat('LLLL yyyy')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={goPrev} aria-label="Previous">
            ←
          </Button>
          <Button variant="secondary" onClick={goToday}>
            Today
          </Button>
          <Button variant="secondary" onClick={goNext} aria-label="Next">
            →
          </Button>
          <h1 className="ml-2 text-lg font-semibold text-slate-900">{headerLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-md px-3 py-1 text-sm capitalize ${
                  view === mode ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <Button onClick={() => setBookingOpen(true)}>+ New booking</Button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

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
