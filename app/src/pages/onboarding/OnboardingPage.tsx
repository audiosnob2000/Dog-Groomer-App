import { Timestamp, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../contexts/AuthContext'
import { useBusiness } from '../../contexts/BusinessContext'
import { db } from '../../firebase/config'
import { businessesCol, servicesCol, userDoc } from '../../firebase/firestore'
import { centsToDollarsInput, dollarsToCents, formatCents } from '../../lib/money'
import { guessTimezone, listTimezones } from '../../lib/timezones'
import {
  type BusinessHours,
  type WeekdayKey,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  defaultBusinessHours,
} from '../../types/models'

interface DraftService {
  name: string
  durationMin: number
  priceInput: string
  isAddOn: boolean
}

const DEFAULT_SERVICES: DraftService[] = [
  { name: 'Bath & Brush', durationMin: 45, priceInput: centsToDollarsInput(3500), isAddOn: false },
  { name: 'Full Groom', durationMin: 90, priceInput: centsToDollarsInput(6500), isAddOn: false },
  { name: 'Nail Trim', durationMin: 15, priceInput: centsToDollarsInput(1500), isAddOn: true },
]

const STEPS = ['Your shop', 'Hours', 'Services', 'Review'] as const

const TIMEZONES = listTimezones()

export default function OnboardingPage() {
  const { user, signOutUser } = useAuth()
  const { business, businessLoading } = useBusiness()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [timezone, setTimezone] = useState(guessTimezone())
  const [hours, setHours] = useState<BusinessHours>(defaultBusinessHours())
  const [services, setServices] = useState<DraftService[]>(DEFAULT_SERVICES)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinueFromBasics = name.trim().length > 0 && email.trim().length > 0

  function updateHoursDay(day: WeekdayKey, patch: Partial<BusinessHours[WeekdayKey]>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  function updateService(index: number, patch: Partial<DraftService>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  function addService() {
    setServices((prev) => [
      ...prev,
      { name: '', durationMin: 30, priceInput: '0.00', isAddOn: false },
    ])
  }

  function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)

    try {
      const bizRef = doc(businessesCol())
      const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))

      // The business doc and the user's pointer to it are created together
      // — either both exist or neither does.
      const setupBatch = writeBatch(db)
      setupBatch.set(bizRef, {
        id: bizRef.id,
        name: name.trim(),
        email: email.trim(),
        timezone,
        hours,
        subscriptionStatus: 'trialing',
        trialEndsAt,
        members: { [user.uid]: 'owner' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setupBatch.set(userDoc(user.uid), {
        id: user.uid,
        bizId: bizRef.id,
        role: 'owner',
      })
      await setupBatch.commit()

      // Services are written in a second commit, after the business doc is
      // durably persisted. firestore.rules' services rule checks membership
      // via get(businesses/{bizId}) — inside the *same* atomic batch as the
      // business's own creation, that get() sees a not-yet-durable write and
      // the whole batch gets rejected. Splitting this into two commits
      // sidesteps that read-your-own-batch-writes edge case entirely.
      const validServices = services.filter((s) => s.name.trim().length > 0)
      if (validServices.length > 0) {
        const servicesBatch = writeBatch(db)
        for (const service of validServices) {
          const serviceRef = doc(servicesCol(bizRef.id))
          servicesBatch.set(serviceRef, {
            id: serviceRef.id,
            name: service.name.trim(),
            durationMin: service.durationMin,
            price: dollarsToCents(service.priceInput),
            isAddOn: service.isAddOn,
            createdAt: serverTimestamp(),
          })
        }
        await servicesBatch.commit()
      }

      // Deliberately no manual navigate() here: racing a client-side
      // redirect against BusinessContext's live listener picking up the
      // business we just wrote caused a real bug (redirect back to '/'
      // before the listener caught up -> RequireBusiness bounced to
      // /onboarding -> a *freshly mounted* wizard reset to step 1). The
      // guard below fires once `business` is genuinely known, which is
      // also what unmounts this form — so `submitting` stays true and the
      // button stays disabled until that happens, instead of flashing
      // back to an editable state first.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating your shop.')
      setSubmitting(false)
    }
  }

  // Already has a business (e.g. followed a stale link, or hit the back
  // button after finishing onboarding) — nothing to do here.
  if (!businessLoading && business) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-page px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-normal text-ink">Set up your shop</h1>
            <p className="text-sm text-ink-muted">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="text-xs text-ink-muted hover:text-ink-dim"
          >
            Sign out
          </button>
        </div>

        <ol className="mb-8 flex gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <TextField
                label="Shop name"
                placeholder="e.g. Wagging Tails Grooming"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextField
                label="Business email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="timezone" className="text-sm font-medium text-ink">
                  Time zone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-accent"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted">
                  Used to calculate "24 hours before" reminders and daylight saving correctly.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                When is the shop open? You can change this later in Settings.
              </p>
              {WEEKDAY_ORDER.map((day) => (
                <div key={day} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <label className="flex w-32 items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={hours[day].isOpen}
                      onChange={(e) => updateHoursDay(day, { isOpen: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-accent"
                    />
                    {WEEKDAY_LABELS[day]}
                  </label>
                  {hours[day].isOpen ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="time"
                        value={hours[day].opensAt}
                        onChange={(e) => updateHoursDay(day, { opensAt: e.target.value })}
                        className="rounded-xl border border-border px-2 py-1 text-sm"
                      />
                      <span className="text-ink-muted">to</span>
                      <input
                        type="time"
                        value={hours[day].closesAt}
                        onChange={(e) => updateHoursDay(day, { closesAt: e.target.value })}
                        className="rounded-xl border border-border px-2 py-1 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-ink-muted">Closed</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                Your services menu. Booking will only offer time slots that fit the total length.
              </p>
              <div className="space-y-2">
                {services.map((service, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                    <div className="min-w-[10rem] flex-1">
                      <TextField
                        label="Service"
                        value={service.name}
                        onChange={(e) => updateService(i, { name: e.target.value })}
                      />
                    </div>
                    <div className="w-24">
                      <TextField
                        label="Minutes"
                        type="number"
                        min={5}
                        step={5}
                        value={service.durationMin}
                        onChange={(e) => updateService(i, { durationMin: Number(e.target.value) })}
                      />
                    </div>
                    <div className="w-28">
                      <TextField
                        label="Price ($)"
                        type="number"
                        min={0}
                        step={0.5}
                        value={service.priceInput}
                        onChange={(e) => updateService(i, { priceInput: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-dim">
                      <input
                        type="checkbox"
                        checked={service.isAddOn}
                        onChange={(e) => updateService(i, { isAddOn: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-border text-accent"
                      />
                      Add-on
                    </label>
                    <button
                      type="button"
                      onClick={() => removeService(i)}
                      className="mb-2 text-xs text-danger-text hover:opacity-70"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={addService}>
                + Add a service
              </Button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">{name || '(no name)'}</h2>
                <p className="text-sm text-ink-muted">{email}</p>
                <p className="text-sm text-ink-muted">{timezone}</p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Hours
                </h3>
                <ul className="text-sm text-ink-dim">
                  {WEEKDAY_ORDER.map((day) => (
                    <li key={day}>
                      {WEEKDAY_LABELS[day]}:{' '}
                      {hours[day].isOpen ? `${hours[day].opensAt}–${hours[day].closesAt}` : 'Closed'}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Services
                </h3>
                <ul className="text-sm text-ink-dim">
                  {services
                    .filter((s) => s.name.trim())
                    .map((s, i) => (
                      <li key={i}>
                        {s.name} — {s.durationMin} min — {formatCents(dollarsToCents(s.priceInput))}
                        {s.isAddOn ? ' (add-on)' : ''}
                      </li>
                    ))}
                </ul>
              </div>

              {error && <p className="text-sm text-danger-text">{error}</p>}

              <Button type="submit" loading={submitting} className="w-full">
                Create my shop
              </Button>
            </form>
          )}
        </div>

        {step < 3 && (
          <div className="mt-4 flex justify-between">
            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
              Back
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={step === 0 && !canContinueFromBasics}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
