import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import FullScreenSpinner from '../components/FullScreenSpinner'

/** Redirects to /login when signed out. Renders children once signed in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

/**
 * Beyond RequireAuth: also requires the signed-in user to have finished
 * onboarding (i.e. have a business). Sends them to /onboarding otherwise.
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { business, businessLoading } = useBusiness()

  if (businessLoading) return <FullScreenSpinner />
  if (!business) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** For /login, /signup: bounce a signed-in, onboarded user straight to Today. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth()
  const { business, businessLoading } = useBusiness()

  if (authLoading || (user && businessLoading)) return <FullScreenSpinner />
  if (user && business) return <Navigate to="/" replace />
  if (user && !business) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
