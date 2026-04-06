'use client'

import type { User } from '@/types'

interface TopbarProps {
  user?: User | null
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="h-topbar border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 fixed top-0 left-sidebar right-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Hoş Geldin</h1>
        <span className="text-[var(--color-text-secondary)] text-sm">{user?.name || 'Kullanıcı'}</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center font-bold hover:opacity-90 transition-opacity">
          {user?.name?.charAt(0).toUpperCase() || 'D'}
        </button>
      </div>
    </header>
  )
}
