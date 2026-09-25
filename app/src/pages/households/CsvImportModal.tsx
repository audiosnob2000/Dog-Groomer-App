import { Timestamp, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useRef, useState } from 'react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { db } from '../../firebase/config'
import { householdsCol, petsCol } from '../../firebase/firestore'
import { type GroupedHousehold, type ParsedImport, groupRowsByHousehold, parseHouseholdsCsv } from './csvImport'

// Firestore batches top out at 500 writes; stay comfortably under that.
const BATCH_SIZE = 400

interface CsvImportModalProps {
  bizId: string
  open: boolean
  onClose: () => void
}

export default function CsvImportModal({ bizId, open, onClose }: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setParsed(null)
    setFileName('')
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setError(null)
    setResult(null)
    setFileName(file.name)
    const text = await file.text()
    const result = parseHouseholdsCsv(text)
    if (result.rows.length === 0) {
      setError(
        'No usable rows found. Make sure the CSV has a "household" (or "owner") column and a "phone" column.',
      )
      setParsed(null)
      return
    }
    setParsed(result)
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setError(null)
    try {
      const groups: GroupedHousehold[] = groupRowsByHousehold(parsed.rows)
      let petsImported = 0

      for (let i = 0; i < groups.length; i += BATCH_SIZE) {
        const chunk = groups.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        for (const group of chunk) {
          const householdRef = doc(householdsCol(bizId))
          batch.set(householdRef, {
            id: householdRef.id,
            displayName: group.displayName,
            balanceCents: 0,
            contacts: group.contacts.map((c) => ({
              name: c.name,
              phoneE164: c.phoneE164,
              email: c.email,
              smsConsentAt: Timestamp.now(),
              smsConsentSource: 'form',
              smsOptOut: false,
            })),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          for (const pet of group.pets) {
            const petRef = doc(petsCol(bizId))
            batch.set(petRef, {
              id: petRef.id,
              householdId: householdRef.id,
              name: pet.name,
              breed: pet.breed,
              handlingFlags: [],
              vaccines: [],
              photoUrls: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            petsImported += 1
          }
        }
        await batch.commit()
      }

      setResult(`Imported ${groups.length} households and ${petsImported} pets.`)
      setParsed(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed partway through.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import client list from CSV" wide>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Switching from another system? Export your client list as a CSV with columns like{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">household</code>,{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">contact name</code>,{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">phone</code>,{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">email</code>,{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">pet name</code>,{' '}
          <code className="rounded bg-page px-1 py-0.5 text-xs">breed</code>. One row per pet
          — two dogs in one household get two rows.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
          className="text-sm"
        />

        {parsed && (
          <div className="rounded-xl border border-border p-3">
            <p className="text-sm text-ink">
              <strong>{fileName}</strong>: found {parsed.householdCount} households and{' '}
              {parsed.petCount} pets across {parsed.rows.length} rows.
            </p>
            {parsed.skippedRows.length > 0 && (
              <p className="mt-1 text-xs text-warn-text">
                Skipped {parsed.skippedRows.length} row(s) missing a household name or phone
                number (rows {parsed.skippedRows.slice(0, 10).join(', ')}
                {parsed.skippedRows.length > 10 ? ', …' : ''}).
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger-text">{error}</p>}
        {result && <p className="text-sm text-accent-soft-text">{result}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {parsed && !result && (
            <Button type="button" onClick={() => void handleImport()} loading={importing}>
              Import {parsed.householdCount} households
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
