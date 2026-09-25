import { createContext, type ReactNode, useContext, useState } from 'react'

const STORAGE_KEY = 'slotted:demoReadOnly'

interface DemoModeContextValue {
  /**
   * True only for a visitor who arrived via the login page's "Try the
   * demo" button — not for anyone who typed the demo account's email and
   * password into the normal sign-in form themselves (that's just using
   * the app normally, full access, same as any other account).
   *
   * This is a soft, client-side lock: forms still open and validate
   * normally so the demo feels real, but submit handlers check this flag
   * and skip the actual Firestore write, showing a "this is a demo"
   * message instead. It is NOT a security boundary — the demo account's
   * real Firestore permissions are unchanged, so this only stops normal
   * button-clicking, not someone deliberately working around the UI. For
   * a shared account with fake pet names, that trade-off is fine; a real
   * server-side lock would need Cloud Functions (Phase 2+).
   */
  isDemoReadOnly: boolean
  enterReadOnlyDemo: () => void
  exitReadOnlyDemo: () => void
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined)

function readInitialFlag(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoReadOnly, setIsDemoReadOnly] = useState(readInitialFlag)

  function enterReadOnlyDemo() {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Private browsing / blocked storage — the flag just won't persist
      // across a reload, which is a minor inconvenience, not a failure.
    }
    setIsDemoReadOnly(true)
  }

  function exitReadOnlyDemo() {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setIsDemoReadOnly(false)
  }

  return (
    <DemoModeContext.Provider value={{ isDemoReadOnly, enterReadOnlyDemo, exitReadOnlyDemo }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext)
  if (!ctx) throw new Error('useDemoMode must be used within a DemoModeProvider')
  return ctx
}
