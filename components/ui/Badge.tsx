import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'
  className?: string
}

const variantClass = {
  default: 'bg-[var(--color-primary)] text-black',
  success: 'bg-[var(--color-success)] text-white',
  warning: 'bg-[var(--color-warning)] text-black',
  destructive: 'bg-[var(--color-destructive)] text-white',
  secondary: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClass[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
