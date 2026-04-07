import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, DollarSign, TrendingUp, Brain, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(n: number, d = 2) { return n.toFixed(d) }
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

export default async function OrgBillingPage({ params }: { params: { id: string } }) {
  const org = await prisma.researchOrganization.findUnique({
    where: { id: params.id },
    include: { adminUser: true },
  })
  if (!org) notFound()

  // Tüm kullanım kayıtları
  const allUsage = await prisma.orgAiUsage.findMany({
    where: { orgId: org.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })

  // Toplam özet
  const totalCostUsd = allUsage.reduce((s, u) => s + u.costUsd, 0)
  const totalRevenueUsd = totalCostUsd * (1 + org.markupPct / 100)
  const totalProfitUsd = totalRevenueUsd - totalCostUsd
  const totalInputTokens = allUsage.reduce((s, u) => s + u.inputTokens, 0)
  const totalOutputTokens = allUsage.reduce((s, u) => s + u.outputTokens, 0)

  // Kullanıcı bazında gruplama
  const byUser = new Map<string, { name: string; email: string; calls: number; costUsd: number }>()
  for (const u of allUsage) {
    const key = u.userId
    const existing = byUser.get(key)
    if (existing) {
      existing.calls++
      existing.costUsd += u.costUsd
    } else {
      byUser.set(key, { name: u.user.name ?? u.user.email, email: u.user.email, calls: 1, costUsd: u.costUsd })
    }
  }

  // Model bazında gruplama
  const byModel = new Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>()
  for (const u of allUsage) {
    const existing = byModel.get(u.model)
    if (existing) {
      existing.calls++
      existing.costUsd += u.costUsd
      existing.inputTokens += u.inputTokens
      existing.outputTokens += u.outputTokens
    } else {
      byModel.set(u.model, { calls: 1, costUsd: u.costUsd, inputTokens: u.inputTokens, outputTokens: u.outputTokens })
    }
  }

  // Aylık gruplama
  const byMonth = new Map<string, { costUsd: number; calls: number }>()
  for (const u of allUsage) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`
    const existing = byMonth.get(key)
    if (existing) { existing.costUsd += u.costUsd; existing.calls++ }
    else byMonth.set(key, { costUsd: u.costUsd, calls: 1 })
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 px-1">
        <Link href={`/admin/organizations/${org.id}`} className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {org.name} — Detaylı Rapor
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Tüm zamanlar · %{org.markupPct} kâr marjı
          </p>
        </div>
      </div>

      {/* Toplam özet */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Toplam Maliyet', value: `$${fmt(totalCostUsd, 4)}`, sub: 'Gerçek API maliyeti', icon: DollarSign, color: 'var(--color-warning)' },
          { title: 'Toplam Gelir', value: `$${fmt(totalRevenueUsd)}`, sub: `Müşteriye fatura edilecek`, icon: TrendingUp, color: 'var(--color-success)' },
          { title: 'Net Kâr', value: `$${fmt(totalProfitUsd)}`, sub: `%${org.markupPct} marj`, icon: TrendingUp, color: 'var(--color-primary)' },
          { title: 'Toplam Sorgu', value: allUsage.length.toLocaleString('tr-TR'), sub: `${(totalInputTokens + totalOutputTokens).toLocaleString()} token`, icon: Brain, color: 'var(--color-text-secondary)' },
        ].map((c) => (
          <div key={c.title} className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface-elevated)', borderTop: `2px solid ${c.color}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{c.title}</p>
              <c.icon size={14} style={{ color: c.color, opacity: 0.7 }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{c.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Aylık döküm */}
      {months.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Aylık Döküm</h3>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Dönem', 'Sorgu Sayısı', 'Maliyet (USD)', 'Gelir (USD)', 'Kâr (USD)'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(([month, data]) => {
                const rev = data.costUsd * (1 + org.markupPct / 100)
                return (
                  <tr key={month} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{month}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{data.calls}</td>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-warning)' }}>${fmt(data.costUsd, 4)}</td>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-success)' }}>${fmt(rev)}</td>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-primary)' }}>${fmt(rev - data.costUsd)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Kullanıcı bazında */}
      {byUser.size > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <Users size={14} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Araştırmacı Bazında Kullanım</h3>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Araştırmacı', 'Sorgu', 'Maliyet', 'Gelir (marjlı)'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...byUser.values()].sort((a, b) => b.costUsd - a.costUsd).map((u) => {
                const rev = u.costUsd * (1 + org.markupPct / 100)
                return (
                  <tr key={u.email} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{u.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{u.email}</p>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{u.calls}</td>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-warning)' }}>${fmt(u.costUsd, 5)}</td>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-success)' }}>${fmt(rev)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Model bazında */}
      {byModel.size > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
            <Brain size={14} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>AI Model Bazında Dağılım</h3>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Model', 'Sorgu', 'Giriş Tok.', 'Çıkış Tok.', 'Maliyet'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...byModel.entries()].sort((a, b) => b[1].costUsd - a[1].costUsd).map(([model, data]) => (
                <tr key={model} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>{model}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{data.calls}</td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{data.inputTokens.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{data.outputTokens.toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: 'var(--color-warning)' }}>${fmt(data.costUsd, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ham kayıtlar */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Ham Kullanım Kayıtları</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Kullanıcı', 'Model', 'Modül', 'Giriş', 'Çıkış', 'Maliyet', 'Gelir', 'Tarih'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsage.slice(0, 100).map((u) => {
                const rev = u.costUsd * (1 + org.markupPct / 100)
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>{u.user.name ?? u.user.email}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{u.model}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{u.module ?? '—'}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{u.inputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{u.outputTokens.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--color-warning)' }}>${fmt(u.costUsd, 5)}</td>
                    <td className="px-4 py-2 text-xs font-mono" style={{ color: 'var(--color-success)' }}>${fmt(rev)}</td>
                    <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(u.createdAt)}</td>
                  </tr>
                )
              })}
              {allUsage.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>Henüz kayıt yok</td></tr>
              )}
            </tbody>
          </table>
          {allUsage.length > 100 && (
            <p className="px-5 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>İlk 100 kayıt gösteriliyor. CSV export yakında.</p>
          )}
        </div>
      </div>
    </div>
  )
}
