'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  Download,
  Users,
  ShieldAlert,
  CheckCircle2,
  UserPlus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  UserCog,
  PackageOpen,
  Eye,
} from 'lucide-react'
import { Badge, badgeVariants } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getUsers, updateUserRole, updateUserPackage, getPackages } from '@/lib/actions/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

type Package = {
  id: string
  name: string
  dailyAiLimit: number
  price: number
}

type User = {
  id: string
  email: string
  name: string | null
  role: string
  packageId: string
  onboardingCompleted: boolean
  createdAt: Date
  goals: unknown
  interests: unknown
  notificationPrefs: unknown
  package: Package
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email[0].toUpperCase()
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, var(--color-primary), #6366f1)',
  'linear-gradient(135deg, var(--color-success), #14b8a6)',
  'linear-gradient(135deg, var(--color-warning), #f97316)',
  'linear-gradient(135deg, #8b5cf6, var(--color-primary))',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
]

function getAvatarGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function packageBadgeVariant(packageName: string): 'default' | 'success' | 'warning' {
  const n = packageName.toLowerCase()
  if (n.includes('pro') || n.includes('klinik')) return 'success'
  if (n.includes('kurumsal') || n.includes('enterprise')) return 'warning'
  return 'default'
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isWithinLastWeek(date: Date): boolean {
  const now = Date.now()
  const d = new Date(date).getTime()
  return now - d < 7 * 24 * 60 * 60 * 1000
}

function exportCSV(users: User[]) {
  const header = ['Ad,Email,Paket,Rol,Onboarding,Kayıt Tarihi']
  const rows = users.map((u) => {
    const name = (u.name ?? '').replace(/"/g, '""')
    const email = u.email.replace(/"/g, '""')
    const pkg = u.package.name.replace(/"/g, '""')
    const role = u.role.replace(/"/g, '""')
    const onboarding = u.onboardingCompleted ? 'Evet' : 'Hayır'
    const date = new Date(u.createdAt).toISOString()
    return `"${name}","${email}","${pkg}","${role}","${onboarding}","${date}"`
  })
  const csv = [...header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `medasi-kullanicilar-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return ( // NOSONAR
    <tr className="border-b border-[var(--color-border)] animate-pulse">
      {[140, 200, 90, 70, 60, 110, 120].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div
            className="h-4 rounded bg-[var(--color-surface-elevated)]"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  )
}

// ─── Modal: Role Change ───────────────────────────────────────────────────────

function RoleChangeModal({
  user,
  onClose,
  onConfirm,
  loading,
}: {
  user: User
  onClose: () => void
  onConfirm: (role: string) => void
  loading: boolean
}) {
  const targetRole = user.role === 'admin' ? 'user' : 'admin'
  const targetLabel = targetRole === 'admin' ? 'Admin' : 'Kullanıcı'

  return ( // NOSONAR
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <UserCog size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Rol Değiştir
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Bu işlem geri alınabilir
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-4 mb-5"
          style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.name ?? user.email}
            </span>{' '}
            adlı kullanıcının rolü{' '}
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
            </span>{' '}
            konumundan{' '}
            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              {targetLabel}
            </span>{' '}
            olarak değiştirilecek.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button
            variant={targetRole === 'admin' ? 'primary' : 'secondary'}
            size="sm"
            loading={loading}
            onClick={() => onConfirm(targetRole)}
          >
            {targetLabel} Yap
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Package Change ────────────────────────────────────────────────────

function PackageChangeModal({
  user,
  packages,
  onClose,
  onConfirm,
  loading,
}: {
  user: User
  packages: Package[]
  onClose: () => void
  onConfirm: (packageId: string) => void
  loading: boolean
}) {
  const [selectedId, setSelectedId] = useState(user.packageId)

  return ( // NOSONAR
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <PackageOpen size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Paket Değiştir
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {user.name ?? user.email}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {packages.map((pkg) => {
            const isActive = pkg.id === selectedId
            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedId(pkg.id)}
                className="w-full text-left rounded-lg px-4 py-3 transition-all duration-150"
                style={{
                  backgroundColor: isActive ? 'var(--color-background)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: 'var(--color-text-primary)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{pkg.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Günlük {pkg.dailyAiLimit} AI sorgusu · ₺{pkg.price.toFixed(2)}/ay
                    </p>
                  </div>
                  {isActive && (
                    <Check size={16} style={{ color: 'var(--color-primary)' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => onConfirm(selectedId)}
            disabled={selectedId === user.packageId}
          >
            Paketi Güncelle
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: User Detail ───────────────────────────────────────────────────────

function DetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  function renderJson(value: unknown, label: string): React.ReactNode {
    if (!value) return null
    let parsed: unknown = value
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value) } catch { parsed = value }
    }
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
        {Array.isArray(parsed) ? (
          <div className="flex flex-wrap gap-1.5">
            {(parsed as unknown[]).map((item, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {String(item)}
              </span>
            ))}
          </div>
        ) : typeof parsed === 'object' && parsed !== null ? (
          <pre
            className="text-xs rounded-lg p-3 overflow-x-auto"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(parsed, null, 2)}
          </pre>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{String(parsed)}</p>
        )}
      </div>
    )
  }

  const fields: { label: string; value: string }[] = [
    { label: 'ID', value: user.id },
    { label: 'E-Posta', value: user.email },
    { label: 'Ad Soyad', value: user.name ?? '—' },
    { label: 'Rol', value: user.role },
    { label: 'Paket', value: user.package.name },
    { label: 'Paket ID', value: user.packageId },
    { label: 'Günlük AI Limiti', value: `${user.package.dailyAiLimit} sorgu` },
    { label: 'Paket Fiyatı', value: `₺${user.package.price.toFixed(2)}/ay` },
    { label: 'Onboarding', value: user.onboardingCompleted ? 'Tamamlandı' : 'Tamamlanmadı' },
    { label: 'Kayıt Tarihi', value: new Date(user.createdAt).toLocaleString('tr-TR') },
  ]

  return ( // NOSONAR
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: getAvatarGradient(user.id) }}
            >
              {getInitials(user.name, user.email)}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {user.name ?? user.email}
              </p>
              {user.name && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg px-3 py-2.5"
                style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs mb-0.5 font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  {label}
                </p>
                <p
                  className="text-xs font-medium break-all"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {!!(user.goals || user.interests || user.notificationPrefs) && (
            <div
              className="rounded-lg p-4 space-y-4"
              style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
            >
              {renderJson(user.goals, 'Hedefler')}
              {renderJson(user.interests, 'İlgi Alanları')}
              {renderJson(user.notificationPrefs, 'Bildirim Tercihleri')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [packageFilter, setPackageFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [roleModal, setRoleModal] = useState<User | null>(null)
  const [packageModal, setPackageModal] = useState<User | null>(null)
  const [detailModal, setDetailModal] = useState<User | null>(null)
  const [mutating, setMutating] = useState(false)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const [users, pkgs] = await Promise.all([getUsers(), getPackages()])
      setAllUsers(users as User[])
      setPackages(pkgs as Package[])
    } catch (e) {
      setError('Kullanıcılar yüklenirken hata oluştu.')
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    return allUsers.filter((u) => {
      const searchLower = search.toLowerCase()
      const matchSearch =
        !search ||
        (u.name ?? '').toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      const matchPackage =
        packageFilter === 'all' || u.package.name.toLowerCase() === packageFilter.toLowerCase()
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      return matchSearch && matchPackage && matchRole
    })
  }, [allUsers, search, packageFilter, roleFilter])

  useEffect(() => { setPage(1) }, [search, packageFilter, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => {
    const total = allUsers.length
    const admins = allUsers.filter((u) => u.role === 'admin').length
    const onboarded = allUsers.filter((u) => u.onboardingCompleted).length
    const recent = allUsers.filter((u) => isWithinLastWeek(u.createdAt)).length
    return { total, admins, onboarded, recent }
  }, [allUsers])

  const uniquePackageNames = useMemo(
    () => Array.from(new Set(allUsers.map((u) => u.package.name))),
    [allUsers]
  )

  const handleRoleConfirm = async (role: string) => {
    if (!roleModal) return
    setMutating(true)
    try {
      await updateUserRole(roleModal.id, role)
      setAllUsers((prev) => prev.map((u) => (u.id === roleModal.id ? { ...u, role } : u)))
      setRoleModal(null)
    } catch (e) {
      console.error(e)
    } finally {
      setMutating(false)
    }
  }

  const handlePackageConfirm = async (packageId: string) => {
    if (!packageModal) return
    setMutating(true)
    try {
      await updateUserPackage(packageModal.id, packageId)
      const newPkg = packages.find((p) => p.id === packageId)
      if (newPkg) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === packageModal.id ? { ...u, packageId, package: newPkg } : u
          )
        )
      }
      setPackageModal(null)
    } catch (e) {
      console.error(e)
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="space-y-6">
      <main className="space-y-6">
        {/* ── Page Heading ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Kullanıcı Yönetimi
              </h1>
              {!loading && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#000',
                  }}
                >
                  {allUsers.length}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Tüm kullanıcıları görüntüle ve yönet
            </p>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Yenile
            </Button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Toplam Kullanıcı',
              value: stats.total,
              icon: Users,
              color: 'var(--color-primary)',
            },
            {
              label: 'Admin Sayısı',
              value: stats.admins,
              icon: ShieldAlert,
              color: 'var(--color-destructive)',
            },
            {
              label: 'Onboarding Tamamlanan',
              value: stats.onboarded,
              icon: CheckCircle2,
              color: 'var(--color-success)',
            },
            {
              label: 'Son 7 Günde Kayıt',
              value: stats.recent,
              icon: UserPlus,
              color: 'var(--color-warning)',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderTop: `2px solid ${color}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {label}
                </p>
                <Icon size={15} style={{ color, opacity: 0.8 }} />
              </div>
              {loading ? (
                <div className="h-7 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface)' }} />
              ) : (
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {value}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Ad veya e-posta ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md pl-9 pr-3 py-2 text-sm transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="rounded-md px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Tüm Paketler</option>
            {uniquePackageNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Tüm Roller</option>
            <option value="user">Kullanıcı</option>
            <option value="admin">Admin</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={15} />
            Dışa Aktar
          </Button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)',
              border: '1px solid var(--color-destructive)',
              color: 'var(--color-destructive)',
            }}
          >
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => fetchData()}
              className="ml-auto text-xs underline underline-offset-2"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Kullanıcı', 'Paket', 'Rol', 'Onboarding', 'Kayıt Tarihi', 'İşlemler'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  : paginated.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-surface)' }}
                          >
                            <Users size={24} style={{ color: 'var(--color-text-secondary)' }} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {search || packageFilter !== 'all' || roleFilter !== 'all'
                              ? 'Sonuç bulunamadı'
                              : 'Henüz kullanıcı yok'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {search || packageFilter !== 'all' || roleFilter !== 'all'
                              ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                              : 'Kayıt olan kullanıcılar burada görünecek'}
                          </p>
                          {(search || packageFilter !== 'all' || roleFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setSearch('')
                                setPackageFilter('all')
                                setRoleFilter('all')
                              }}
                              className="text-xs px-3 py-1.5 rounded-md transition-colors"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              Filtreleri Temizle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                  : paginated.map((user) => (
                    <tr
                      key={user.id}
                      className="group transition-colors duration-100"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          'var(--color-surface)'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          'transparent'
                      }}
                    >
                      {/* Kullanıcı */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: getAvatarGradient(user.id) }}
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

                      {/* Paket */}
                      <td className="px-5 py-3.5">
                        <Badge className={badgeVariants({ variant: packageBadgeVariant(user.package.name) })}>
                          {user.package.name}
                        </Badge>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-3.5">
                        <Badge className={badgeVariants({ variant: user.role === 'admin' ? 'destructive' : 'secondary' })}>
                          {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                        </Badge>
                      </td>

                      {/* Onboarding */}
                      <td className="px-5 py-3.5">
                        {user.onboardingCompleted ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                            <Check size={14} />
                            Tamamlandı
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            <X size={14} />
                            Bekliyor
                          </span>
                        )}
                      </td>

                      {/* Kayıt Tarihi */}
                      <td
                        className="px-5 py-3.5 text-sm whitespace-nowrap"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {formatDate(user.createdAt)}
                      </td>

                      {/* İşlemler */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setRoleModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Rol Değiştir"
                          >
                            <UserCog size={13} />
                            <span className="hidden sm:inline">Rol</span>
                          </button>
                          <button
                            onClick={() => setPackageModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Paket Değiştir"
                          >
                            <PackageOpen size={13} />
                            <span className="hidden sm:inline">Paket</span>
                          </button>
                          <button
                            onClick={() => setDetailModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-primary)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Detay"
                          >
                            <Eye size={13} />
                            <span className="hidden sm:inline">Detay</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {filtered.length} kullanıcıdan{' '}
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{' '}
                gösteriliyor
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Footer summary ── */}
          {!loading && filtered.length > 0 && filtered.length <= PAGE_SIZE && (
            <div
              className="px-5 py-3 text-xs"
              style={{
                borderTop: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Toplam {filtered.length} kullanıcı gösteriliyor
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {roleModal && (
        <RoleChangeModal
          user={roleModal}
          onClose={() => setRoleModal(null)}
          onConfirm={handleRoleConfirm}
          loading={mutating}
        />
      )}
      {packageModal && (
        <PackageChangeModal
          user={packageModal}
          packages={packages}
          onClose={() => setPackageModal(null)}
          onConfirm={handlePackageConfirm}
          loading={mutating}
        />
      )}
      {detailModal && (
        <DetailModal user={detailModal} onClose={() => setDetailModal(null)} />
      )}
    </div>
  )
}
