import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import CalendarPage from './pages/calendar/CalendarPage'
import HouseholdDetailPage from './pages/households/HouseholdDetailPage'
import HouseholdsPage from './pages/households/HouseholdsPage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import TodayPage from './pages/today/TodayPage'
import { RedirectIfSignedIn, RequireAuth, RequireBusiness } from './routes/guards'

// HashRouter, per PLAN.md §5, so a page reload on GitHub Pages (a static
// host with no server-side rewrite) doesn't 404 on a deep link like
// /households/abc123.
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfSignedIn>
                  <LoginPage />
                </RedirectIfSignedIn>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfSignedIn>
                  <SignupPage />
                </RedirectIfSignedIn>
              }
            />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <RequireBusiness>
                    <AppLayout />
                  </RequireBusiness>
                </RequireAuth>
              }
            >
              <Route index element={<TodayPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="households" element={<HouseholdsPage />} />
              <Route path="households/:householdId" element={<HouseholdDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </HashRouter>
  )
}
