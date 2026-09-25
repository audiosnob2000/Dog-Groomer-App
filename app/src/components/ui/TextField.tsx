import { type InputHTMLAttributes, useId } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export default function TextField({ label, hint, id, className = '', ...rest }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs text-ink-muted">
        {label}
      </label>
      <input
        id={fieldId}
        className={`h-11 rounded-xl border border-border bg-white px-3.5 text-sm text-ink focus:border-accent ${className}`}
        {...rest}
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
