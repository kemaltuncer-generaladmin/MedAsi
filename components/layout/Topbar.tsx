'use client'

import type { User } from '@/types'

interface TopbarProps {
  user?: User | null
}

export function Topbar({ user }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 w-full">
      {/* Tasarımcı buraya breadcrumb/başlık ekleyecek */}
      <div />

      {/* Tasarımcı buraya kullanıcı menüsü/avatar ekleyecek */}
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{user.name ?? user.email}</span>
        </div>
      )}
    </div>
  )
}
