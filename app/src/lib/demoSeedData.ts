import type { Appointment, Contact, Pet } from '../types/models'

/**
 * The standard demo dataset — five households with pets, vaccines and a
 * realistic mix of today's/past/upcoming appointments. Used by both the
 * one-time seeding (scripts/seed.mjs, against the emulator or a real
 * project via a service account) and the in-app "Reset demo data" button
 * (resetDemoData.ts, using the signed-in demo account's own normal write
 * access — no admin credentials needed for a reset).
 *
 * Appointment times are relative (days from "today", at seed/reset time),
 * not fixed dates, so the demo always looks current whenever it's reset.
 */

export type DemoContact = Omit<Contact, 'smsConsentAt' | 'smsConsentSource' | 'smsOptOut'>

export interface DemoPet {
  name: string
  breed: string
  sex: Pet['sex']
  weightLb: number
  rebookEveryWeeks?: number
  handlingFlags?: string[]
  groomNotes?: Pet['groomNotes']
  /** Days from today (can be negative for already-expired/near-term). */
  vaccines?: { type: string; expiresInDays: number }[]
}

export interface DemoHousehold {
  displayName: string
  contacts: DemoContact[]
  pets: DemoPet[]
}

export const DEMO_HOUSEHOLDS: DemoHousehold[] = [
  {
    displayName: 'Nair household',
    contacts: [{ name: 'Priya Nair', phoneE164: '+15550101001', email: 'priya@example.com' }],
    pets: [
      {
        name: 'Juniper',
        breed: 'Labradoodle',
        sex: 'female',
        weightLb: 42,
        rebookEveryWeeks: 6,
        groomNotes: { body: '#4 blade', face: 'Teddy bear scissor', ears: 'Plucked', finish: 'Bandana' },
        vaccines: [{ type: 'Rabies', expiresInDays: 10 }],
      },
    ],
  },
  {
    displayName: 'Delgado household',
    contacts: [{ name: 'Marcus Delgado', phoneE164: '+15550101002', email: 'marcus@example.com' }],
    pets: [
      {
        name: 'Biscuit',
        breed: 'Shih Tzu',
        sex: 'male',
        weightLb: 14,
        rebookEveryWeeks: 5,
        handlingFlags: ['Muzzle for nail trims'],
        vaccines: [{ type: 'Bordetella', expiresInDays: -5 }],
      },
      { name: 'Waffles', breed: 'Shih Tzu', sex: 'male', weightLb: 13, rebookEveryWeeks: 5 },
    ],
  },
  {
    displayName: 'Chen household',
    contacts: [{ name: 'Alan Chen', phoneE164: '+15550101003', email: 'alan@example.com' }],
    pets: [{ name: 'Mochi', breed: 'Pomeranian', sex: 'male', weightLb: 8, rebookEveryWeeks: 4 }],
  },
  {
    displayName: 'Okafor household',
    contacts: [{ name: 'Ngozi Okafor', phoneE164: '+15550101004', email: 'ngozi@example.com' }],
    pets: [{ name: 'Bruno', breed: 'German Shepherd', sex: 'male', weightLb: 75 }],
  },
  {
    displayName: 'Torres household',
    contacts: [{ name: 'Sam Torres', phoneE164: '+15550101005' }],
    pets: [{ name: 'Luna', breed: 'Poodle', sex: 'female', weightLb: 20 }],
  },
]

export interface DemoAppointment {
  household: string // matches DemoHousehold.displayName
  pets: string[] // matches DemoPet.name within that household
  /** Business days (Mon–Fri only) from today — see resetDemoData.ts's `at()`. */
  dayOffset: number
  hour: number
  minute: number
  durationMin: number
  serviceNames: string[] // matches services created in onboarding (Bath & Brush / Full Groom / Nail Trim)
  status: Appointment['status']
  paid: boolean
  confirmRequested?: boolean
  confirmedDayOffset?: number
}

// Kept within -2..+2 business days of "today" on purpose — a groomer
// demoing this to a prospect wants everything to read as "this week", not
// scattered across a month, and never on a day the shop is closed.
export const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    household: 'Okafor household',
    pets: ['Bruno'],
    dayOffset: 0,
    hour: 9,
    minute: 0,
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'confirmed',
    paid: false,
    confirmedDayOffset: -1,
  },
  {
    household: 'Torres household',
    pets: ['Luna'],
    dayOffset: 0,
    hour: 11,
    minute: 0,
    durationMin: 60,
    serviceNames: ['Bath & Brush', 'Nail Trim'],
    status: 'booked',
    paid: false,
    confirmRequested: true,
  },
  {
    household: 'Nair household',
    pets: ['Juniper'],
    dayOffset: 0,
    hour: 13,
    minute: 0,
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'checked_in',
    paid: false,
    confirmedDayOffset: -1,
  },
  {
    household: 'Torres household',
    pets: ['Luna'],
    dayOffset: -3,
    hour: 10,
    minute: 0,
    durationMin: 45,
    serviceNames: ['Bath & Brush'],
    status: 'completed',
    paid: false,
    confirmedDayOffset: -4,
  },
  {
    household: 'Chen household',
    pets: ['Mochi'],
    dayOffset: -1,
    hour: 10,
    minute: 0,
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'completed',
    paid: true,
    confirmedDayOffset: -2,
  },
  {
    household: 'Delgado household',
    pets: ['Biscuit', 'Waffles'],
    dayOffset: -3,
    hour: 9,
    minute: 0,
    durationMin: 90,
    serviceNames: ['Bath & Brush', 'Nail Trim'],
    status: 'completed',
    paid: true,
    confirmedDayOffset: -3,
  },
  {
    household: 'Nair household',
    pets: ['Juniper'],
    dayOffset: 1,
    hour: 10,
    minute: 0,
    durationMin: 45,
    serviceNames: ['Bath & Brush'],
    status: 'booked',
    paid: false,
  },
  {
    household: 'Okafor household',
    pets: ['Bruno'],
    dayOffset: 3,
    hour: 9,
    minute: 0,
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'confirmed',
    paid: false,
    confirmedDayOffset: 2,
  },
]
