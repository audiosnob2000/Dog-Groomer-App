import { type InputHTMLAttributes, useId } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export default function TextField({ label, hint, id, className = '', ...rest }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={fieldId}
        className={`rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 ${className}`}
        {...rest}
      />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
