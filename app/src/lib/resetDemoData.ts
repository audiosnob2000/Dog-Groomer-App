import { type DocumentReference, Timestamp, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { DateTime } from 'luxon'
import { db } from '../firebase/config'
import { appointmentsCol, householdsCol, petsCol, servicesCol } from '../firebase/firestore'
import { DEMO_APPOINTMENTS, DEMO_HOUSEHOLDS } from './demoSeedData'

// Firestore batches top out at 500 writes; stay comfortably under that.
const BATCH_SIZE = 400

async function deleteAllInChunks(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + BATCH_SIZE)) {
      batch.delete(ref)
    }
    await batch.commit()
  }
}

/**
 * Wipes this business's households, pets and appointments and recreates
 * the standard demo dataset (demoSeedData.ts). Runs as the signed-in demo
 * account itself — a normal member write, same Firestore rules as any
 * other account, no special/admin access needed. Services (Bath & Brush
 * etc., created during onboarding) are left alone.
 */
export async function resetDemoData(bizId: string, timezone: string): Promise<void> {
  const [householdsSnap, petsSnap, appointmentsSnap, servicesSnap] = await Promise.all([
    getDocs(householdsCol(bizId)),
    getDocs(petsCol(bizId)),
    getDocs(appointmentsCol(bizId)),
    getDocs(servicesCol(bizId)),
  ])

  await deleteAllInChunks(appointmentsSnap.docs.map((d) => d.ref))
  await deleteAllInChunks(petsSnap.docs.map((d) => d.ref))
  await deleteAllInChunks(householdsSnap.docs.map((d) => d.ref))

  const serviceByName = new Map(servicesSnap.docs.map((d) => [d.data().name, { id: d.id, price: d.data().price }]))

  const now = Timestamp.now()
  const petIdByKey = new Map<string, string>() // "household::pet" -> new pet doc id
  const householdIdByName = new Map<string, string>()

  for (let i = 0; i < DEMO_HOUSEHOLDS.length; i += BATCH_SIZE) {
    const chunk = DEMO_HOUSEHOLDS.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const household of chunk) {
      const householdRef = doc(householdsCol(bizId))
      householdIdByName.set(household.displayName, householdRef.id)
      batch.set(householdRef, {
        id: householdRef.id,
        displayName: household.displayName,
        balanceCents: 0,
        contacts: household.contacts.map((c) => ({
          ...c,
          smsConsentAt: now,
          smsConsentSource: 'form',
          smsOptOut: false,
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      for (const pet of household.pets) {
        const petRef = doc(petsCol(bizId))
        petIdByKey.set(`${household.displayName}::${pet.name}`, petRef.id)
        batch.set(petRef, {
          id: petRef.id,
          householdId: householdRef.id,
          name: pet.name,
          breed: pet.breed,
          sex: pet.sex,
          weightLb: pet.weightLb,
          rebookEveryWeeks: pet.rebookEveryWeeks,
          handlingFlags: pet.handlingFlags ?? [],
          groomNotes: pet.groomNotes,
          vaccines: (pet.vaccines ?? []).map((v) => ({
            type: v.type,
            expiresOn: Timestamp.fromDate(DateTime.now().setZone(timezone).plus({ days: v.expiresInDays }).toJSDate()),
          })),
          photoUrls: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
    }
    await batch.commit()
  }

  // dayOffset counts business days (Mon–Fri only), not calendar days, so
  // the demo never books an appointment on a day the shop is closed and
  // the whole set stays within one business week no matter which day of
  // the week "Reset demo data" gets clicked on.
  function addBusinessDays(start: DateTime, offset: number): DateTime {
    let d = start
    const step = offset >= 0 ? 1 : -1
    for (let remaining = Math.abs(offset); remaining > 0; ) {
      d = d.plus({ days: step })
      if (d.weekday <= 5) remaining -= 1
    }
    return d
  }

  function at(dayOffset: number, hour: number, minute: number) {
    const now = DateTime.now().setZone(timezone)
    const today = now.weekday > 5 ? addBusinessDays(now, 1) : now // reset clicked on a weekend
    return addBusinessDays(today, dayOffset).set({ hour, minute, second: 0, millisecond: 0 })
  }

  for (let i = 0; i < DEMO_APPOINTMENTS.length; i += BATCH_SIZE) {
    const chunk = DEMO_APPOINTMENTS.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const appt of chunk) {
      const householdId = householdIdByName.get(appt.household)
      if (!householdId) continue
      const petIds = appt.pets
        .map((name) => petIdByKey.get(`${appt.household}::${name}`))
        .filter((id): id is string => Boolean(id))
      const services = appt.serviceNames
        .map((name) => serviceByName.get(name))
        .filter((s): s is { id: string; price: number } => Boolean(s))
      const subtotal = services.reduce((sum, s) => sum + s.price, 0)

      const start = at(appt.dayOffset, appt.hour, appt.minute)
      const end = start.plus({ minutes: appt.durationMin })
      const apptRef = doc(appointmentsCol(bizId))

      batch.set(apptRef, {
        id: apptRef.id,
        householdId,
        petIds,
        startAt: Timestamp.fromDate(start.toJSDate()),
        endAt: Timestamp.fromDate(end.toJSDate()),
        services: services.map((s) => ({ id: s.id, price: s.price })),
        status: appt.status,
        confirmRequested: appt.confirmRequested ?? Boolean(appt.confirmedDayOffset !== undefined),
        ...(appt.confirmedDayOffset !== undefined
          ? { confirmedAt: Timestamp.fromDate(at(appt.confirmedDayOffset, 9, 0).toJSDate()) }
          : {}),
        payment: { status: appt.paid ? 'paid' : 'unpaid', subtotal },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}
