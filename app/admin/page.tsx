import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Users, Brain, TrendingUp, CheckCircle2, ArrowRight, Search, Bell, Package, Settings } from 'lucide-react'
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

  // Package badge variant based on name
  function packageVariant(name: string): 'default' | 'success' | 'warning' | 'secondary' {
    const lower = name.toLowerCase()
    if (lower.includes('pro') || lower.includes('klinik')) return 'success'
    if (lower.includes('kurumsal') || lower.includes('enterprise')) return 'warning'
    if (lower.includes('öğrenci') || lower.includes('student') || lower.includes('free')) return 'default'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div
        className="flex items-start justify-between py-4 px-1"
      >
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total users */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderTop: '2px solid var(--color-primary)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Toplam Kullanıcı
            </p>
            <Users size={16} style={{ color: 'var(--color-primary)', opacity: 0.7 }} />
          </div>
          <p
            className="text-3xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {userCount.toLocaleString('tr-TR')}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Kayıtlı kullanıcı
          </p>
        </div>

        {/* AI Sessions */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderTop: '2px solid var(--color-warning)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Toplam AI Sorgusu
            </p>
            <Brain size={16} style={{ color: 'var(--color-warning)', opacity: 0.7 }} />
          </div>
          <p
            className="text-3xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {sessionCount.toLocaleString('tr-TR')}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Toplam AI oturumu
          </p>
        </div>

        {/* Revenue */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderTop: '2px solid var(--color-success)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Bu Ay Gelir
            </p>
            <TrendingUp size={16} style={{ color: 'var(--color-success)', opacity: 0.7 }} />
          </div>
          <p
            className="text-3xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {formatCurrency(monthlyRevenue)}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Paket gelirleri toplamı
          </p>
        </div>

        {/* System Status */}
        <div
          className="rounded-xl p-5 relative overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderTop: '2px solid var(--color-success)',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sistem Durumu
            </p>
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)', opacity: 0.7 }} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Çevrimiçi
            </p>
          </div>
          <p
            className="text-xs font-medium"
            style={{ color: 'var(--color-success)' }}
          >
            Tüm sistemler çalışıyor
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Registration trend chart — spans 3 cols */}
        <div
          className="xl:col-span-3 rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3
            className="text-base font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            7 Günlük Kayıt Trendi
          </h3>
          <RegistrationChart />
        </div>

        {/* Package distribution — spans 2 cols */}
        <div
          className="xl:col-span-2 rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3
            className="text-base font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Paket Dağılımı
          </h3>
          <PackageBarChart distribution={pkgDistribution} />
        </div>
      </div>

      {/* Recent users table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Son Kayıt Olan Kullanıcılar
          </h3>
          <Link
            href="/admin/users"
            className="text-sm font-medium flex items-center gap-1 transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            Kullanıcı Yönetimine Git
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Kullanıcı', 'E-Posta', 'Paket', 'Katılım'].map((th) => (
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
                  className="transition-colors duration-100"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      'var(--color-surface)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'
                  }}
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
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {user.name ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-6 py-3 text-sm whitespace-nowrap"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {user.email}
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
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Henüz kayıtlı kullanıcı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3
          className="text-base font-semibold mb-4 px-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Hızlı İşlemler
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Kullanıcı Ara',
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
              className="rounded-xl p-5 flex flex-col gap-3 group transition-all duration-150"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = action.accentColor
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--color-border)'
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${action.accentColor} 15%, transparent)`,
                }}
              >
                <action.icon size={18} style={{ color: action.accentColor }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {action.label}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
