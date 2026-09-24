import { Timestamp, addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { type FormEvent, useState } from 'react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import TextField from '../../components/ui/TextField'
import { householdsCol } from '../../firebase/firestore'
import { normalizeUsPhoneE164 } from '../../lib/phone'
import type { Contact, Household } from '../../types/models'

interface DraftContact {
  name: string
  phone: string
  email: string
  smsConsent: boolean
}

function emptyContact(): DraftContact {
  return { name: '', phone: '', email: '', smsConsent: false }
}

function toDraftContacts(household?: Household | null): DraftContact[] {
  if (!household || household.contacts.length === 0) return [emptyContact()]
  return household.contacts.map((c) => ({
    name: c.name,
    phone: c.phoneE164,
    email: c.email ?? '',
    smsConsent: Boolean(c.smsConsentAt) && !c.smsOptOut,
  }))
}

interface HouseholdFormModalProps {
  bizId: string
  open: boolean
  onClose: () => void
  /** When set, edits this household instead of creating a new one. */
  household?: Household | null
}

export default function HouseholdFormModal({
  bizId,
  open,
  onClose,
  household,
}: HouseholdFormModalProps) {
  const isEditing = Boolean(household)
  const [displayName, setDisplayName] = useState(household?.displayName ?? '')
  const [notes, setNotes] = useState(household?.notes ?? '')
  const [contacts, setContacts] = useState<DraftContact[]>(toDraftContacts(household))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetAndClose() {
    setDisplayName('')
    setNotes('')
    setContacts([emptyContact()])
    setError(null)
    onClose()
  }

  function updateContact(i: number, patch: Partial<DraftContact>) {
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function removeContact(i: number) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim())
    if (validContacts.length === 0) {
      setError('Add at least one contact with a name and phone number.')
      return
    }

    setSaving(true)
    try {
      const contactRecords: Contact[] = validContacts.map((c, i) => {
        const existing = household?.contacts[i]
        const record: Contact = {
          name: c.name.trim(),
          phoneE164: normalizeUsPhoneE164(c.phone),
          email: c.email.trim() || undefined,
          smsOptOut: existing?.smsOptOut ?? false,
        }
        if (c.smsConsent) {
          record.smsConsentAt = existing?.smsConsentAt ?? Timestamp.now()
          record.smsConsentSource = existing?.smsConsentSource ?? 'form'
        }
        return record
      })

      if (household) {
        await updateDoc(doc(householdsCol(bizId), household.id), {
          displayName: displayName.trim(),
          notes: notes.trim() || undefined,
          contacts: contactRecords,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(householdsCol(bizId), {
          id: '',
          displayName: displayName.trim(),
          notes: notes.trim() || undefined,
          balanceCents: 0,
          contacts: contactRecords,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      resetAndClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this household.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title={isEditing ? 'Edit household' : 'Add household'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Household name"
          placeholder="e.g. Nair household"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        <div className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Contacts</span>
          {contacts.map((contact, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TextField
                  label="Name"
                  value={contact.name}
                  onChange={(e) => updateContact(i, { name: e.target.value })}
                />
                <TextField
                  label="Phone"
                  type="tel"
                  placeholder="(555) 014-2231"
                  value={contact.phone}
                  onChange={(e) => updateContact(i, { phone: e.target.value })}
                />
                <TextField
                  label="Email (optional)"
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(i, { email: e.target.value })}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={contact.smsConsent}
                    onChange={(e) => updateContact(i, { smsConsent: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                  />
                  Agreed to receive text messages
                </label>
                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setContacts((prev) => [...prev, emptyContact()])}
          >
            + Add another contact
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="household-notes" className="text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            id="household-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Save changes' : 'Add household'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
