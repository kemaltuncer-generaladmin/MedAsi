import { prisma } from '@/lib/prisma'
import { Users, Brain, TrendingUp, BarChart2, Activity, CheckCircle2 } from 'lucide-react'

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
  }).format(new Date(date))
}

export default async function AnalyticsPage() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    totalSessions,
    packageDist,
    packages,
    recentUsers7d,
    recentUsers30d,
    prevUsers30d,
    sessions30d,
    prevSessions30d,
    onboardedCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.user.groupBy({ by: ['packageId'], _count: { id: true } }),
    prisma.package.findMany(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.session.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.session.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.user.count({ where: { onboardingCompleted: true } }),
  ])

  const packageMap = new Map(packages.map((p) => [p.id, p]))
  const monthlyRevenue = packageDist.reduce((sum, group) => {
    const pkg = packageMap.get(group.packageId)
    return pkg ? sum + pkg.price * group._count.id : sum
  }, 0)

  // Daily registrations for last 7 days
  const dailyRegistrations = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(now)
      dayStart.setDate(dayStart.getDate() - (6 - i))
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      return prisma.user.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      }).then((count) => ({ date: dayStart, count }))
    })
  )

  const userGrowthPct =
    prevUsers30d > 0
      ? Math.round(((recentUsers30d - prevUsers30d) / prevUsers30d) * 100)
      : recentUsers30d > 0
      ? 100
      : 0

  const sessionGrowthPct =
    prevSessions30d > 0
      ? Math.round(((sessions30d - prevSessions30d) / prevSessions30d) * 100)
      : sessions30d > 0
      ? 100
      : 0

  const onboardingRate =
    totalUsers > 0 ? Math.round((onboardedCount / totalUsers) * 100) : 0

  const pkgDistribution = packageDist.map((group) => {
    const pkg = packageMap.get(group.packageId)
    const count = group._count.id
    const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
    return {
      name: pkg?.name ?? 'Bilinmiyor',
      count,
      percentage,
      price: pkg?.price ?? 0,
      revenue: (pkg?.price ?? 0) * count,
      accentColor:
        (pkg?.name ?? '').toLowerCase().includes('klinik') || (pkg?.name ?? '').toLowerCase().includes('pro')
          ? 'var(--color-success)'
          : (pkg?.name ?? '').toLowerCase().includes('kurumsal')
          ? 'var(--color-warning)'
          : 'var(--color-primary)',
    }
  })

  const maxDailyCount = Math.max(...dailyRegistrations.map((d) => d.count), 1)

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
      <div className="py-2 px-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Analitik
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Platform kullanım istatistikleri ve büyüme metrikleri
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: 'Toplam Kullanıcı',
            value: totalUsers.toLocaleString('tr-TR'),
            sub: `Son 7 günde +${recentUsers7d}`,
            icon: Users,
            color: 'var(--color-primary)',
          },
          {
            label: 'Son 30 Gün Kayıt',
            value: recentUsers30d.toLocaleString('tr-TR'),
            sub: `Önceki döneme göre ${userGrowthPct >= 0 ? '+' : ''}${userGrowthPct}%`,
            icon: TrendingUp,
            color: userGrowthPct >= 0 ? 'var(--color-success)' : 'var(--color-destructive)',
          },
          {
            label: 'Toplam AI Oturumu',
            value: totalSessions.toLocaleString('tr-TR'),
            sub: `Son 30 günde ${sessions30d.toLocaleString('tr-TR')}`,
            icon: Brain,
            color: 'var(--color-warning)',
          },
          {
            label: 'Onboarding Tamamlama',
            value: `%${onboardingRate}`,
            sub: `${onboardedCount.toLocaleString('tr-TR')} / ${totalUsers.toLocaleString('tr-TR')} kullanıcı`,
            icon: CheckCircle2,
            color: 'var(--color-success)',
          },
          {
            label: 'Tahmini Aylık Gelir',
            value: formatCurrency(monthlyRevenue),
            sub: 'Tüm paket gelirleri toplamı',
            icon: BarChart2,
            color: 'var(--color-success)',
          },
          {
            label: 'AI Sorgusu (30 Gün)',
            value: sessions30d.toLocaleString('tr-TR'),
            sub: `Önceki döneme göre ${sessionGrowthPct >= 0 ? '+' : ''}${sessionGrowthPct}%`,
            icon: Activity,
            color: sessionGrowthPct >= 0 ? 'var(--color-success)' : 'var(--color-destructive)',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderTop: `3px solid ${color}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {label}
              </p>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        className="h-px w-full"
        style={{ backgroundColor: 'var(--color-border)' }}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily registrations bar chart */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h3
            className="text-base font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Günlük Kayıt Trendi (Son 7 Gün)
          </h3>
          <div className="flex items-end gap-2 h-32">
            {dailyRegistrations.map(({ date, count }) => (
              <div key={date.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 96 }}>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(4, Math.round((count / maxDailyCount) * 96))}px`,
                      backgroundColor: 'var(--color-primary)',
                      opacity: 0.85,
                    }}
                    title={`${count} kayıt`}
                  />
                </div>
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {formatDate(date)}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Package distribution */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h3
            className="text-base font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Paket Dağılımı
          </h3>
          <div className="space-y-4">
            {pkgDistribution.map((pkg) => (
              <div key={pkg.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: pkg.accentColor }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {pkg.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {pkg.count} kullanıcı
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: pkg.accentColor }}
                    >
                      %{pkg.percentage}
                    </span>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-border)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pkg.percentage}%`, backgroundColor: pkg.accentColor }}
                  />
                </div>
              </div>
            ))}
            {pkgDistribution.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                Paket verisi bulunamadı.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="flex items-center gap-2 mb-5 pb-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <BarChart2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Paket Bazlı Gelir Analizi
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Paket', 'Kullanıcı', 'Birim Fiyat', 'Tahmini Gelir', 'Pay'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pkgDistribution.map((pkg) => {
                const sharePercent =
                  monthlyRevenue > 0
                    ? Math.round((pkg.revenue / monthlyRevenue) * 100)
                    : 0
                return (
                  <tr
                    key={pkg.name}
                    className="transition-colors hover:bg-[var(--color-surface)]"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: pkg.accentColor }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {pkg.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {pkg.count.toLocaleString('tr-TR')}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatCurrency(pkg.price)}/ay
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-bold"
                        style={{ color: pkg.accentColor }}
                      >
                        {formatCurrency(pkg.revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full overflow-hidden flex-1 max-w-[80px]"
                          style={{ backgroundColor: 'var(--color-border)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${sharePercent}%`,
                              backgroundColor: pkg.accentColor,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          %{sharePercent}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  className="px-4 py-3 text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)', borderTop: '2px solid var(--color-border)' }}
                >
                  Toplam
                </td>
                <td
                  className="px-4 py-3 text-sm font-semibold"
                  style={{ color: 'var(--color-text-primary)', borderTop: '2px solid var(--color-border)' }}
                >
                  {totalUsers.toLocaleString('tr-TR')}
                </td>
                <td style={{ borderTop: '2px solid var(--color-border)' }} />
                <td
                  className="px-4 py-3"
                  style={{ borderTop: '2px solid var(--color-border)' }}
                >
                  <span
                    className="text-base font-bold"
                    style={{ color: 'var(--color-success)' }}
                  >
                    {formatCurrency(monthlyRevenue)}
                  </span>
                </td>
                <td style={{ borderTop: '2px solid var(--color-border)' }} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
