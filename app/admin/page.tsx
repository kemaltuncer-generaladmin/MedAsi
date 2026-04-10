import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  Users,
  Brain,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Search,
  Bell,
  Package,
  Settings,
  BarChart2,
} from 'lucide-react'
import { LiveClock } from '@/components/admin/LiveClock'
import { RegistrationChart } from '@/components/admin/RegistrationChart'
import { PackageBarChart } from '@/components/admin/PackageBarChart'

export const dynamic = 'force-dynamic'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase()
  return email.charAt(0).toUpperCase()
}

export default async function AdminPage() {
  const [userCount, packageDist, recentUsers, sessionCount, packages] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['packageId'], _count: { id: true } }),
    prisma.user.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { package: true },
    }),
    prisma.session.count(),
    prisma.package.findMany(),
  ])

  // Calculate monthly revenue from package prices × user counts
  const packageMap = new Map(packages.map((p) => [p.id, p]))
  const monthlyRevenue = packageDist.reduce((sum, group) => {
    const pkg = packageMap.get(group.packageId)
    if (!pkg) return sum
    return sum + pkg.price * group._count.id
  }, 0)

  // Build package distribution with names and percentages
  const pkgDistribution = packageDist.map((group) => {
    const pkg = packageMap.get(group.packageId)
    const count = group._count.id
    const percentage = userCount > 0 ? Math.round((count / userCount) * 100) : 0
    return {
      name: pkg?.name ?? 'Bilinmiyor',
      count,
      percentage,
    }
  })

  function packageVariant(name: string): 'default' | 'success' | 'warning' | 'secondary' {
    const lower = name.toLowerCase()
    if (lower.includes('pro') || lower.includes('klinik')) return 'success'
    if (lower.includes('kurumsal') || lower.includes('enterprise')) return 'warning'
    if (lower.includes('öğrenci') || lower.includes('student') || lower.includes('free')) return 'default'
    return 'secondary'
  }

  return (
    <div
      className="space-y-6"
      style={{ animation: 'adminFadeIn 300ms ease forwards' }}
    >
      <style>{`
        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page header */}
      <div className="flex items-start justify-between py-2 px-1">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Genel Bakış
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Platform genelindeki istatistikler ve aktiviteler
          </p>
        </div>
        <LiveClock />
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-primary)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Toplam Kullanıcı
            </p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
            >
              <Users size={14} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {userCount.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Kayıtlı kullanıcı
          </p>
        </div>

        {/* AI Sessions */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-warning)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Toplam AI Sorgusu
            </p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)' }}
            >
              <Brain size={14} style={{ color: 'var(--color-warning)' }} />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {sessionCount.toLocaleString('tr-TR')}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Toplam AI oturumu
          </p>
        </div>

        {/* Revenue */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-success)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Bu Ay Gelir
            </p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }}
            >
              <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Paket gelirleri toplamı
          </p>
        </div>

        {/* System Status */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: '3px solid var(--color-success)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sistem Durumu
            </p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)' }}
            >
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Çevrimiçi
            </p>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
            Tüm sistemler çalışıyor
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Chart + Recent users */}
        <div className="xl:col-span-2 space-y-6">
          {/* Registration trend chart */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                7 Günlük Kayıt Trendi
              </h3>
              <Link
                href="/admin/users"
                className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                Tümünü Gör <ArrowRight size={12} />
              </Link>
            </div>
            <RegistrationChart />
          </div>

          {/* Recent users table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Son Kayıt Olan Kullanıcılar
              </h3>
              <Link
                href="/admin/users"
                className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                Tümünü Gör
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Kullanıcı', 'Paket', 'Katılım'].map((th) => (
                      <th
                        key={th}
                        className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors duration-100 hover:bg-[var(--color-surface)]"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                              color: '#fff',
                            }}
                          >
                            {getInitials(user.name, user.email)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {user.name ?? '—'}
                            </p>
                            <p
                              className="text-xs truncate"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={packageVariant(user.package.name)}>
                          {user.package.name}
                        </Badge>
                      </td>
                      <td
                        className="px-6 py-3 text-sm whitespace-nowrap"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-12 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-surface)' }}
                          >
                            <Users size={20} style={{ color: 'var(--color-text-secondary)' }} />
                          </div>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Henüz kayıtlı kullanıcı bulunmuyor.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Package distribution + Quick actions */}
        <div className="space-y-6">
          {/* Package distribution */}
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Paket Dağılımı
              </h3>
              <Link
                href="/admin/packages"
                className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-primary)' }}
              >
                Yönet <ArrowRight size={12} />
              </Link>
            </div>
            <PackageBarChart distribution={pkgDistribution} />
          </div>

          {/* Quick actions */}
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <h3
              className="text-base font-semibold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Hızlı İşlemler
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: 'Kullanıcı Yönetimi',
                  description: 'Kullanıcı ara ve yönet',
                  href: '/admin/users',
                  icon: Search,
                  accentColor: 'var(--color-primary)',
                },
                {
                  label: 'Duyuru Gönder',
                  description: 'Platform duyurusu oluştur',
                  href: '/admin/announcements',
                  icon: Bell,
                  accentColor: 'var(--color-warning)',
                },
                {
                  label: 'Paket Düzenle',
                  description: 'Paketleri ve fiyatları düzenle',
                  href: '/admin/packages',
                  icon: Package,
                  accentColor: 'var(--color-success)',
                },
                {
                  label: 'Analitik',
                  description: 'Platform analizlerini görüntüle',
                  href: '/admin/analytics',
                  icon: BarChart2,
                  accentColor: 'var(--color-secondary, var(--color-primary))',
                },
                {
                  label: 'Sistem Ayarları',
                  description: 'Platform ayarlarını yapılandır',
                  href: '/admin/settings',
                  icon: Settings,
                  accentColor: 'var(--color-text-secondary)',
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 group transition-colors hover:bg-[var(--color-surface)]"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${action.accentColor} 15%, transparent)`,
                    }}
                  >
                    <action.icon size={15} style={{ color: action.accentColor }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold leading-none mb-0.5"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {action.label}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Son Aktiviteler */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Son Aktiviteler
          </h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {recentUsers.slice(0, 5).map((user) => (
            <div
              key={`act-${user.id}`}
              className="flex items-center gap-4 px-6 py-3 transition-colors"
              style={{ borderBottomColor: 'var(--color-border)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary, var(--color-primary)))',
                  color: '#fff',
                }}
              >
                {getInitials(user.name, user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="font-medium">{user.name ?? user.email}</span>
                  {' '}platforma kayıt oldu
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {user.email} · {user.package.name} paketi
                </p>
              </div>
              <time
                className="text-xs shrink-0"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {formatDate(user.createdAt)}
              </time>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Henüz aktivite bulunmuyor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
