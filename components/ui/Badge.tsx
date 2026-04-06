import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'
  className?: string
}

const variantClass = {
  default: 'bg-primary text-text-inverse',
  success: 'bg-success text-text-inverse',
  warning: 'bg-warning text-text-primary',
  destructive: 'bg-destructive text-text-inverse',
  secondary: 'bg-surface-elevated text-text-secondary border border-border',
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
