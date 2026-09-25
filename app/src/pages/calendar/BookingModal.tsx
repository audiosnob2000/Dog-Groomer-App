import { Timestamp, addDoc, orderBy, query } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { type FormEvent, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import DemoSavedNotice from '../../components/ui/DemoSavedNotice'
import Modal from '../../components/ui/Modal'
import { useBusiness } from '../../contexts/BusinessContext'
import { useDemoMode } from '../../contexts/DemoModeContext'
import { appointmentsCol, householdsCol, petsCol, servicesCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { simulateDemoSave } from '../../lib/demoSave'
import { formatCents } from '../../lib/money'
import { availableSlotsForDay } from '../../lib/scheduling'
import type { Appointment } from '../../types/models'

interface BookingModalProps {
  bizId: string
  open: boolean
  onClose: () => void
  /** Prefills the date step, e.g. from a clicked calendar day. */
  initialDate?: Date
  /** So slot availability accounts for appointments the calendar already loaded. */
  appointmentsForRange: Appointment[]
}

export default function BookingModal({
  bizId,
  open,
  onClose,
  initialDate,
  appointmentsForRange,
}: BookingModalProps) {
  const { business } = useBusiness()
  const { isDemoReadOnly } = useDemoMode()
  const timezone = business!.timezone

  const { data: households } = useCollectionData(
    useMemo(() => query(householdsCol(bizId), orderBy('displayName')), [bizId]),
  )
  const { data: allPets } = useCollectionData(useMemo(() => petsCol(bizId), [bizId]))
  const { data: services } = useCollectionData(
    useMemo(() => query(servicesCol(bizId), orderBy('name')), [bizId]),
  )

  const [householdId, setHouseholdId] = useState('')
  const [petIds, setPetIds] = useState<string[]>([])
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [date, setDate] = useState(
    (initialDate ? DateTime.fromJSDate(initialDate) : DateTime.now()).toFormat('yyyy-MM-dd'),
  )
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [confirmRequested, setConfirmRequested] = useState(true)
  const [saving, setSaving] = useState(false)
  const [demoSaved, setDemoSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const petsForHousehold = allPets.filter((p) => p.householdId === householdId)
  const selectedServices = services.filter((s) => serviceIds.includes(s.id))
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)

  const slots = useMemo(() => {
    if (!business || totalDurationMin === 0) return []
    const day = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: timezone })
    return availableSlotsForDay(business, appointmentsForRange, day, totalDurationMin)
  }, [business, appointmentsForRange, date, timezone, totalDurationMin])

  function togglePet(id: string) {
    setPetIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    setSelectedSlot(null)
  }

  function resetAndClose() {
    setHouseholdId('')
    setPetIds([])
    setServiceIds([])
    setSelectedSlot(null)
    setSaving(false)
    setDemoSaved(false)
    setError(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!householdId) return setError('Pick a household.')
    if (petIds.length === 0) return setError('Pick at least one pet.')
    if (serviceIds.length === 0) return setError('Pick at least one service.')
    if (!selectedSlot) return setError('Pick a time slot.')

    setSaving(true)

    if (isDemoReadOnly) {
      setDemoSaved(true)
      simulateDemoSave(resetAndClose)
      return
    }

    try {
      const start = DateTime.fromISO(selectedSlot, { zone: timezone })
      const end = start.plus({ minutes: totalDurationMin })

      await addDoc(appointmentsCol(bizId), {
        id: '',
        householdId,
        petIds,
        startAt: Timestamp.fromDate(start.toJSDate()),
        endAt: Timestamp.fromDate(end.toJSDate()),
        services: selectedServices.map((s) => ({ id: s.id, price: s.price })),
        status: 'booked',
        confirmRequested,
        payment: { status: 'unpaid', subtotal: totalPrice },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      resetAndClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this booking.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="New booking" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="booking-household" className="text-xs text-ink-muted">
            Household
          </label>
          <select
            id="booking-household"
            value={householdId}
            onChange={(e) => {
              setHouseholdId(e.target.value)
              setPetIds([])
            }}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:border-accent"
          >
            <option value="">Select a household…</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.displayName}
              </option>
            ))}
          </select>
        </div>

        {householdId && (
          <div>
            <span className="mb-1 block text-xs text-ink-muted">Pets</span>
            {petsForHousehold.length === 0 ? (
              <p className="text-sm text-ink-muted">This household has no pets yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {petsForHousehold.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => togglePet(pet.id)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      petIds.includes(pet.id)
                        ? 'bg-accent text-white'
                        : 'border border-border text-ink-dim hover:bg-page'
                    }`}
                  >
                    {pet.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <span className="mb-1 block text-xs text-ink-muted">Services</span>
          <div className="space-y-1">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="h-4 w-4 rounded border-border text-accent"
                  />
                  {service.name}{' '}
                  <span className="text-xs text-ink-muted">({service.durationMin} min)</span>
                </span>
                <span className="text-ink-dim">{formatCents(service.price)}</span>
              </label>
            ))}
          </div>
          {totalDurationMin > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              Total: {totalDurationMin} min · {formatCents(totalPrice)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="booking-date" className="text-xs text-ink-muted">
            Date
          </label>
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setSelectedSlot(null)
            }}
            className="w-48 rounded-xl border border-border px-3 py-2 text-sm focus:border-accent"
          />
        </div>

        {totalDurationMin > 0 && (
          <div>
            <span className="mb-1 block text-xs text-ink-muted">Available times</span>
            {slots.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No slots long enough for {totalDurationMin} minutes on this day.
              </p>
            ) : (
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {slots.map((slot) => {
                  const iso = slot.toISO()!
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedSlot(iso)}
                      className={`rounded-xl px-3 py-1.5 text-sm ${
                        selectedSlot === iso
                          ? 'bg-accent text-white'
                          : 'border border-border text-ink-dim hover:bg-page'
                      }`}
                    >
                      {slot.toFormat('h:mm a')}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmRequested}
            onChange={(e) => setConfirmRequested(e.target.checked)}
            className="h-4 w-4 rounded border-border text-accent"
          />
          Send a confirmation reminder 24 hours before (Phase 2 — recorded now, sent once texting is set up)
        </label>

        {demoSaved && <DemoSavedNotice />}
        {error && <p className="text-sm text-danger-text">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Book appointment
          </Button>
        </div>
      </form>
    </Modal>
  )
}
