import { useState } from 'react'
import { useBusiness } from '../../contexts/BusinessContext'
import { resetDemoData } from '../../lib/resetDemoData'

/**
 * Only rendered for the one shared demo account (business.isDemo), and
 * only for whoever signed in through the normal login form (not via the
 * public "Try the demo" button — see DemoModeContext) — that check
 * happens where this is used, in AppLayout.
 */
export default function ResetDemoDataButton() {
  const { business } = useBusiness()
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justReset, setJustReset] = useState(false)

  async function handleReset() {
    if (!business) return
    setResetting(true)
    setError(null)
    try {
      await resetDemoData(business.id, business.timezone)
      setConfirming(false)
      setJustReset(true)
      setTimeout(() => setJustReset(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the demo data.')
    } finally {
      setResetting(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-white p-3.5">
        <p className="text-xs text-ink-dim">
          Wipe everything and recreate the standard 5 demo households?
        </p>
        {error && <p className="text-xs text-danger-text">{error}</p>}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting}
            className="flex-1 rounded-lg bg-accent px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {resetting ? 'Resetting…' : 'Yes, reset'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={resetting}
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-ink-dim"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-[14px] border border-dashed border-border px-3.5 py-2.5 text-left text-xs font-medium text-ink-dim hover:bg-white"
    >
      {justReset ? '✓ Demo data reset' : 'Reset demo data'}
    </button>
  )
}
