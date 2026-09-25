import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

// Sizing/radius/colors match the design mockup's buttons (height 44px,
// 12px radius, forest-green primary) — see Main.dc.html / Client.dc.html.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-white border border-accent hover:bg-accent-dark disabled:opacity-50',
  secondary: 'bg-white text-ink border border-border hover:bg-page disabled:opacity-50',
  ghost: 'text-ink-dim border border-transparent hover:bg-black/[0.03] disabled:opacity-40',
  danger: 'bg-danger-soft text-danger-text border border-transparent hover:opacity-80 disabled:opacity-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
