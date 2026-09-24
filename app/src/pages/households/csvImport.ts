import Papa from 'papaparse'
import { normalizeUsPhoneE164 } from '../../lib/phone'

/**
 * Expected CSV columns (case-insensitive, flexible header names — see
 * HEADER_ALIASES). Only `household` and `phone` are required; everything
 * else is optional. One row per pet — two dogs in the same household get
 * two rows with the same household/contact info.
 */
export interface CsvRow {
  household: string
  contactName: string
  phone: string
  email: string
  petName: string
  breed: string
}

export interface ParsedImport {
  rows: CsvRow[]
  /** Row numbers (1-based, matching what a spreadsheet shows) skipped for missing required fields. */
  skippedRows: number[]
  householdCount: number
  petCount: number
}

const HEADER_ALIASES: Record<keyof CsvRow, string[]> = {
  household: ['household', 'household name', 'family', 'client', 'owner household'],
  contactName: ['contact', 'contact name', 'owner', 'owner name', 'name'],
  phone: ['phone', 'phone number', 'mobile', 'cell'],
  email: ['email', 'email address'],
  petName: ['pet', 'pet name', 'dog', 'dog name'],
  breed: ['breed'],
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias)
    if (idx !== -1) return headers[idx]
  }
  return undefined
}

export function parseHouseholdsCsv(csvText: string): ParsedImport {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const headers = result.meta.fields ?? []
  const columnMap: Partial<Record<keyof CsvRow, string>> = {}
  for (const key of Object.keys(HEADER_ALIASES) as (keyof CsvRow)[]) {
    columnMap[key] = findColumn(headers, HEADER_ALIASES[key])
  }

  const rows: CsvRow[] = []
  const skippedRows: number[] = []

  result.data.forEach((raw, i) => {
    const household = (columnMap.household ? raw[columnMap.household] : '')?.trim() ?? ''
    const phone = (columnMap.phone ? raw[columnMap.phone] : '')?.trim() ?? ''
    if (!household || !phone) {
      skippedRows.push(i + 2) // +1 for header row, +1 for 1-based
      return
    }
    rows.push({
      household,
      contactName: (columnMap.contactName ? raw[columnMap.contactName] : '')?.trim() ?? household,
      phone: normalizeUsPhoneE164(phone),
      email: (columnMap.email ? raw[columnMap.email] : '')?.trim() ?? '',
      petName: (columnMap.petName ? raw[columnMap.petName] : '')?.trim() ?? '',
      breed: (columnMap.breed ? raw[columnMap.breed] : '')?.trim() ?? '',
    })
  })

  const householdNames = new Set(rows.map((r) => r.household.toLowerCase()))
  const petCount = rows.filter((r) => r.petName).length

  return { rows, skippedRows, householdCount: householdNames.size, petCount }
}

export interface GroupedHousehold {
  displayName: string
  contacts: { name: string; phoneE164: string; email?: string }[]
  pets: { name: string; breed?: string }[]
}

export function groupRowsByHousehold(rows: CsvRow[]): GroupedHousehold[] {
  const byName = new Map<string, GroupedHousehold>()

  for (const row of rows) {
    const key = row.household.toLowerCase()
    let group = byName.get(key)
    if (!group) {
      group = { displayName: row.household, contacts: [], pets: [] }
      byName.set(key, group)
    }
    if (row.contactName && !group.contacts.some((c) => c.phoneE164 === row.phone)) {
      group.contacts.push({
        name: row.contactName,
        phoneE164: row.phone,
        email: row.email || undefined,
      })
    }
    if (row.petName && !group.pets.some((p) => p.name === row.petName)) {
      group.pets.push({ name: row.petName, breed: row.breed || undefined })
    }
  }

  return Array.from(byName.values())
}
