'use client'

import Link from 'next/link'
import { Construction, ArrowLeft } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description?: string
  backHref?: string
}

export function ComingSoon({ title, description, backHref = '/dashboard' }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center">
        <Construction size={36} className="text-[var(--color-warning)]" />
      </div>
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--color-warning)]">Geliştirme Aşamasında</span>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
        <p className="text-[var(--color-text-secondary)] text-sm max-w-sm">
          {description ?? 'Bu modül yapay zeka entegrasyonu gerektirdiğinden aktif olarak geliştirilmektedir. Yakında kullanıma açılacaktır.'}
        </p>
      </div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors"
      >
        <ArrowLeft size={14} />
        Geri Dön
      </Link>
    </div>
  )
}
