import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean
  label: string
  description?: string
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, label, description, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        className={[
          'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
          className,
        ].join(' ')}
        {...props}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-medium text-[var(--color-text-primary)]">{label}</p>
            {description && <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>}
          </div>
          <span
            className={[
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                checked ? 'translate-x-5' : 'translate-x-1',
              ].join(' ')}
            />
          </span>
        </div>
      </button>
    )
  }
)

Toggle.displayName = 'Toggle'
