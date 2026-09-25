import { orderBy, query } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
import { avatarColorFor } from '../../lib/avatarColors'
import { formatPhoneForDisplay } from '../../lib/phone'
import CsvImportModal from './CsvImportModal'
import HouseholdFormModal from './HouseholdFormModal'

export default function HouseholdsPage() {
  const { business } = useBusiness()
  const bizId = business!.id

  const householdsQuery = useMemo(() => query(householdsCol(bizId), orderBy('displayName')), [bizId])
  const { data: households, loading } = useCollectionData(householdsQuery)
  const { data: pets } = useCollectionData(useMemo(() => petsCol(bizId), [bizId]))

  const petCountByHousehold = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pet of pets) counts.set(pet.householdId, (counts.get(pet.householdId) ?? 0) + 1)
    return counts
  }, [pets])

  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return households
    return households.filter(
      (h) =>
        h.displayName.toLowerCase().includes(q) ||
        h.contacts.some((c) => c.name.toLowerCase().includes(q) || c.phoneE164.includes(q)),
    )
  }, [households, search])

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl font-normal leading-none tracking-tight">Households</h1>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>+ Add household</Button>
        </div>
      </header>

      <label className="flex h-11 w-full max-w-md items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 text-ink-muted">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          aria-label="Search households"
          placeholder="Search by household, contact name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-grow border-0 bg-transparent text-sm text-ink outline-none"
        />
      </label>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          {households.length === 0
            ? 'No households yet. Add your first one, or import a client list from CSV.'
            : 'No households match your search.'}
        </div>
      )}

      <ul className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-white">
        {filtered.map((household) => {
          const primaryContact = household.contacts[0]
          const petCount = petCountByHousehold.get(household.id) ?? 0
          const avatar = avatarColorFor(household.displayName)
          return (
            <li key={household.id} className="border-b border-border-soft last:border-b-0">
              <Link
                to={`/households/${household.id}`}
                className="flex items-center gap-3.5 px-4 py-3 no-underline hover:bg-page"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-lg leading-none"
                  style={{ background: avatar.bg, color: avatar.text }}
                >
                  {household.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-grow">
                  <p className="font-medium text-ink">{household.displayName}</p>
                  {primaryContact && (
                    <p className="text-sm text-ink-muted">
                      {primaryContact.name} · {formatPhoneForDisplay(primaryContact.phoneE164)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm text-ink-muted">
                  {petCount} {petCount === 1 ? 'pet' : 'pets'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <HouseholdFormModal bizId={bizId} open={addOpen} onClose={() => setAddOpen(false)} />
      <CsvImportModal bizId={bizId} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
