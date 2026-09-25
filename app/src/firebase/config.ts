import { type FirebaseOptions, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

/**
 * Firebase web config. This is meant to be public (per PLAN.md §5 — security
 * comes from Firestore rules, not from hiding this object), but it still
 * lives in env vars so the repo doesn't hardcode one groomer's project and
 * so CI can build without real credentials.
 *
 * Until real values are supplied (see .env.example), every field below is
 * a harmless placeholder. The app still boots and renders — sign-in and
 * Firestore calls will fail with a clear Firebase error until a real
 * project is wired up, or until you run against the local emulators
 * (see README → "Local development without a real Firebase project").
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000000000',
}

export const isRealFirebaseConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY)

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// ignoreUndefinedProperties: several forms build their write payload with
// `field: value || undefined` for optional fields (household notes, a
// pet's breed/weight, etc.) — the Firestore client SDK rejects a JS
// `undefined` in a write by default (a real bug this caught: adding a
// household with an empty Notes field threw "Unsupported field value:
// undefined"). This setting treats "explicitly undefined" the same as
// "key omitted" everywhere, which is what every one of those call sites
// actually means.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
export const functions = getFunctions(app)

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

if (useEmulators) {
  // Matches the ports in firebase.json. Safe to call more than once is NOT
  // guaranteed by the SDK, so this module must only ever be imported once
  // (Vite/ESM module caching guarantees that for us).
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  // eslint-disable-next-line no-console
  console.info('[firebase] Connected to local emulators (VITE_USE_FIREBASE_EMULATORS=true)')
}
