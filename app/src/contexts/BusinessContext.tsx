import { onSnapshot } from 'firebase/firestore'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { businessDoc, userDoc } from '../firebase/firestore'
import type { Business } from '../types/models'
import { useAuth } from './AuthContext'

interface BusinessContextValue {
  business: Business | null
  /** True until we've resolved whether the signed-in user has a business. */
  businessLoading: boolean
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined)

/** `undefined` = not yet resolved, `null` = resolved and no business. */
type MaybeBizId = string | null | undefined

/**
 * Resolves the signed-in user's business in two steps: watch their
 * `users/{uid}` pointer doc (written once at the end of onboarding) for a
 * `bizId`, then watch that business doc.
 *
 * This is two separate effects, deliberately: the business listener is
 * keyed on `pointerBizId` alone, so it's only torn down and rebuilt when
 * the *id actually changes* — not every time the pointer doc re-emits
 * (e.g. once optimistically on write, again on server ack). An earlier
 * version nested the business `onSnapshot` inside the pointer callback and
 * unsubscribed/resubscribed it on every pointer emission; that churn was
 * enough to make `business` briefly flip back to `null` right after
 * onboarding finished, bouncing the new user straight back to /onboarding.
 *
 * The other half of that fix: when `user` changes (sign-in, sign-out,
 * switching accounts), everything below must reset to "loading" *before*
 * any consumer (RequireBusiness, RedirectIfSignedIn) can render with the
 * *previous* user's already-resolved state — waiting for a `useEffect` to
 * do that is one render too late. So the reset happens synchronously
 * during render (React's documented pattern for "adjusting state when a
 * prop changes"), and the actual Firestore fetches still happen in effects.
 */
export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth()

  const [uid, setUid] = useState<string | null | undefined>(undefined)
  const [pointerBizId, setPointerBizId] = useState<MaybeBizId>(undefined)
  const [business, setBusiness] = useState<Business | null>(null)
  const [businessResolved, setBusinessResolved] = useState(false)

  const currentUid = authLoading ? undefined : (user?.uid ?? null)
  if (currentUid !== uid) {
    setUid(currentUid)
    setPointerBizId(undefined)
    setBusiness(null)
    setBusinessResolved(false)
  }

  // Step 1: uid -> bizId.
  useEffect(() => {
    if (authLoading || !user) return
    return onSnapshot(
      userDoc(user.uid),
      (snap) => setPointerBizId(snap.data()?.bizId ?? null),
      () => setPointerBizId(null),
    )
  }, [user, authLoading])

  // Step 2: bizId -> business. Only resubscribes when the id itself changes.
  useEffect(() => {
    if (!pointerBizId) {
      setBusiness(null)
      // pointerBizId === null means "resolved, no business"; undefined
      // means step 1 hasn't reported back yet — leave businessResolved as
      // the render-time reset already set it (false) in that case.
      setBusinessResolved(pointerBizId === null)
      return
    }
    // Once this listener has delivered one real snapshot, a *later* error
    // on it is treated as transient rather than "the business is gone":
    // Firestore (at least the local emulator) has been observed to throw a
    // spurious permission-denied re-evaluating this same read rule shortly
    // after the doc's create commits — plausibly tied to the server
    // resolving its `updatedAt: serverTimestamp()` sentinel — even though
    // nothing about who's allowed to read it changed. Downgrading `business`
    // to null on that transient error bounced a freshly onboarded user
    // straight back to /onboarding. If a user's access is ever genuinely
    // revoked, this Phase 1 build has no flow that does that (only Cloud
    // Functions could), so erring toward "keep showing the last good value"
    // is the safe default here.
    let hasResolvedOnce = false
    return onSnapshot(
      businessDoc(pointerBizId),
      (snap) => {
        hasResolvedOnce = true
        setBusiness(snap.exists() ? snap.data() : null)
        setBusinessResolved(true)
      },
      (err) => {
        if (hasResolvedOnce) {
          // eslint-disable-next-line no-console
          console.warn('[BusinessContext] ignoring transient business-listener error:', err)
          return
        }
        setBusiness(null)
        setBusinessResolved(true)
      },
    )
  }, [pointerBizId])

  const businessLoading = authLoading || (Boolean(user) && (pointerBizId === undefined || !businessResolved))

  const value = useMemo<BusinessContextValue>(
    () => ({ business: businessLoading ? null : business, businessLoading }),
    [business, businessLoading],
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider')
  return ctx
}
