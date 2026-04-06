'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/constants'

const navItems = [
  { label: 'Dashboard', href: ROUTES.dashboard },
  { label: 'Hastalar', href: ROUTES.patients },
  { label: 'Vakalar', href: ROUTES.cases },
  { label: 'Notlar', href: ROUTES.notes },
  { label: 'AI Asistan', href: ROUTES.modules.aiAssistant },
  { label: 'AI Tanı', href: ROUTES.modules.aiDiagnosis },
  { label: 'Vaka RPG', href: ROUTES.modules.caseRpg },
  { label: 'Terminal', href: ROUTES.modules.terminal },
  { label: 'Günlük Brifing', href: ROUTES.modules.dailyBriefing },
  { label: 'Pomodoro', href: ROUTES.pomodoro },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full px-3 py-4 gap-1">
      {/* Tasarımcı buraya logo ekleyecek */}
      <div className="h-12 mb-4 px-3 flex items-center">
        <span className="text-lg font-bold text-text-primary">Medasi</span>
      </div>

      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast',
            pathname === item.href
              ? 'bg-primary text-text-inverse'
              : 'text-text-secondary hover:bg-surface hover:text-text-primary',
          ].join(' ')}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
