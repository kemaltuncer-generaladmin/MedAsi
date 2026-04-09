'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ShieldCheck, ArrowLeft, Package, Users, TrendingUp,
  Save, RefreshCw, Layers, DollarSign, Trash2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  getPackagesWithCount, updatePackage, deletePackage,
  getAllModules, getModulesForPackage, updatePackageModules,
} from '@/lib/actions/admin'
import { CANONICAL_PACKAGE_NAMES } from '@/constants'

type PackageWithCount = {
  id: string
  name: string
  dailyAiLimit: number
  price: number
  _count: { users: number }
}

type Module = {
  id: string
  name: string
  description: string | null
}

type EditState = {
  dailyAiLimit: string
  price: string
}

const PACKAGE_CONFIG: Record<string, {
  badgeVariant: 'default' | 'success' | 'warning'
  borderColor: string
  accentColor: string
  label: string
  description: string
}> = {
  'Ücretsiz': {
    badgeVariant: 'default',
    borderColor: 'var(--color-primary)',
    accentColor: 'var(--color-primary)',
    label: 'Ücretsiz',
    description: 'Temel kullanım paketi',
  },
  'Giriş': {
    badgeVariant: 'success',
    borderColor: 'var(--color-success)',
    accentColor: 'var(--color-success)',
    label: 'Giriş',
    description: 'Gelişmiş çekirdek özellikler',
  },
  'Pro': {
    badgeVariant: 'success',
    borderColor: 'var(--color-secondary)',
    accentColor: 'var(--color-secondary)',
    label: 'Pro',
    description: 'Yüksek hacimli profesyonel kullanım',
  },
  'Kurumsal': {
    badgeVariant: 'warning',
    borderColor: 'var(--color-warning)',
    accentColor: 'var(--color-warning)',
    label: 'Kurumsal',
    description: 'Kurumlar için tam özellikli paket',
  },
}

function getConfig(name: string) {
  return PACKAGE_CONFIG[name] ?? {
    badgeVariant: 'secondary' as const,
    borderColor: 'var(--color-border)',
    accentColor: 'var(--color-text-secondary)',
    label: name,
    description: '',
  }
}

function formatTR(value: number, decimals = 0) {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ── Modules Panel ───────────────────────────────────────────────────────────

function PackageModulesPanel({ packageId }: { packageId: string }) {
  const [allModules, setAllModules] = useState<Module[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [modules, ids] = await Promise.all([
          getAllModules(),
          getModulesForPackage(packageId),
        ])
        setAllModules(modules)
        setChecked(new Set(ids))
        setLoaded(true)
      } catch {
        toast.error('Modüller yüklenemedi')
      }
    }
    load()
  }, [packageId])

  async function handleSave() {
    setSaving(true)
    try {
      await updatePackageModules(packageId, Array.from(checked))
      toast.success('Modüller güncellendi')
    } catch {
      toast.error('Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!loaded) {
    return (
      <div className="px-5 pb-4">
        <div className="h-16 rounded-lg animate-pulse bg-[var(--color-border)]" />
      </div>
    )
  }

  if (allModules.length === 0) {
    return (
      <div className="px-5 pb-4 text-xs text-[var(--color-text-secondary)]">
        Sistemde henüz modül yok.
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 space-y-3">
      <div
        className="rounded-lg p-3 space-y-2"
        style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
      >
        {allModules.map((mod) => (
          <label key={mod.id} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked.has(mod.id)}
              onChange={() => toggle(mod.id)}
              className="rounded"
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <div>
              <span className="text-sm text-[var(--color-text-primary)]">{mod.name}</span>
              {mod.description && (
                <span className="text-xs text-[var(--color-text-secondary)] ml-1.5">— {mod.description}</span>
              )}
            </div>
          </label>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
        <Save size={13} />
        Modülleri Kaydet
      </Button>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [editStates, setEditStates] = useState<Record<string, EditState>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPackagesWithCount()
      setPackages(data)
      const initial: Record<string, EditState> = {}
      data.forEach((pkg) => {
        initial[pkg.id] = {
          dailyAiLimit: String(pkg.dailyAiLimit),
          price: String(pkg.price),
        }
      })
      setEditStates(initial)
      setDirtyIds(new Set())
    } catch {
      toast.error('Paketler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  function handleFieldChange(id: string, field: keyof EditState, value: string) {
    setEditStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
    setDirtyIds((prev) => new Set([...prev, id]))
  }

  async function handleSave(pkg: PackageWithCount) {
    const state = editStates[pkg.id]
    if (!state) return

    const dailyAiLimit = parseInt(state.dailyAiLimit, 10)
    const price = parseFloat(state.price)

    if (isNaN(dailyAiLimit) || dailyAiLimit < 0) {
      toast.error('Günlük AI limiti geçerli bir sayı olmalıdır')
      return
    }
    if (isNaN(price) || price < 0) {
      toast.error('Fiyat geçerli bir sayı olmalıdır')
      return
    }

    setSavingIds((prev) => new Set([...prev, pkg.id]))
    try {
      await updatePackage(pkg.id, { dailyAiLimit, price })
      setPackages((prev) =>
        prev.map((p) =>
          p.id === pkg.id ? { ...p, dailyAiLimit, price } : p
        )
      )
      setDirtyIds((prev) => {
        const next = new Set(prev)
        next.delete(pkg.id)
        return next
      })
      toast.success(`${pkg.name} paketi güncellendi`)
    } catch {
      toast.error('Güncelleme başarısız oldu')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(pkg.id)
        return next
      })
    }
  }

  function handleBlurSave(pkg: PackageWithCount) {
    if (dirtyIds.has(pkg.id)) {
      handleSave(pkg)
    }
  }

  async function handleDelete(pkg: PackageWithCount) {
    if (pkg._count.users > 0) {
      toast.error(`Bu pakette ${pkg._count.users} kullanıcı var. Önce kullanıcıları taşıyın.`)
      return
    }
    if (!confirm(`"${pkg.name}" paketini silmek istediğinizden emin misiniz?`)) return

    setDeletingIds((prev) => new Set([...prev, pkg.id]))
    try {
      await deletePackage(pkg.id)
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id))
      toast.success(`${pkg.name} paketi silindi`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Silme başarısız')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(pkg.id)
        return next
      })
    }
  }

  function toggleModules(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalRevenue = packages.reduce(
    (sum, pkg) => sum + pkg.price * pkg._count.users,
    0
  )

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-[var(--color-primary)]" />
          <span className="text-lg font-bold text-[var(--color-text-primary)] tracking-wide">
            MED<span className="text-[var(--color-primary)]">ASI</span>{' '}
            <span className="text-[var(--color-text-secondary)] font-normal text-sm ml-1">Admin Panel</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadPackages} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yenile
          </Button>
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={15} />
              Geri Dön
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package size={22} className="text-[var(--color-primary)]" />
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Paket Yönetimi</h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Abonelik paketlerini görüntüleyin, düzenleyin ve yönetin.
            </p>
          </div>
          <Badge variant="secondary">Sabit 4 paket modeli aktif</Badge>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[var(--color-surface-elevated)] rounded-xl h-72 animate-pulse"
                style={{ borderTop: '3px solid var(--color-border)' }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Package cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const config = getConfig(pkg.name)
                const state = editStates[pkg.id] ?? {
                  dailyAiLimit: String(pkg.dailyAiLimit),
                  price: String(pkg.price),
                }
                const isSaving = savingIds.has(pkg.id)
                const isDeleting = deletingIds.has(pkg.id)
                const isDirty = dirtyIds.has(pkg.id)
                const currentLimit = parseInt(state.dailyAiLimit, 10) || 0
                const currentPrice = parseFloat(state.price) || 0
                const revenue = currentPrice * pkg._count.users
                const modulesExpanded = expandedModules.has(pkg.id)

                return (
                  <div
                    key={pkg.id}
                    className="bg-[var(--color-surface-elevated)] rounded-xl overflow-hidden flex flex-col"
                    style={{ borderTop: `3px solid ${config.borderColor}` }}
                  >
                    {/* Card header */}
                    <div className="p-5 pb-4 border-b border-[var(--color-border)]">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h2
                          className="text-xl font-bold"
                          style={{ color: config.accentColor }}
                        >
                          {pkg.name}
                        </h2>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={config.badgeVariant}>{config.label}</Badge>
                          {!CANONICAL_PACKAGE_NAMES.includes(pkg.name) && (
                            <button
                              onClick={() => handleDelete(pkg)}
                              disabled={isDeleting || pkg._count.users > 0}
                              title={pkg._count.users > 0 ? `${pkg._count.users} kullanıcı var` : 'Sil'}
                              className="p-1 rounded transition-colors"
                              style={{
                                color: pkg._count.users > 0 ? 'var(--color-text-secondary)' : 'var(--color-destructive)',
                                opacity: pkg._count.users > 0 ? 0.4 : 1,
                                cursor: pkg._count.users > 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-3">{config.description}</p>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-[var(--color-text-secondary)]" />
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {formatTR(pkg._count.users)} kullanıcı
                        </span>
                      </div>
                    </div>

                    {/* Editable fields */}
                    <div className="p-5 space-y-4 flex-1">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Günlük AI Limiti
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={state.dailyAiLimit}
                          onChange={(e) => handleFieldChange(pkg.id, 'dailyAiLimit', e.target.value)}
                          onBlur={() => handleBlurSave(pkg)}
                          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                          placeholder="50"
                        />
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Günde maks. {formatTR(currentLimit)} AI sorgusu
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                          Fiyat (₺/ay)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-secondary)] font-medium">₺</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={state.price}
                            onChange={(e) => handleFieldChange(pkg.id, 'price', e.target.value)}
                            onBlur={() => handleBlurSave(pkg)}
                            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-7 pr-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Revenue estimate */}
                      <div
                        className="rounded-lg p-3 flex items-center justify-between"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 80%, transparent)' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} style={{ color: config.accentColor }} />
                          <span className="text-xs text-[var(--color-text-secondary)]">Tahmini Gelir</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: config.accentColor }}>
                          ₺{formatTR(revenue, 2)}
                        </span>
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="px-5 pb-3">
                      <Button
                        variant={isDirty ? 'primary' : 'secondary'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleSave(pkg)}
                        loading={isSaving}
                        disabled={isSaving}
                      >
                        <Save size={13} />
                        {isSaving ? 'Kaydediliyor…' : isDirty ? 'Değişiklikleri Kaydet' : 'Kaydet'}
                      </Button>
                    </div>

                    {/* Modules toggle */}
                    <div className="px-5 pb-3">
                      <button
                        onClick={() => toggleModules(pkg.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
                        style={{
                          color: 'var(--color-text-secondary)',
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <span>Modüller</span>
                        {modulesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    {modulesExpanded && (
                      <div className="border-t border-[var(--color-border)]">
                        <PackageModulesPanel packageId={pkg.id} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-[var(--color-surface-elevated)] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <Layers size={17} className="text-[var(--color-text-secondary)]" />
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Paket Karşılaştırma</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider w-40">
                        Özellik
                      </th>
                      {packages.map((pkg) => {
                        const config = getConfig(pkg.name)
                        return (
                          <th
                            key={pkg.id}
                            className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider"
                            style={{ color: config.accentColor }}
                          >
                            {pkg.name}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                      <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)]">Günlük AI Limiti</td>
                      {packages.map((pkg) => (
                        <td key={pkg.id} className="px-6 py-3 text-center">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {formatTR(parseInt(editStates[pkg.id]?.dailyAiLimit ?? String(pkg.dailyAiLimit), 10) || 0)} sorgu
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                      <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)]">Aylık Fiyat</td>
                      {packages.map((pkg) => (
                        <td key={pkg.id} className="px-6 py-3 text-center">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            ₺{formatTR(parseFloat(editStates[pkg.id]?.price ?? String(pkg.price)) || 0, 2)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                      <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)]">Toplam Kullanıcı</td>
                      {packages.map((pkg) => (
                        <td key={pkg.id} className="px-6 py-3 text-center">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {formatTR(pkg._count.users)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-[var(--color-surface)] transition-colors">
                      <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)]">Tahmini Gelir</td>
                      {packages.map((pkg) => {
                        const config = getConfig(pkg.name)
                        const currentPrice = parseFloat(editStates[pkg.id]?.price ?? String(pkg.price)) || 0
                        const revenue = currentPrice * pkg._count.users
                        return (
                          <td key={pkg.id} className="px-6 py-3 text-center">
                            <span className="text-sm font-bold" style={{ color: config.accentColor }}>
                              ₺{formatTR(revenue, 2)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total revenue card */}
            <div
              className="bg-[var(--color-surface-elevated)] rounded-xl p-6"
              style={{ borderLeft: '4px solid var(--color-success)' }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}
                  >
                    <DollarSign size={22} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5">
                      Toplam Gelir Hesabı
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Tüm paketlerin kullanıcı sayısına göre tahmini aylık gelir
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold" style={{ color: 'var(--color-success)' }}>
                    ₺{formatTR(totalRevenue, 2)}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {formatTR(packages.reduce((s, p) => s + p._count.users, 0))} toplam kullanıcı
                  </p>
                </div>
              </div>

              {/* Per-package breakdown */}
              <div className="mt-5 pt-5 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const config = getConfig(pkg.name)
                  const currentPrice = parseFloat(editStates[pkg.id]?.price ?? String(pkg.price)) || 0
                  const revenue = currentPrice * pkg._count.users
                  const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
                  return (
                    <div key={pkg.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{pkg.name}</span>
                        <span className="text-xs font-bold" style={{ color: config.accentColor }}>
                          ₺{formatTR(revenue, 0)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: config.accentColor }}
                        />
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        %{formatTR(percentage, 1)} pay
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
