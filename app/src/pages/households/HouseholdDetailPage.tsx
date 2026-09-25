import { orderBy, query, where } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdDoc, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { useDocumentData } from '../../hooks/useDocumentData'
import { avatarColorFor } from '../../lib/avatarColors'
import { formatDate, formatDateTime, vaccineStatus } from '../../lib/datetime'
import { formatCents } from '../../lib/money'
import { formatPhoneForDisplay } from '../../lib/phone'
import HouseholdFormModal from './HouseholdFormModal'
import PetFormModal from './PetFormModal'

const STATUS_LABELS: Record<string, string> = {
  booked: 'Awaiting reply',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  in_progress: 'In progress',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

export default function HouseholdDetailPage() {
  const { householdId } = useParams<{ householdId: string }>()
  const { business } = useBusiness()
  const bizId = business!.id
  const timezone = business!.timezone

  const { data: household, loading: householdLoading } = useDocumentData(
    useMemo(() => (householdId ? householdDoc(bizId, householdId) : null), [bizId, householdId]),
  )

  const petsQuery = useMemo(
    () => (householdId ? query(petsCol(bizId), where('householdId', '==', householdId)) : null),
    [bizId, householdId],
  )
  const { data: pets } = useCollectionData(petsQuery)

  const appointmentsQuery = useMemo(
    () =>
      householdId
        ? query(appointmentsCol(bizId), where('householdId', '==', householdId), orderBy('startAt', 'desc'))
        : null,
    [bizId, householdId],
  )
  const { data: appointments } = useCollectionData(appointmentsQuery)

  const [activePetId, setActivePetId] = useState<string | null>(null)
  const [editHouseholdOpen, setEditHouseholdOpen] = useState(false)
  const [petModalOpen, setPetModalOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<(typeof pets)[number] | null>(null)

  const activePet = pets.find((p) => p.id === activePetId) ?? pets[0] ?? null

  const nextVisit = useMemo(() => {
    const now = Date.now()
    return appointments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed' && a.startAt.toMillis() >= now)
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())[0]
  }, [appointments])

  const visitCount = appointments.filter((a) => a.status === 'completed').length
  const lifetimeCents = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + a.payment.subtotal + (a.payment.tip ?? 0), 0)

  if (householdLoading) return <p className="text-sm text-ink-muted">Loading…</p>
  if (!household) {
    return (
      <div className="text-sm text-ink-muted">
        Household not found.{' '}
        <Link to="/households" className="font-medium text-accent">
          Back to households
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <Link to="/households" className="text-ink-muted no-underline">
          Households
        </Link>
        <span>›</span>
        <span className="text-ink">{household.displayName}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-[46px] font-normal leading-[1.02] tracking-tight">
            {household.displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-3.5 text-[13.5px] text-ink-dim">
            {household.contacts.map((c, i) => (
              <span key={i} className="flex items-center gap-3.5">
                {i > 0 && <span className="text-border">|</span>}
                <span className="tabular-nums">{formatPhoneForDisplay(c.phoneE164)}</span>
                {c.email && (
                  <>
                    <span className="text-border">|</span>
                    <span>{c.email}</span>
                  </>
                )}
                <span className="text-border">|</span>
                {c.smsConsentAt ? (
                  <span className="inline-flex items-center gap-1.5 text-accent-soft-text">
                    ✓ Agreed to texts on {formatDate(c.smsConsentAt, timezone)}
                  </span>
                ) : (
                  <span className="text-warn-text">No text consent on file</span>
                )}
              </span>
            ))}
          </div>
          {household.balanceCents > 0 && (
            <p className="text-sm font-medium text-danger-text">
              Balance due: {formatCents(household.balanceCents)}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditHouseholdOpen(true)}>
          Edit household
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2.5">
        {pets.map((pet) => {
          const isActive = activePet?.id === pet.id
          const avatar = avatarColorFor(pet.name)
          return (
            <button
              key={pet.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActivePetId(pet.id)}
              className={`flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4.5 text-left ${
                isActive ? 'border border-ink bg-white' : 'border border-border bg-transparent'
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-xl leading-none"
                style={{ background: avatar.bg, color: avatar.text }}
              >
                {pet.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-[15px] font-semibold">{pet.name}</span>
                <span className="text-[12.5px] text-ink-muted">
                  {[pet.breed, pet.weightLb ? `${pet.weightLb} lb` : null].filter(Boolean).join(' · ') || 'No details'}
                </span>
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            setEditingPet(null)
            setPetModalOpen(true)
          }}
          className="flex h-[66px] items-center gap-2 rounded-2xl border border-dashed border-border px-4.5 text-[13.5px] font-medium text-ink-dim"
        >
          + Add a pet
        </button>
      </div>

      {!activePet && (
        <div className="rounded-[18px] border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          No pets yet for this household.
        </div>
      )}

      {activePet && (
        <div className="flex gap-[22px]">
          <div className="flex min-w-0 flex-grow flex-col gap-4.5">
            <section className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-white px-5.5 py-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[15.5px] font-semibold tracking-tight">Groom notes</h2>
                <button
                  type="button"
                  className="text-[13px] font-medium text-accent"
                  onClick={() => {
                    setEditingPet(activePet)
                    setPetModalOpen(true)
                  }}
                >
                  Edit
                </button>
              </div>
              {activePet.groomNotes && Object.values(activePet.groomNotes).some(Boolean) ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(['body', 'face', 'ears', 'finish'] as const).map((key) =>
                    activePet.groomNotes?.[key] ? (
                      <div key={key} className="flex flex-col gap-1 rounded-xl bg-page px-3.5 py-3">
                        <span className="text-xs capitalize text-ink-muted">{key}</span>
                        <span className="text-sm font-medium">{activePet.groomNotes[key]}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  No groom notes yet —{' '}
                  <button
                    type="button"
                    className="font-medium text-accent"
                    onClick={() => {
                      setEditingPet(activePet)
                      setPetModalOpen(true)
                    }}
                  >
                    add some
                  </button>
                  .
                </p>
              )}
              {activePet.handlingFlags.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl bg-warn-soft px-3.5 py-3 text-[13.5px] leading-relaxed text-warn-text">
                  <span aria-hidden="true">⚠</span>
                  <span>
                    <strong className="font-semibold">Handling:</strong>{' '}
                    {activePet.handlingFlags.join(' · ')}
                  </span>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-white px-5.5 pb-2.5 pt-4.5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[15.5px] font-semibold tracking-tight">Visit history</h2>
                <span className="text-[12.5px] text-ink-muted">
                  {visitCount} {visitCount === 1 ? 'visit' : 'visits'}
                  {activePet.rebookEveryWeeks ? ` · usually every ${activePet.rebookEveryWeeks} weeks` : ''}
                  {lifetimeCents > 0 ? ` · ${formatCents(lifetimeCents)} lifetime` : ''}
                </span>
              </div>
              {appointments.length === 0 && <p className="pb-3 text-sm text-ink-muted">No visits yet.</p>}
              <div className="flex flex-col">
                {appointments.map((appt) => (
                  <Link
                    key={appt.id}
                    to="/calendar"
                    className="grid grid-cols-[76px_minmax(0,1fr)_70px_90px] items-center gap-3.5 border-t border-border-soft py-2.5 text-[13.5px] no-underline"
                  >
                    <span className="tabular-nums text-ink-dim">{formatDateTime(appt.startAt, timezone).split(' · ')[0]}</span>
                    <span className="truncate text-ink-dim">{STATUS_LABELS[appt.status] ?? appt.status}</span>
                    <span className="text-right tabular-nums">{formatCents(appt.payment.subtotal)}</span>
                    <span className="text-right">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${
                          appt.payment.status === 'paid' ? 'bg-accent-soft text-accent-soft-text' : 'bg-danger-soft text-danger-text'
                        }`}
                      >
                        {appt.payment.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex w-[352px] shrink-0 flex-col gap-3.5">
            {nextVisit && (
              <section className="flex flex-col gap-2 rounded-[18px] bg-ink p-5 text-dark-text">
                <span className="text-[12.5px] text-dark-text/70">Next visit</span>
                <span className="font-serif text-[27px] leading-[1.1]">
                  {formatDateTime(nextVisit.startAt, timezone)}
                </span>
                <span className="text-[13px] text-dark-text/70">
                  {formatCents(nextVisit.payment.subtotal)} · {STATUS_LABELS[nextVisit.status]}
                </span>
              </section>
            )}

            <section className="flex flex-col gap-1.5 rounded-[18px] border border-border bg-white px-5 pb-2 pt-4.5">
              <div className="flex items-center justify-between gap-3 pb-2">
                <h2 className="m-0 text-[15.5px] font-semibold tracking-tight">Vaccines</h2>
                <button
                  type="button"
                  className="text-[13px] font-medium text-accent"
                  onClick={() => {
                    setEditingPet(activePet)
                    setPetModalOpen(true)
                  }}
                >
                  Edit
                </button>
              </div>
              {activePet.vaccines.length === 0 && <p className="pb-3 text-sm text-ink-muted">None on file.</p>}
              <div className="flex flex-col">
                {activePet.vaccines.map((v, i) => {
                  const status = vaccineStatus(v.expiresOn, timezone)
                  return (
                    <div key={i} className="flex items-center justify-between border-t border-border-soft py-2.5">
                      <div className="flex flex-col gap-px">
                        <span className="text-[13.5px] font-medium">{v.type}</span>
                        <span className="text-xs text-ink-muted">
                          {status === 'expired' ? 'Expired' : 'Valid to'} {formatDate(v.expiresOn, timezone)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${
                          status === 'ok'
                            ? 'bg-accent-soft text-accent-soft-text'
                            : status === 'expiring'
                              ? 'bg-warn-soft text-warn-text'
                              : 'bg-danger-soft text-danger-text'
                        }`}
                      >
                        {status === 'ok' ? 'Current' : status === 'expiring' ? 'Due soon' : 'Expired'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>
        </div>
      )}

      <HouseholdFormModal
        bizId={bizId}
        open={editHouseholdOpen}
        onClose={() => setEditHouseholdOpen(false)}
        household={household}
      />
      {householdId && (
        <PetFormModal
          bizId={bizId}
          householdId={householdId}
          open={petModalOpen}
          onClose={() => setPetModalOpen(false)}
          pet={editingPet}
        />
      )}
    </div>
  )
}
