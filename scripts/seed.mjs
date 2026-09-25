#!/usr/bin/env node
/**
 * Seeds the local Firebase emulators with a demo business, households,
 * pets and appointments so Phase 1 (auth, onboarding, households/pets,
 * calendar/booking, Today dashboard) can be exercised without typing in
 * data by hand.
 *
 * Emulator-only, on purpose: this never touches a real Firebase project,
 * so there's no risk of writing fake data into a groomer's real account.
 *
 * Usage (from the repo root):
 *   firebase emulators:start          # in one terminal
 *   cd scripts && npm install && npm run seed   # in another
 *
 * Then sign in to the app (with VITE_USE_FIREBASE_EMULATORS=true) as:
 *   demo@slotted.app / password123
 */
import admin from 'firebase-admin'
import { DateTime } from 'luxon'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-project'
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST

admin.initializeApp({ projectId: PROJECT_ID })
const db = admin.firestore()
const auth = admin.auth()

const TIMEZONE = 'America/Denver'
const DEMO_EMAIL = 'demo@slotted.app'
const DEMO_PASSWORD = 'password123'

function ts(dateTime) {
  return admin.firestore.Timestamp.fromDate(dateTime.toJSDate())
}

function at(daysFromToday, hour, minute = 0) {
  return DateTime.now().setZone(TIMEZONE).plus({ days: daysFromToday }).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  })
}

async function getOrCreateDemoUser() {
  try {
    return await auth.getUserByEmail(DEMO_EMAIL)
  } catch {
    return auth.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, emailVerified: true })
  }
}

async function main() {
  console.log(`Seeding demo data into project "${PROJECT_ID}" via emulators…`)
  console.log(`  Firestore: ${FIRESTORE_EMULATOR_HOST}`)
  console.log(`  Auth:      ${AUTH_EMULATOR_HOST}`)

  const user = await getOrCreateDemoUser()
  const uid = user.uid

  const bizRef = db.collection('businesses').doc()
  const bizId = bizRef.id
  const now = admin.firestore.Timestamp.now()

  const defaultHours = (openH, closeH) => ({ isOpen: true, opensAt: `${String(openH).padStart(2, '0')}:00`, closesAt: `${String(closeH).padStart(2, '0')}:00` })
  const closed = { isOpen: false, opensAt: '09:00', closesAt: '14:00' }

  await bizRef.set({
    name: 'Wagging Tails Grooming',
    email: DEMO_EMAIL,
    timezone: TIMEZONE,
    hours: {
      mon: defaultHours(8, 17),
      tue: defaultHours(8, 17),
      wed: defaultHours(8, 17),
      thu: defaultHours(8, 17),
      fri: defaultHours(8, 17),
      sat: defaultHours(9, 14),
      sun: closed,
    },
    subscriptionStatus: 'trialing',
    trialEndsAt: ts(DateTime.now().plus({ days: 14 })),
    members: { [uid]: 'owner' },
    // Marks this business for the app's "Reset demo data" button (see
    // ResetDemoDataButton.tsx) and the login page's "Try the demo" flow
    // (DemoModeContext.tsx) — purely a UI flag, doesn't affect security
    // rules. Fine to leave true even for local-dev seeding; only matters
    // if this account is also used as the real public demo login.
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.collection('users').doc(uid).set({ bizId, role: 'owner' })

  const services = [
    { name: 'Bath & Brush', durationMin: 45, price: 3500, isAddOn: false },
    { name: 'Full Groom', durationMin: 90, price: 6500, isAddOn: false },
    { name: 'Nail Trim', durationMin: 15, price: 1500, isAddOn: true },
  ]
  const serviceRefs = {}
  for (const service of services) {
    const ref = bizRef.collection('services').doc()
    serviceRefs[service.name] = { id: ref.id, price: service.price }
    await ref.set({ ...service, createdAt: now })
  }

  async function addHousehold({ displayName, contacts, pets }) {
    const householdRef = bizRef.collection('households').doc()
    await householdRef.set({
      displayName,
      balanceCents: 0,
      contacts: contacts.map((c) => ({
        ...c,
        smsConsentAt: now,
        smsConsentSource: 'form',
        smsOptOut: false,
      })),
      createdAt: now,
      updatedAt: now,
    })
    const petRefs = {}
    for (const pet of pets) {
      const petRef = bizRef.collection('pets').doc()
      petRefs[pet.name] = petRef.id
      await petRef.set({
        householdId: householdRef.id,
        photoUrls: [],
        handlingFlags: [],
        vaccines: [],
        ...pet,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { householdId: householdRef.id, petRefs }
  }

  const nair = await addHousehold({
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
        vaccines: [{ type: 'Rabies', expiresOn: ts(DateTime.now().plus({ days: 10 })) }],
      },
    ],
  })

  const delgado = await addHousehold({
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
        vaccines: [{ type: 'Bordetella', expiresOn: ts(DateTime.now().minus({ days: 5 })) }],
      },
      { name: 'Waffles', breed: 'Shih Tzu', sex: 'male', weightLb: 13, rebookEveryWeeks: 5 },
    ],
  })

  const chen = await addHousehold({
    displayName: 'Chen household',
    contacts: [{ name: 'Alan Chen', phoneE164: '+15550101003', email: 'alan@example.com' }],
    pets: [{ name: 'Mochi', breed: 'Pomeranian', sex: 'male', weightLb: 8, rebookEveryWeeks: 4 }],
  })

  const okafor = await addHousehold({
    displayName: 'Okafor household',
    contacts: [{ name: 'Ngozi Okafor', phoneE164: '+15550101004', email: 'ngozi@example.com' }],
    pets: [{ name: 'Bruno', breed: 'German Shepherd', sex: 'male', weightLb: 75 }],
  })

  const torres = await addHousehold({
    displayName: 'Torres household',
    contacts: [{ name: 'Sam Torres', phoneE164: '+15550101005' }],
    pets: [{ name: 'Luna', breed: 'Poodle', sex: 'female', weightLb: 20 }],
  })

  async function addAppointment({ household, petNames, dateTime, durationMin, serviceNames, status, payment, confirmRequested = true, confirmedAt }) {
    const petIds = petNames.map((n) => household.petRefs[n])
    const svc = serviceNames.map((n) => serviceRefs[n])
    const subtotal = svc.reduce((sum, s) => sum + s.price, 0)
    await bizRef.collection('appointments').add({
      householdId: household.householdId,
      petIds,
      startAt: ts(dateTime),
      endAt: ts(dateTime.plus({ minutes: durationMin })),
      services: svc.map((s) => ({ id: s.id, price: s.price })),
      status,
      confirmRequested,
      ...(confirmedAt ? { confirmedAt: ts(confirmedAt) } : {}),
      payment: { status: payment, subtotal },
      createdAt: now,
      updatedAt: now,
    })
  }

  // Today's schedule.
  await addAppointment({
    household: okafor,
    petNames: ['Bruno'],
    dateTime: at(0, 9, 0),
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'confirmed',
    payment: 'unpaid',
    confirmedAt: at(-1, 14, 0),
  })
  await addAppointment({
    household: torres,
    petNames: ['Luna'],
    dateTime: at(0, 11, 0),
    durationMin: 60,
    serviceNames: ['Bath & Brush', 'Nail Trim'],
    status: 'booked',
    payment: 'unpaid',
  })
  await addAppointment({
    household: nair,
    petNames: ['Juniper'],
    dateTime: at(0, 13, 0),
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'checked_in',
    payment: 'unpaid',
    confirmedAt: at(-1, 10, 0),
  })

  // A past unpaid visit -> shows up under "Needs attention".
  await addAppointment({
    household: torres,
    petNames: ['Luna'],
    dateTime: at(-3, 10, 0),
    durationMin: 45,
    serviceNames: ['Bath & Brush'],
    status: 'completed',
    payment: 'unpaid',
    confirmedAt: at(-4, 9, 0),
  })

  // Past completed visits so rebookEveryWeeks can compute "Due to rebook".
  await addAppointment({
    household: chen,
    petNames: ['Mochi'],
    dateTime: at(-40, 10, 0),
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'completed',
    payment: 'paid',
    confirmedAt: at(-41, 9, 0),
  })
  await addAppointment({
    household: delgado,
    petNames: ['Biscuit', 'Waffles'],
    dateTime: at(-38, 9, 0),
    durationMin: 90,
    serviceNames: ['Bath & Brush', 'Nail Trim'],
    status: 'completed',
    payment: 'paid',
    confirmedAt: at(-39, 9, 0),
  })

  // A couple more this week, for the week/month calendar views.
  await addAppointment({
    household: nair,
    petNames: ['Juniper'],
    dateTime: at(2, 10, 0),
    durationMin: 45,
    serviceNames: ['Bath & Brush'],
    status: 'booked',
    payment: 'unpaid',
  })
  await addAppointment({
    household: okafor,
    petNames: ['Bruno'],
    dateTime: at(4, 9, 0),
    durationMin: 90,
    serviceNames: ['Full Groom'],
    status: 'confirmed',
    payment: 'unpaid',
    confirmedAt: at(3, 9, 0),
  })

  console.log('\nDone! Sign in to the app with:')
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`\nBusiness ID: ${bizId}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
