import { FirebaseError } from 'firebase/app'

/** Turns a Firebase Auth error into a message a groomer, not a developer, can act on. */
export function describeAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with that email already exists. Try signing in instead.'
      case 'auth/invalid-email':
        return 'That email address doesn’t look right.'
      case 'auth/weak-password':
        return 'Use at least 6 characters for your password.'
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email or password is incorrect.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a bit and try again.'
      case 'auth/network-request-failed':
        return 'Network error — check your connection and try again.'
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      case 'auth/invalid-api-key':
        return 'This app isn’t connected to a real Firebase project yet. See the README to add your Firebase config.'
      default:
        return error.message
    }
  }
  return 'Something went wrong. Please try again.'
}
