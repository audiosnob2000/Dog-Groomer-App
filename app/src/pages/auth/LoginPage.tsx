import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useAuth } from '../../contexts/AuthContext'
import { describeAuthError } from '../../lib/authErrors'

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-normal text-ink">Slotted</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to your shop</p>
        </div>

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
            <p className="text-sm text-green-700">Password reset email sent — check your inbox.</p>
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
