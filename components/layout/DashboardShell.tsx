'use client'

import type { ReactNode } from 'react'

interface DashboardShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}

export function DashboardShell({ sidebar, topbar, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
      {sidebar}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ marginLeft: 'var(--sidebar-width)' }}>
        {topbar}

        <main className="flex-1 overflow-y-auto" style={{ marginTop: 'var(--topbar-height)' }}>
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
