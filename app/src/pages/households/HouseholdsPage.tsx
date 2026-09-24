import { orderBy, query } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { useBusiness } from '../../contexts/BusinessContext'
import { householdsCol, petsCol } from '../../firebase/firestore'
import { useCollectionData } from '../../hooks/useCollectionData'
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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Households</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>+ Add household</Button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search by household, contact name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {households.length === 0
            ? 'No households yet. Add your first one, or import a client list from CSV.'
            : 'No households match your search.'}
        </div>
      )}

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {filtered.map((household) => {
          const primaryContact = household.contacts[0]
          const petCount = petCountByHousehold.get(household.id) ?? 0
          return (
            <li key={household.id}>
              <Link
                to={`/households/${household.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{household.displayName}</p>
                  {primaryContact && (
                    <p className="text-sm text-slate-500">
                      {primaryContact.name} · {formatPhoneForDisplay(primaryContact.phoneE164)}
                    </p>
                  )}
                </div>
                <span className="text-sm text-slate-400">
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
