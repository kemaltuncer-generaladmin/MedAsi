import type { ReactNode } from 'react'

type Variant = 'default' | 'elevated' | 'bordered'

interface CardProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

const variantClass: Record<Variant, string> = {
  default: 'bg-[var(--color-surface)]',
  elevated: 'bg-[var(--color-surface-elevated)] shadow-md',
  bordered: 'bg-[var(--color-surface)] border border-[var(--color-border)]',
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  return (
    <div className={['rounded-lg p-6', variantClass[variant], className].join(' ')}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={['mb-4', className].join(' ')}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={['text-lg font-semibold text-[var(--color-text-primary)]', className].join(' ')}>{children}</h3>
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={['text-[var(--color-text-secondary)]', className].join(' ')}>{children}</div>
}
