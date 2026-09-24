import { orderBy, query, where } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { appointmentsCol, householdDoc, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { useDocumentData } from '../../hooks/useDocumentData'
import { formatDateTime, vaccineStatus } from '../../lib/datetime'
import { formatCents } from '../../lib/money'
import { formatPhoneForDisplay } from '../../lib/phone'
import HouseholdFormModal from './HouseholdFormModal'
import PetFormModal from './PetFormModal'

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
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

  if (householdLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (!household) {
    return (
      <div className="text-sm text-slate-500">
        Household not found. <Link to="/households" className="text-indigo-600">Back to households</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/households" className="text-sm text-slate-500 hover:text-slate-700">
        ← Households
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{household.displayName}</h1>
          <div className="mt-1 space-y-0.5">
            {household.contacts.map((c, i) => (
              <p key={i} className="text-sm text-slate-500">
                {c.name} · {formatPhoneForDisplay(c.phoneE164)}
                {c.email ? ` · ${c.email}` : ''}
                {c.smsConsentAt ? (
                  <span className="ml-2 text-xs text-green-600">Agreed to texts</span>
                ) : (
                  <span className="ml-2 text-xs text-amber-600">No text consent on file</span>
                )}
              </p>
            ))}
          </div>
          {household.balanceCents > 0 && (
            <p className="mt-1 text-sm font-medium text-red-600">
              Balance due: {formatCents(household.balanceCents)}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setEditHouseholdOpen(true)}>
          Edit household
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {pets.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() => setActivePetId(pet.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              activePet?.id === pet.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {pet.name}
          </button>
        ))}
        <Button
          variant="secondary"
          onClick={() => {
            setEditingPet(null)
            setPetModalOpen(true)
          }}
        >
          + Add pet
        </Button>
      </div>

      {!activePet && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No pets yet for this household.
        </div>
      )}

      {activePet && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{activePet.name}</h2>
              <p className="text-sm text-slate-500">
                {[activePet.breed, activePet.sex !== 'unknown' ? activePet.sex : null, activePet.weightLb ? `${activePet.weightLb} lb` : null]
                  .filter(Boolean)
                  .join(' · ') || 'No details on file'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingPet(activePet)
                setPetModalOpen(true)
              }}
            >
              Edit
            </Button>
          </div>

          {activePet.handlingFlags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {activePet.handlingFlags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                >
                  ⚠ {flag}
                </span>
              ))}
            </div>
          )}

          {activePet.groomNotes && Object.values(activePet.groomNotes).some(Boolean) && (
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {activePet.groomNotes.body && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Body</p>
                  <p className="text-slate-700">{activePet.groomNotes.body}</p>
                </div>
              )}
              {activePet.groomNotes.face && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Face</p>
                  <p className="text-slate-700">{activePet.groomNotes.face}</p>
                </div>
              )}
              {activePet.groomNotes.ears && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Ears</p>
                  <p className="text-slate-700">{activePet.groomNotes.ears}</p>
                </div>
              )}
              {activePet.groomNotes.finish && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Finish</p>
                  <p className="text-slate-700">{activePet.groomNotes.finish}</p>
                </div>
              )}
            </div>
          )}

          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vaccines
          </div>
          {activePet.vaccines.length === 0 && (
            <p className="mb-3 text-sm text-slate-400">None on file.</p>
          )}
          <ul className="mb-3 space-y-1">
            {activePet.vaccines.map((v, i) => {
              const status = vaccineStatus(v.expiresOn, timezone)
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-700">{v.type}</span>
                  <span
                    className={
                      status === 'expired'
                        ? 'text-red-600'
                        : status === 'expiring'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                    }
                  >
                    expires {formatDateTime(v.expiresOn, timezone).split(' · ')[0]}
                    {status === 'expired' ? ' (expired)' : status === 'expiring' ? ' (expiring soon)' : ''}
                  </span>
                </li>
              )
            })}
          </ul>

          {activePet.rebookEveryWeeks && (
            <p className="text-xs text-slate-400">
              Usual rebook cadence: every {activePet.rebookEveryWeeks} weeks
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Visit history
        </h2>
        {appointments.length === 0 && <p className="text-sm text-slate-400">No visits yet.</p>}
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {appointments.map((appt) => (
            <li key={appt.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-700">{formatDateTime(appt.startAt, timezone)}</span>
              <span className="text-slate-500">{STATUS_LABELS[appt.status] ?? appt.status}</span>
            </li>
          ))}
        </ul>
      </div>

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
