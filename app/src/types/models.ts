/**
 * Firestore data model types, matching PLAN.md §4.
 *
 * Collections (all under `businesses/{bizId}` unless noted):
 *   businesses/{bizId}
 *     /services/{id}
 *     /households/{id}
 *     /pets/{id}
 *     /appointments/{id}
 *     /conversations/{householdId}/messages/{id}   (Phase 2)
 *   numberIndex/{e164}                               (Phase 2)
 *   users/{uid}                                       (client-side pointer: uid -> bizId)
 *
 * Phase 1 builds businesses, services, households, pets and appointments.
 * Messaging types are declared here (conversations/messages, smsProvider)
 * because they're referenced by the wider data model, but no UI is built
 * for them yet — that's Phase 2.
 */
import type { Timestamp } from 'firebase/firestore'

/** IANA time zone name, e.g. "America/Denver". */
export type IanaTimeZone = string

export interface BusinessHoursDay {
  /** 24h "HH:mm", e.g. "08:00". Absent/closed day = isOpen: false. */
  isOpen: boolean
  opensAt: string
  closesAt: string
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type BusinessHours = Record<WeekdayKey, BusinessHoursDay>

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'read_only'

export type SmsProviderMode = 'byoa' | 'hosted'

export type TenDlcStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

/** Phase 2 (§3). Declared now so the Business type is stable going forward. */
export interface SmsProvider {
  mode: SmsProviderMode
  smsNumber?: string // E.164
  twilioAccountSid?: string
  twilioApiKeySid?: string
  /** Points at a Secret Manager entry name. The key itself is never stored here. */
  secretRef?: string
  tenDlcStatus?: TenDlcStatus
  smsSentThisPeriod?: number
}

export type MemberRole = 'owner' | 'staff'

export interface Business {
  id: string
  name: string
  email: string
  timezone: IanaTimeZone
  hours: BusinessHours
  subscriptionStatus: SubscriptionStatus
  stripeCustomerId?: string
  trialEndsAt?: Timestamp
  smsProvider?: SmsProvider
  /** Members-ready from day one: solo owner today, staff can be added later (salon tier). */
  members: Record<string, MemberRole>
  /**
   * True only for the one shared "try the demo" account. Purely a marker
   * for the UI (shows the "Reset demo data" button) — it does not affect
   * Firestore security rules, which stay membership-based for everyone.
   * The public "Try the demo" button's read-only lock is enforced
   * separately, client-side (see DemoModeContext) — see PLAN.md-adjacent
   * discussion: a real server-side lock would need Cloud Functions, which
   * don't exist until Phase 2, so this is a deliberate, honest trade-off
   * for a low-stakes shared demo account, not a security boundary.
   */
  isDemo?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Service {
  id: string
  name: string
  durationMin: number
  price: number // cents
  isAddOn: boolean
  createdAt: Timestamp
}

export interface Contact {
  name: string
  phoneE164: string
  email?: string
  smsConsentAt?: Timestamp
  smsConsentSource?: 'form' | 'first_text_in'
  smsOptOut?: boolean
}

export interface Household {
  id: string
  displayName: string // e.g. "Nair household"
  notes?: string
  balanceCents: number
  contacts: Contact[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GroomNotes {
  body?: string
  face?: string
  ears?: string
  finish?: string
}

export interface Vaccine {
  type: string
  expiresOn: Timestamp
  docUrl?: string
}

export interface Pet {
  id: string
  householdId: string
  name: string
  breed?: string
  sex?: 'male' | 'female' | 'unknown'
  birthDate?: Timestamp
  weightLb?: number
  groomNotes?: GroomNotes
  handlingFlags: string[]
  vaccines: Vaccine[]
  rebookEveryWeeks?: number
  photoUrls: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'partial'

export interface AppointmentServiceLine {
  id: string
  price: number // cents, snapshot at booking time
}

export interface AppointmentPayment {
  status: PaymentStatus
  subtotal: number // cents
  tip?: number // cents
  method?: 'cash' | 'card' | 'text_to_pay' | 'other'
  paidAt?: Timestamp
  linkUrl?: string
}

export interface Appointment {
  id: string
  householdId: string
  petIds: string[]
  startAt: Timestamp
  endAt: Timestamp
  services: AppointmentServiceLine[]
  status: AppointmentStatus
  confirmRequested: boolean
  confirmedAt?: Timestamp
  reminderSentAt?: Timestamp
  followUpSentAt?: Timestamp
  payment: AppointmentPayment
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Phase 2 (§4). */
export interface Conversation {
  householdId: string
  lastMessageAt?: Timestamp
  lastSnippet?: string
  unreadCount: number
}

/** Phase 2 (§4). */
export interface Message {
  id: string
  direction: 'in' | 'out' | 'auto'
  body: string
  mediaUrls: string[]
  petIds: string[]
  appointmentId?: string
  twilioSid?: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  createdAt: Timestamp
  sentBy?: string
}

/** users/{uid} — a fast client-side pointer from a signed-in user to their business. */
export interface UserPointer {
  bizId: string
  role: MemberRole
}

export const WEEKDAY_ORDER: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export function defaultBusinessHours(): BusinessHours {
  const weekday: BusinessHoursDay = { isOpen: true, opensAt: '08:00', closesAt: '17:00' }
  const weekend: BusinessHoursDay = { isOpen: false, opensAt: '09:00', closesAt: '14:00' }
  return {
    mon: { ...weekday },
    tue: { ...weekday },
    wed: { ...weekday },
    thu: { ...weekday },
    fri: { ...weekday },
    sat: { ...weekend },
    sun: { ...weekend },
  }
}
