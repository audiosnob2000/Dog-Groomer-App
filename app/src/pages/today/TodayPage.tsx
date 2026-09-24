import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { STATUS_LABELS, statusColorClasses } from '../../lib/appointmentStatus'
import { formatTime, vaccineStatus } from '../../lib/datetime'
import { formatCents } from '../../lib/money'
import type { Appointment, Pet } from '../../types/models'

const REBOOK_LOOKBACK_LIMIT = 200

export default function TodayPage() {
  const { business } = useBusiness()
  const bizId = business!.id
  const timezone = business!.timezone

  const now = DateTime.now().setZone(timezone)
  const todayStart = now.startOf('day')
  const todayEnd = now.endOf('day')

  const todayAppointmentsQuery = useMemo(
    () =>
      query(
        appointmentsCol(bizId),
        where('startAt', '>=', Timestamp.fromDate(todayStart.toJSDate())),
        where('startAt', '<=', Timestamp.fromDate(todayEnd.toJSDate())),
        orderBy('startAt'),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bizId, todayStart.toISODate()],
  )
  const { data: todayAppointments, loading: apptsLoading } = useCollectionData(todayAppointmentsQuery)

  // Recent completed appointments, used to work out who's due to rebook.
  const recentCompletedQuery = useMemo(
    () =>
      query(
        appointmentsCol(bizId),
        where('status', '==', 'completed'),
        orderBy('startAt', 'desc'),
        limit(REBOOK_LOOKBACK_LIMIT),
      ),
    [bizId],
  )
  const { data: recentCompleted } = useCollectionData(recentCompletedQuery)

  const { data: households } = useCollectionData(useMemo(() => householdsCol(bizId), [bizId]))
  const { data: pets } = useCollectionData(useMemo(() => petsCol(bizId), [bizId]))

  const householdNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of households) map.set(h.id, h.displayName)
    return map
  }, [households])

  const petById = useMemo(() => {
    const map = new Map<string, Pet>()
    for (const p of pets) map.set(p.id, p)
    return map
  }, [pets])

  function householdName(householdId: string) {
    return householdNameById.get(householdId) ?? 'Unknown household'
  }

  function petNames(appointment: Appointment) {
    return appointment.petIds.map((id) => petById.get(id)?.name ?? '?').join(', ')
  }

  const activeToday = todayAppointments.filter((a) => a.status !== 'cancelled')
  const dogsToday = new Set(activeToday.flatMap((a) => a.petIds)).size
  const unpaidToday = todayAppointments.filter((a) => a.payment.status !== 'paid').length
  const unconfirmedToday = todayAppointments.filter(
    (a) => a.confirmRequested && a.status === 'booked',
  )

  const expiringVaccinePets = useMemo(() => {
    return pets
      .flatMap((pet) =>
        pet.vaccines
          .map((v) => ({ pet, vaccine: v, status: vaccineStatus(v.expiresOn, timezone) }))
          .filter((v) => v.status !== 'ok'),
      )
      .sort((a, b) => a.vaccine.expiresOn.toMillis() - b.vaccine.expiresOn.toMillis())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, timezone])

  const unpaidCompleted = useMemo(
    () => recentCompleted.filter((a) => a.payment.status !== 'paid'),
    [recentCompleted],
  )

  const dueToRebook = useMemo(() => {
    const lastCompletedByPet = new Map<string, Timestamp>()
    for (const appt of recentCompleted) {
      for (const petId of appt.petIds) {
        const existing = lastCompletedByPet.get(petId)
        if (!existing || appt.startAt.toMillis() > existing.toMillis()) {
          lastCompletedByPet.set(petId, appt.startAt)
        }
      }
    }

    const results: { pet: Pet; lastVisit: Timestamp; dueSince: DateTime }[] = []
    for (const pet of pets) {
      if (!pet.rebookEveryWeeks) continue
      const lastVisit = lastCompletedByPet.get(pet.id)
      if (!lastVisit) continue
      const dueDate = DateTime.fromJSDate(lastVisit.toDate(), { zone: timezone }).plus({
        weeks: pet.rebookEveryWeeks,
      })
      if (dueDate <= now) {
        results.push({ pet, lastVisit, dueSince: dueDate })
      }
    }
    return results.sort((a, b) => a.dueSince.toMillis() - b.dueSince.toMillis())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets, recentCompleted, timezone])

  const greeting = now.hour < 12 ? 'Good morning' : now.hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {greeting}
          {business?.name ? `, ${business.name}` : ''}
        </h1>
        <p className="text-sm text-slate-500">{now.toFormat('cccc, LLLL d, yyyy')}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dogs today" value={dogsToday} />
        <StatCard label="Booked" value={todayAppointments.length} />
        <StatCard label="Unpaid" value={unpaidToday} />
        <StatCard label="Unread" value="—" hint="Messaging arrives in Phase 2" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Today's schedule
          </h2>
          {apptsLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {!apptsLoading && todayAppointments.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Nothing booked for today.{' '}
              <Link to="/calendar" className="text-indigo-600 hover:text-indigo-500">
                Go to the calendar
              </Link>{' '}
              to add a booking.
            </div>
          )}
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {todayAppointments.map((appt) => (
              <li key={appt.id}>
                <Link
                  to={`/households/${appt.householdId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatTime(appt.startAt, timezone)} · {householdName(appt.householdId)}
                    </p>
                    <p className="text-sm text-slate-500">{petNames(appt)}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColorClasses(appt)}`}
                  >
                    {STATUS_LABELS[appt.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Needs attention
            </h2>
            <div className="space-y-2">
              {unconfirmedToday.map((appt) => (
                <AttentionRow
                  key={`unconfirmed-${appt.id}`}
                  to={`/households/${appt.householdId}`}
                  tone="amber"
                  text={`${householdName(appt.householdId)} hasn't confirmed today's ${formatTime(appt.startAt, timezone)} visit`}
                />
              ))}
              {unpaidCompleted.slice(0, 5).map((appt) => (
                <AttentionRow
                  key={`unpaid-${appt.id}`}
                  to={`/households/${appt.householdId}`}
                  tone="orange"
                  text={`${householdName(appt.householdId)} owes ${formatCents(appt.payment.subtotal + (appt.payment.tip ?? 0))}`}
                />
              ))}
              {expiringVaccinePets.slice(0, 5).map(({ pet, vaccine, status }) => (
                <AttentionRow
                  key={`vax-${pet.id}-${vaccine.type}`}
                  to={`/households/${pet.householdId}`}
                  tone="red"
                  text={`${pet.name}'s ${vaccine.type} vaccine ${status === 'expired' ? 'has expired' : 'expires soon'}`}
                />
              ))}
              {unconfirmedToday.length === 0 &&
                unpaidCompleted.length === 0 &&
                expiringVaccinePets.length === 0 && (
                  <p className="text-sm text-slate-400">Nothing needs attention. 🎉</p>
                )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Due to rebook
            </h2>
            {dueToRebook.length === 0 && (
              <p className="text-sm text-slate-400">No one's overdue for a rebook.</p>
            )}
            <div className="space-y-2">
              {dueToRebook.slice(0, 8).map(({ pet, dueSince }) => (
                <AttentionRow
                  key={pet.id}
                  to={`/households/${pet.householdId}`}
                  tone="slate"
                  text={`${pet.name} was due ${dueSince.toFormat('MMM d')}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Reminder queue
            </h2>
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Automatic confirmation texts and follow-ups go out once client texting is connected
              (Phase 2 — Settings → Texting).
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" title={hint}>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

const TONE_CLASSES: Record<string, string> = {
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  orange: 'bg-orange-50 border-orange-200 text-orange-800',
  red: 'bg-red-50 border-red-200 text-red-800',
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
}

function AttentionRow({ to, tone, text }: { to: string; tone: keyof typeof TONE_CLASSES; text: string }) {
  return (
    <Link to={to} className={`block rounded-lg border px-3 py-2 text-sm hover:opacity-80 ${TONE_CLASSES[tone]}`}>
      {text}
    </Link>
  )
}
