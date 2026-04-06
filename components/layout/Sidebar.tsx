'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/constants'

const navItems = [
  { label: '📊 Ana Panel', href: ROUTES.dashboard },
  { label: '🩺 AI Tanı', href: ROUTES.modules.aiDiagnosis },
  { label: '🤖 AI Asistan', href: ROUTES.modules.aiAssistant },
  { label: '🎮 Vaka RPG', href: ROUTES.modules.caseRpg },
  { label: '⌨️ Terminal', href: ROUTES.modules.terminal },
  { label: '📰 Günlük Brifing', href: ROUTES.modules.dailyBriefing },
  { label: '👥 Hastalar', href: ROUTES.patients },
  { label: '📋 Vakalar', href: ROUTES.cases },
  { label: '📝 Notlar', href: ROUTES.notes },
  { label: '🍅 Pomodoro', href: ROUTES.pomodoro },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      <div className="h-topbar flex items-center px-6 border-b border-[var(--color-border)] shrink-0">
        <span className="text-xl font-bold text-white tracking-wider">
          MED<span className="text-[var(--color-primary)]">ASI</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast',
                isActive
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]/20',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="h-16 border-t border-[var(--color-border)] flex items-center px-3 gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center font-bold text-xs">
          D
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">Dr. Doktor</p>
          <p className="text-xs text-[var(--color-text-secondary)] truncate">prof@medasi.com</p>
        </div>
      </div>
    </aside>
  )
}
