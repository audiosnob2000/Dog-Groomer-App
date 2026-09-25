import { Timestamp, limit, orderBy, query, where } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { STATUS_LABELS, statusColorClasses } from '../../lib/appointmentStatus'
import { avatarColorFor } from '../../lib/avatarColors'
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
  const bookedTotal = todayAppointments.reduce((sum, a) => sum + a.payment.subtotal, 0)
  const unpaidTotal = todayAppointments
    .filter((a) => a.payment.status !== 'paid')
    .reduce((sum, a) => sum + a.payment.subtotal, 0)
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
  const ownerFirstName = business?.name?.split(' ')[0]

  return (
    <div className="flex flex-col gap-[26px]">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            {now.toFormat('cccc, LLLL d')}
          </span>
          <h1 className="font-serif text-5xl font-normal leading-[1.02] tracking-tight">
            {greeting}{ownerFirstName ? `, ${ownerFirstName}.` : '.'}
          </h1>
        </div>
        <Link
          to="/calendar"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-4 text-sm font-medium text-white no-underline hover:bg-accent-dark"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New booking
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Dogs today" value={dogsToday} />
        <StatCard label="Booked today" value={formatCents(bookedTotal)} />
        <StatCard label="Awaiting payment" value={formatCents(unpaidTotal)} tone={unpaidTotal > 0 ? 'danger' : undefined} />
        <StatCard label="Unread messages" value="—" sub="Messaging arrives in Phase 2" />
      </div>

      <div className="flex min-h-0 flex-grow gap-[22px]">
        <section className="min-w-0 flex-grow rounded-[18px] border border-border bg-white p-4 pb-3">
          <div className="mb-1.5 flex items-center justify-between px-2 pb-1.5">
            <h2 className="m-0 text-[15.5px] font-semibold">Today's schedule</h2>
            <span className="text-[13px] text-ink-muted">
              {todayAppointments.length} {todayAppointments.length === 1 ? 'appointment' : 'appointments'} · {dogsToday} dogs
            </span>
          </div>

          {apptsLoading && <p className="px-2 py-4 text-sm text-ink-muted">Loading…</p>}
          {!apptsLoading && todayAppointments.length === 0 && (
            <div className="p-6 text-center text-sm text-ink-muted">
              Nothing booked for today.{' '}
              <Link to="/calendar" className="font-medium text-accent no-underline">
                Go to the calendar
              </Link>{' '}
              to add a booking.
            </div>
          )}

          {todayAppointments.map((appt) => {
            const avatar = avatarColorFor(petNames(appt) || appt.id)
            return (
              <Link
                key={appt.id}
                to={`/households/${appt.householdId}`}
                className="grid grid-cols-[76px_40px_minmax(110px,1fr)_auto_64px] items-center gap-x-3 border-b border-border-soft px-3.5 py-2.5 no-underline last:border-b-0 hover:bg-page"
              >
                <span className="text-[15px] font-semibold tabular-nums text-ink-dim">
                  {formatTime(appt.startAt, timezone)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-xl leading-none"
                  style={{ background: avatar.bg, color: avatar.text }}
                >
                  {(petNames(appt) || '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 truncate">
                  <span className="text-[14.5px] font-semibold text-ink">{petNames(appt)}</span>
                  <span className="text-[12.5px] text-ink-muted"> · {householdName(appt.householdId)}</span>
                </span>
                <span
                  className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium ${statusColorClasses(appt)}`}
                >
                  {STATUS_LABELS[appt.status]}
                </span>
                <span className="text-right text-sm font-medium tabular-nums text-ink-dim">
                  {formatCents(appt.payment.subtotal)}
                </span>
              </Link>
            )
          })}
        </section>

        <aside className="flex w-[372px] shrink-0 flex-col gap-3.5">
          <section className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-[15.5px] font-semibold tracking-tight">Needs attention</h2>
              <span className="text-[12.5px] text-ink-muted">
                {unconfirmedToday.length + unpaidCompleted.length + expiringVaccinePets.length} items
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {unconfirmedToday.map((appt) => (
                <AttentionRow
                  key={`unconfirmed-${appt.id}`}
                  to={`/households/${appt.householdId}`}
                  tone="warn"
                  title={`${householdName(appt.householdId)} hasn't confirmed`}
                  detail={`Today at ${formatTime(appt.startAt, timezone)}.`}
                  action="Text now"
                />
              ))}
              {unpaidCompleted.slice(0, 5).map((appt) => (
                <AttentionRow
                  key={`unpaid-${appt.id}`}
                  to={`/households/${appt.householdId}`}
                  tone="danger"
                  title={`${householdName(appt.householdId)} · ${formatCents(appt.payment.subtotal + (appt.payment.tip ?? 0))} unpaid`}
                  detail="Visit completed, payment still owed."
                  action="Text a payment link"
                />
              ))}
              {expiringVaccinePets.slice(0, 5).map(({ pet, vaccine, status }) => (
                <AttentionRow
                  key={`vax-${pet.id}-${vaccine.type}`}
                  to={`/households/${pet.householdId}`}
                  tone="info"
                  title={`${pet.name}'s ${vaccine.type} vaccine ${status === 'expired' ? 'has expired' : 'expires soon'}`}
                  detail="Ask the owner for an updated record."
                />
              ))}
              {unconfirmedToday.length === 0 &&
                unpaidCompleted.length === 0 &&
                expiringVaccinePets.length === 0 && (
                  <p className="text-sm text-ink-muted">Nothing needs attention. 🎉</p>
                )}
            </div>
          </section>

          <section className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-white p-5">
            <h2 className="m-0 text-[15.5px] font-semibold tracking-tight">Due to rebook</h2>
            {dueToRebook.length === 0 && (
              <p className="text-sm text-ink-muted">No one's overdue for a rebook.</p>
            )}
            <div className="flex flex-col gap-3">
              {dueToRebook.slice(0, 6).map(({ pet, dueSince }) => {
                const avatar = avatarColorFor(pet.name)
                return (
                  <Link
                    key={pet.id}
                    to={`/households/${pet.householdId}`}
                    className="flex items-center gap-3 no-underline"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-serif text-[19px] leading-none"
                      style={{ background: avatar.bg, color: avatar.text }}
                    >
                      {pet.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex flex-grow flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink">
                        {pet.name} · {householdName(pet.householdId)}
                      </span>
                      <span className="text-[12.5px] text-ink-muted">
                        Due {dueSince.toFormat('MMM d')} · usually every {pet.rebookEveryWeeks} weeks
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="flex flex-col gap-2.5 rounded-[18px] bg-ink p-5 text-dark-text">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-dark-accent-text">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
              </svg>
              Automatic reminders
            </div>
            <div className="font-serif text-2xl leading-[1.15]">
              Coming in Phase 2 — 24-hour text reminders, sent automatically.
            </div>
            <div className="text-[12.5px] leading-relaxed text-dark-text/80">
              Once client texting is connected, reminders go out 24 hours before each appointment and
              clients can reply to confirm.
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number | string
  sub?: string
  tone?: 'danger'
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] border border-border bg-white px-5 py-4.5">
      <span className="text-[13px] font-medium text-ink-muted">{label}</span>
      <span className="font-serif text-4xl leading-none tracking-tight tabular-nums">{value}</span>
      {sub && (
        <span className={`text-[12.5px] ${tone === 'danger' ? 'text-danger-text' : 'text-ink-muted'}`}>
          {sub}
        </span>
      )}
    </div>
  )
}

const TONE_ICON_CLASSES: Record<string, string> = {
  danger: 'bg-danger-soft text-danger-text',
  warn: 'bg-warn-soft text-warn-text',
  info: 'bg-accent-pale text-accent',
}

function AttentionRow({
  to,
  tone,
  title,
  detail,
  action,
}: {
  to: string
  tone: keyof typeof TONE_ICON_CLASSES
  title: string
  detail: string
  action?: string
}) {
  return (
    <Link to={to} className="flex items-start gap-3 no-underline">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${TONE_ICON_CLASSES[tone]}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-grow flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-[12.5px] leading-relaxed text-ink-muted">{detail}</span>
        {action && <span className="mt-0.5 text-[13px] font-medium text-accent">{action}</span>}
      </span>
    </Link>
  )
}
