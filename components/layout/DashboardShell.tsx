'use client'

import type { ReactNode } from 'react'

interface DashboardShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}

export function DashboardShell({ sidebar, topbar, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-sidebar shrink-0 h-full overflow-y-auto border-r border-border">
        {sidebar}
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-topbar shrink-0 border-b border-border flex items-center">
          {topbar}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
