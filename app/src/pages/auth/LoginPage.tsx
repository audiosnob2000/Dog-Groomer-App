import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../contexts/AuthContext'
import { useDemoMode } from '../../contexts/DemoModeContext'
import { describeAuthError } from '../../lib/authErrors'

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD
const DEMO_AVAILABLE = Boolean(DEMO_EMAIL && DEMO_PASSWORD)

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const { enterReadOnlyDemo, exitReadOnlyDemo } = useDemoMode()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Signing in through this normal form — even with the demo
      // account's own email/password — is full, unrestricted access.
      // Only the "Try the demo" button below locks things down.
      exitReadOnlyDemo()
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(describeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password".')
      return
    }
    setError(null)
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (err) {
      setError(describeAuthError(err))
    }
  }

  async function handleTryDemo() {
    setError(null)
    setDemoLoading(true)
    try {
      enterReadOnlyDemo()
      await signIn(DEMO_EMAIL!, DEMO_PASSWORD!)
      navigate('/', { replace: true })
    } catch (err) {
      exitReadOnlyDemo()
      setError(describeAuthError(err))
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-normal text-ink">Slotted</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to your shop</p>
        </div>

        {DEMO_AVAILABLE && (
          <Button
            variant="secondary"
            loading={demoLoading}
            onClick={handleTryDemo}
            className="mb-4 w-full"
          >
            Try the demo — no sign-up needed
          </Button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-danger-text">{error}</p>}
          {resetSent && (
            <p className="text-sm text-accent-soft-text">Password reset email sent — check your inbox.</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-xs text-ink-muted hover:text-ink"
          >
            Forgot password?
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          New here?{' '}
          <Link to="/signup" className="font-medium text-accent hover:text-accent-dark">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
