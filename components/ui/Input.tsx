import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text-primary',
            'placeholder:text-text-disabled',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:pointer-events-none disabled:opacity-50',
            error ? 'border-destructive focus:ring-destructive' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
        {hint && !error && <span className="text-xs text-text-secondary">{hint}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
