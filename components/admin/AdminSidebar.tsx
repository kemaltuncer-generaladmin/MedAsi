'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  FileText,
  ArrowLeft,
  BrainCircuit,
  FlaskConical,
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Genel Bakış' },
  { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
  { href: '/admin/packages', icon: Package, label: 'Paketler' },
  { href: '/admin/organizations', icon: FlaskConical, label: 'Araştırma Org.' },
  { href: '/admin/settings', icon: Settings, label: 'Sistem Ayarları' },
  { href: '/admin/logs', icon: FileText, label: 'Aktivite Günlüğü' },
  { href: '/admin/ai/control', icon: BrainCircuit, label: 'AI Kontrol' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-64 h-screen sticky top-0 flex-shrink-0 flex flex-col"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors"
              style={{
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-surface-elevated)' : 'transparent',
              }}
            >
              <item.icon
                size={16}
                style={{ color: isActive ? 'var(--color-primary)' : 'currentColor' }}
              />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div
        className="p-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-surface-elevated)',
          }}
        >
          <ArrowLeft size={16} />
          Platforma Dön
        </Link>
      </div>
    </aside>
  )
}