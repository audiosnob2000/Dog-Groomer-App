import { Timestamp, addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { type FormEvent, useState } from 'react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import TextField from '../../components/ui/TextField'
import { petsCol } from '../../firebase/firestore'
import type { Pet, Vaccine } from '../../types/models'

interface DraftVaccine {
  type: string
  expiresOn: string // yyyy-mm-dd
}

function toDraftVaccines(pet?: Pet | null): DraftVaccine[] {
  if (!pet) return []
  return pet.vaccines.map((v) => ({
    type: v.type,
    expiresOn: v.expiresOn.toDate().toISOString().slice(0, 10),
  }))
}

interface PetFormModalProps {
  bizId: string
  householdId: string
  open: boolean
  onClose: () => void
  pet?: Pet | null
}

export default function PetFormModal({ bizId, householdId, open, onClose, pet }: PetFormModalProps) {
  const isEditing = Boolean(pet)
  const [name, setName] = useState(pet?.name ?? '')
  const [breed, setBreed] = useState(pet?.breed ?? '')
  const [sex, setSex] = useState<Pet['sex']>(pet?.sex ?? 'unknown')
  const [weightLb, setWeightLb] = useState(pet?.weightLb?.toString() ?? '')
  const [rebookEveryWeeks, setRebookEveryWeeks] = useState(pet?.rebookEveryWeeks?.toString() ?? '6')
  const [body, setBody] = useState(pet?.groomNotes?.body ?? '')
  const [face, setFace] = useState(pet?.groomNotes?.face ?? '')
  const [ears, setEars] = useState(pet?.groomNotes?.ears ?? '')
  const [finish, setFinish] = useState(pet?.groomNotes?.finish ?? '')
  const [handlingFlagsInput, setHandlingFlagsInput] = useState(pet?.handlingFlags.join(', ') ?? '')
  const [vaccines, setVaccines] = useState<DraftVaccine[]>(toDraftVaccines(pet))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Give this pet a name.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const vaccineRecords: Vaccine[] = vaccines
        .filter((v) => v.type.trim() && v.expiresOn)
        .map((v) => ({
          type: v.type.trim(),
          expiresOn: Timestamp.fromDate(new Date(`${v.expiresOn}T00:00:00`)),
        }))

      const handlingFlags = handlingFlagsInput
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)

      const payload = {
        name: name.trim(),
        breed: breed.trim() || undefined,
        sex,
        weightLb: weightLb ? Number(weightLb) : undefined,
        rebookEveryWeeks: rebookEveryWeeks ? Number(rebookEveryWeeks) : undefined,
        groomNotes: {
          body: body.trim() || undefined,
          face: face.trim() || undefined,
          ears: ears.trim() || undefined,
          finish: finish.trim() || undefined,
        },
        handlingFlags,
        vaccines: vaccineRecords,
      }

      if (pet) {
        await updateDoc(doc(petsCol(bizId), pet.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(petsCol(bizId), {
          id: '',
          householdId,
          photoUrls: [],
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this pet.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={isEditing ? `Edit ${pet?.name}` : 'Add a pet'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label htmlFor="pet-sex" className="text-sm font-medium text-slate-700">
              Sex
            </label>
            <select
              id="pet-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as Pet['sex'])}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <TextField
            label="Weight (lb)"
            type="number"
            min={0}
            value={weightLb}
            onChange={(e) => setWeightLb(e.target.value)}
          />
          <TextField
            label="Rebook every (weeks)"
            type="number"
            min={1}
            value={rebookEveryWeeks}
            onChange={(e) => setRebookEveryWeeks(e.target.value)}
            hint="Used for the Today dashboard's 'Due to rebook' list."
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Groom notes</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TextField label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
            <TextField label="Face" value={face} onChange={(e) => setFace(e.target.value)} />
            <TextField label="Ears" value={ears} onChange={(e) => setEars(e.target.value)} />
            <TextField label="Finish" value={finish} onChange={(e) => setFinish(e.target.value)} />
          </div>
        </div>

        <TextField
          label="Handling flags (comma-separated)"
          placeholder="e.g. muzzle for nails, ear infection"
          value={handlingFlagsInput}
          onChange={(e) => setHandlingFlagsInput(e.target.value)}
        />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Vaccines</h3>
            <button
              type="button"
              onClick={() => setVaccines((prev) => [...prev, { type: '', expiresOn: '' }])}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              + Add vaccine
            </button>
          </div>
          {vaccines.length === 0 && <p className="text-xs text-slate-400">None on file.</p>}
          {vaccines.map((v, i) => (
            <div key={i} className="mb-2 flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label="Type"
                  placeholder="Rabies"
                  value={v.type}
                  onChange={(e) =>
                    setVaccines((prev) =>
                      prev.map((vv, idx) => (idx === i ? { ...vv, type: e.target.value } : vv)),
                    )
                  }
                />
              </div>
              <div className="flex-1">
                <TextField
                  label="Expires"
                  type="date"
                  value={v.expiresOn}
                  onChange={(e) =>
                    setVaccines((prev) =>
                      prev.map((vv, idx) => (idx === i ? { ...vv, expiresOn: e.target.value } : vv)),
                    )
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => setVaccines((prev) => prev.filter((_, idx) => idx !== i))}
                className="mb-2 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Save changes' : 'Add pet'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
