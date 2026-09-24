/**
 * Typed Firestore collection references, all scoped under a business per
 * the data model in PLAN.md §4:
 *
 *   businesses/{bizId}/services/{id}
 *   businesses/{bizId}/households/{id}
 *   businesses/{bizId}/pets/{id}
 *   businesses/{bizId}/appointments/{id}
 *
 * A `FirestoreDataConverter` per type keeps `id` off the stored document
 * (Firestore already knows it as the doc id) but present on every object
 * the app works with, and gives every read/write a TS type instead of
 * `DocumentData`.
 */
import {
  type CollectionReference,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  collection,
  doc,
} from 'firebase/firestore'
import { db } from './config'
import type { Appointment, Business, Household, Pet, Service, UserPointer } from '../types/models'

function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(value: T): DocumentData {
      const { id: _id, ...rest } = value
      return rest
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options)
      return { ...(data as Omit<T, 'id'>), id: snapshot.id } as T
    },
  }
}

const businessConverter = makeConverter<Business>()
const serviceConverter = makeConverter<Service>()
const householdConverter = makeConverter<Household>()
const petConverter = makeConverter<Pet>()
const appointmentConverter = makeConverter<Appointment>()
const userPointerConverter = makeConverter<UserPointer & { id: string }>()

export function businessesCol(): CollectionReference<Business> {
  return collection(db, 'businesses').withConverter(businessConverter)
}

export function businessDoc(bizId: string) {
  return doc(businessesCol(), bizId)
}

export function servicesCol(bizId: string): CollectionReference<Service> {
  return collection(db, 'businesses', bizId, 'services').withConverter(serviceConverter)
}

export function householdsCol(bizId: string): CollectionReference<Household> {
  return collection(db, 'businesses', bizId, 'households').withConverter(householdConverter)
}

export function householdDoc(bizId: string, householdId: string) {
  return doc(householdsCol(bizId), householdId)
}

export function petsCol(bizId: string): CollectionReference<Pet> {
  return collection(db, 'businesses', bizId, 'pets').withConverter(petConverter)
}

export function petDoc(bizId: string, petId: string) {
  return doc(petsCol(bizId), petId)
}

export function appointmentsCol(bizId: string): CollectionReference<Appointment> {
  return collection(db, 'businesses', bizId, 'appointments').withConverter(appointmentConverter)
}

export function appointmentDoc(bizId: string, appointmentId: string) {
  return doc(appointmentsCol(bizId), appointmentId)
}

export function usersCol(): CollectionReference<UserPointer & { id: string }> {
  return collection(db, 'users').withConverter(userPointerConverter)
}

export function userDoc(uid: string) {
  return doc(usersCol(), uid)
}
