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
  BookOpen,
  Megaphone,
  BarChart2,
  DollarSign,
  Tag,
  Puzzle,
  LogOut,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Genel',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Genel Bakış' },
    ],
  },
  {
    label: 'Kullanıcı Yönetimi',
    items: [
      { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
      { href: '/admin/packages', icon: Package, label: 'Paketler' },
      { href: '/admin/coupons', icon: Tag, label: 'Kuponlar' },
    ],
  },
  {
    label: 'İçerik',
    items: [
      { href: '/admin/content', icon: BookOpen, label: 'Soru & Flashcard Havuzu' },
      { href: '/admin/announcements', icon: Megaphone, label: 'Duyurular' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/modules', icon: Puzzle, label: 'Modüller' },
      { href: '/admin/ai/control', icon: BrainCircuit, label: 'AI Kontrol' },
      { href: '/admin/ai/costs', icon: DollarSign, label: 'AI Maliyetleri' },
      { href: '/admin/organizations', icon: FlaskConical, label: 'Araştırma Org.' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/admin/settings', icon: Settings, label: 'Sistem Ayarları' },
      { href: '/admin/logs', icon: FileText, label: 'Aktivite Günlüğü' },
      { href: '/admin/analytics', icon: BarChart2, label: 'Analizler' },
    ],
  },
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
      {/* Logo Area */}
      <div
        className="flex items-center gap-3 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <span className="text-xs font-bold" style={{ color: '#fff' }}>
            M
          </span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold tracking-wide"
              style={{ color: 'var(--color-text-primary)' }}
            >
              MED<span style={{ color: 'var(--color-primary)' }}>ASI</span>
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              Admin
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            v1.0
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
            <div
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-disabled)' }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 py-2 mx-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    paddingLeft: isActive ? '10px' : '12px',
                    paddingRight: '12px',
                    color: isActive
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                      : 'transparent',
                    borderLeft: isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                  }}
                >
                  <item.icon
                    size={16}
                    style={{
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div
        className="p-3 flex flex-col gap-1"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor =
              'var(--color-surface-elevated)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
        >
          <ArrowLeft size={16} style={{ flexShrink: 0 }} />
          Platforma Dön
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
            style={{ color: 'var(--color-destructive)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.backgroundColor =
                'color-mix(in srgb, var(--color-destructive) 8%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  )
}
