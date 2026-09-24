import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '../firebase/config'

interface AuthContextValue {
  user: User | null
  /** True until the first `onAuthStateChanged` callback fires. */
  authLoading: boolean
  signUp: (email: string, password: string) => Promise<User>
  signIn: (email: string, password: string) => Promise<User>
  signOutUser: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authLoading,
      async signUp(email, password) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        return credential.user
      },
      async signIn(email, password) {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        return credential.user
      },
      async signOutUser() {
        await signOut(auth)
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email)
      },
    }),
    [user, authLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
