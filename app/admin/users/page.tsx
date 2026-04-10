'use client'

import React, { useDeferredValue, useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
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
  Trash2,
  MailCheck,
  KeyRound,
  Coins,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, badgeVariants } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getUsers, updateUserRole, updateUserPackage, getPackages, createUser, verifyUserEmail, giftTokens, getUserTokenBalance, sendUserPasswordResetLink, approveUserAccount } from '@/lib/actions/admin'

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
  accountApprovedAt: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  goals: unknown
  interests: unknown
  notificationPrefs: unknown
  package: Package
  usage30d?: {
    aiCalls: number
    aiTokens: number
    moduleEvents: number
    lastActivityAt: Date | null
  }
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

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function roleLabel(role: string): string {
  if (role === 'admin') return 'Admin'
  if (role === 'org_admin') return 'Org Admin'
  return 'Kullanıcı'
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

const QUICK_FILTER_OPTIONS: Array<{
  key: QuickFilter
  label: string
  tone: string
}> = [
  { key: 'all', label: 'Tumu', tone: 'var(--color-primary)' },
  { key: 'admins', label: 'Adminler', tone: 'var(--color-destructive)' },
  { key: 'pending', label: 'Onboarding Bekleyen', tone: 'var(--color-warning)' },
  { key: 'recent', label: 'Son 7 Gun', tone: 'var(--color-success)' },
]

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return ( // NOSONAR
    <tr className="border-b border-[var(--color-border)] animate-pulse">
      {[140, 120, 90, 120, 90, 110, 120].map((w, i) => (
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
  if (user.role === 'org_admin') {
    return (
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
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Rol kilitli
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            Organizasyon yöneticisi rolleri bu ekrandan değiştirilmiyor. Önce organizasyon sahipliğini güvenli şekilde devretmek gerekiyor.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              Tamam
            </Button>
          </div>
        </div>
      </div>
    )
  }

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

// ─── Modal: Gift Tokens ───────────────────────────────────────────────────────

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000]

function formatTokens(n: bigint | number): string {
  return Number(n).toLocaleString('tr-TR')
}

function GiftTokenModal({
  user,
  currentBalance,
  loading,
  onClose,
  onConfirm,
}: {
  user: User
  currentBalance: bigint | null
  loading: boolean
  onClose: () => void
  onConfirm: (amount: number, description: string) => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('Admin token hediyesi')
  const [validationError, setValidationError] = useState<string | null>(null)

  const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && description.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) {
      setValidationError('Geçerli bir miktar ve açıklama girin.')
      return
    }
    setValidationError(null)
    onConfirm(parsedAmount, description)
  }

  return (
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Coins size={20} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Token Hediye Et
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {user.name ?? user.email}
            </p>
          </div>
        </div>

        {/* Mevcut bakiye */}
        <div className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Mevcut bakiye</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
            {currentBalance === null
              ? '...'
              : `${formatTokens(currentBalance)} token`}
          </span>
        </div>

        {/* Hızlı seçim */}
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Hızlı seçim</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: parsedAmount === q ? 'rgba(245,158,11,0.15)' : 'var(--color-surface)',
                border: `1px solid ${parsedAmount === q ? 'var(--color-warning)' : 'var(--color-border)'}`,
                color: parsedAmount === q ? 'var(--color-warning)' : 'var(--color-text-secondary)',
              }}
            >
              {formatTokens(q)}
            </button>
          ))}
        </div>

        {/* Manuel giriş */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Token miktarı
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="örn. 100000"
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Açıklama
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hediye nedeni"
              maxLength={120}
              className="w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {validationError && (
          <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: 'var(--color-destructive)' }}>
            <AlertCircle size={13} />
            {validationError}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            onClick={handleSubmit}
            disabled={!isValid}
          >
            <Coins size={14} />
            {isValid ? `${formatTokens(parsedAmount)} Token Gönder` : 'Token Gönder'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Create User ───────────────────────────────────────────────────────

function CreateUserModal({
  packages,
  onClose,
  onConfirm,
  loading,
}: {
  packages: Package[]
  onClose: () => void
  onConfirm: (data: { email: string; name: string; packageId: string; role: string; password: string }) => void
  loading: boolean
}) {
  const [form, setForm] = useState({
    email: '',
    name: '',
    packageId: packages[0]?.id || '',
    role: 'user',
    password: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.name || !form.password) return
    onConfirm(form)
  }

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
            <UserPlus size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Yeni Kullanıcı Ekle
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Kullanıcı otomatik olarak e-posta onaylı olarak eklenecek
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              E-posta *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ahmet Yılmaz"
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Şifre *
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Güçlü bir şifre"
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Paket
            </label>
            <select
              value={form.packageId}
              onChange={(e) => setForm(f => ({ ...f, packageId: e.target.value }))}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            >
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} - ₺{pkg.price}/ay
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Rol
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            >
              <option value="user">Kullanıcı</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              type="submit"
              disabled={!form.email || !form.name || !form.password}
            >
              Kullanıcı Ekle
            </Button>
          </div>
        </form>
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
type QuickFilter = 'all' | 'admins' | 'pending' | 'recent'

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [packageFilter, setPackageFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [page, setPage] = useState(1)

  const [roleModal, setRoleModal] = useState<User | null>(null)
  const [packageModal, setPackageModal] = useState<User | null>(null)
  const [detailModal, setDetailModal] = useState<User | null>(null)
  const [deleteModal, setDeleteModal] = useState<User | null>(null)
  const [verifyEmailModal, setVerifyEmailModal] = useState<User | null>(null)
  const [passwordResetModal, setPasswordResetModal] = useState<User | null>(null)
  const [giftTokenModal, setGiftTokenModal] = useState<User | null>(null)
  const [giftTokenBalance, setGiftTokenBalance] = useState<bigint | null>(null)
  const [createUserModal, setCreateUserModal] = useState(false)
  const [mutating, setMutating] = useState(false)
  const deferredSearch = useDeferredValue(search)

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
    const searchLower = deferredSearch.trim().toLowerCase()

    return allUsers.filter((u) => {
      const matchSearch =
        !searchLower ||
        (u.name ?? '').toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      const matchPackage =
        packageFilter === 'all' || u.package.name.toLowerCase() === packageFilter.toLowerCase()
      const matchRole = roleFilter === 'all' || u.role === roleFilter

      const matchQuickFilter =
        quickFilter === 'all' ||
        (quickFilter === 'admins' && u.role === 'admin') ||
        (quickFilter === 'pending' && !u.onboardingCompleted) ||
        (quickFilter === 'recent' && isWithinLastWeek(u.createdAt))

      return matchSearch && matchPackage && matchRole && matchQuickFilter
    })
  }, [allUsers, deferredSearch, packageFilter, roleFilter, quickFilter])

  useEffect(() => { setPage(1) }, [deferredSearch, packageFilter, roleFilter, quickFilter])

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

  const hasActiveFilters =
    search.trim().length > 0 ||
    packageFilter !== 'all' ||
    roleFilter !== 'all' ||
    quickFilter !== 'all'

  const clearFilters = useCallback(() => {
    setSearch('')
    setPackageFilter('all')
    setRoleFilter('all')
    setQuickFilter('all')
  }, [])

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

  const handleVerifyEmailConfirm = async (userId: string) => {
    setMutating(true)
    try {
      await verifyUserEmail(userId)
      setVerifyEmailModal(null)
      await fetchData(true)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMutating(false)
    }
  }

  const handleApproveAccount = async (userId: string) => {
    setMutating(true)
    try {
      await approveUserAccount(userId)
      toast.success('Kullanıcı hesabı onaylandı')
      await fetchData(true)
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      toast.error(message)
    } finally {
      setMutating(false)
    }
  }

  const handleSendPasswordResetLink = async (userId: string) => {
    setMutating(true)
    try {
      const result = await sendUserPasswordResetLink(userId)
      setPasswordResetModal(null)
      toast.success(`Şifre sıfırlama bağlantısı gönderildi: ${result.email}`)
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      toast.error(message)
    } finally {
      setMutating(false)
    }
  }

  const openGiftTokenModal = async (user: User) => {
    setGiftTokenModal(user)
    setGiftTokenBalance(null)
    try {
      const bal = await getUserTokenBalance(user.id)
      setGiftTokenBalance(bal)
    } catch {
      setGiftTokenBalance(0n)
    }
  }

  const handleGiftTokenConfirm = async (amount: number, description: string) => {
    if (!giftTokenModal) return
    setMutating(true)
    try {
      await giftTokens(giftTokenModal.id, amount, description)
      setGiftTokenModal(null)
      setGiftTokenBalance(null)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMutating(false)
    }
  }

  const handleDeleteConfirm = async (userId: string) => {
    setMutating(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Silme işlemi başarısız')
      setAllUsers((prev) => prev.filter((u) => u.id !== userId))
      setDeleteModal(null)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMutating(false)
    }
  }

  const handleCreateUserConfirm = async (data: { email: string; name: string; packageId: string; role: string; password: string }) => {
    setMutating(true)
    try {
      await createUser(data)
      await fetchData(true) // Refresh the list
      setCreateUserModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setMutating(false)
    }
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

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTER_OPTIONS.map((option) => {
              const isActive = quickFilter === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setQuickFilter(option.key)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? `color-mix(in srgb, ${option.tone} 14%, transparent)`
                      : 'var(--color-surface)',
                    border: `1px solid ${isActive ? option.tone : 'var(--color-border)'}`,
                    color: isActive ? option.tone : 'var(--color-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              )
            })}
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
            variant="primary"
            size="sm"
            onClick={() => setCreateUserModal(true)}
          >
            <UserPlus size={15} />
            Kullanıcı Ekle
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={15} />
            Dışa Aktar
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Filtreleri Temizle
            </Button>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {filtered.length.toLocaleString('tr-TR')} sonuc gosteriliyor
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {hasActiveFilters
                ? 'Arama ve filtreler uygulaniyor'
                : 'Tum kullanicilar listeleniyor'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {deferredSearch !== search && (
              <span
                className="rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                Arama guncelleniyor...
              </span>
            )}
            <span>Sayfa basi {PAGE_SIZE} kayit</span>
          </div>
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
            contentVisibility: 'auto',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-elevated)',
                  }}
                >
                  {['Kullanıcı', 'Paket', 'Rol', 'Kullanım (30g)', 'Son Aktivite', 'Kayıt Tarihi', 'İşlemler'].map(
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
                      <td colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-surface)' }}
                          >
                            <Users size={24} style={{ color: 'var(--color-text-secondary)' }} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {hasActiveFilters
                              ? 'Sonuç bulunamadı'
                              : 'Henüz kullanıcı yok'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {hasActiveFilters
                              ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                              : 'Kayıt olan kullanıcılar burada görünecek'}
                          </p>
                          {hasActiveFilters && (
                            <button
                              onClick={clearFilters}
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
                      className="group transition-colors duration-100 hover:bg-[var(--color-surface)]"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
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
                        <Badge className={badgeVariants({ variant: user.role === 'admin' ? 'destructive' : user.role === 'org_admin' ? 'warning' : 'secondary' })}>
                          {roleLabel(user.role)}
                        </Badge>
                      </td>

                      {/* Onboarding */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {user.usage30d?.aiCalls ?? 0} AI cagrisi
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                            {formatCompactNumber(user.usage30d?.aiTokens ?? 0)} token · {user.usage30d?.moduleEvents ?? 0} modül olayı
                          </p>
                          <div>
                            {user.onboardingCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-success)' }}>
                                <Check size={12} />
                                onboarding tamam
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-warning)' }}>
                                <X size={12} />
                                onboarding bekliyor
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Son Aktivite */}
                      <td
                        className="px-5 py-3.5 text-sm whitespace-nowrap"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <div className="space-y-1">
                          <p>{formatDate(user.usage30d?.lastActivityAt ?? user.lastLoginAt ?? user.createdAt)}</p>
                          <p className="text-[11px]">
                            {user.accountApprovedAt ? 'hesap onayli' : 'hesap onayi bekliyor'}
                          </p>
                        </div>
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
                            onClick={() => {
                              if (user.role === 'org_admin') {
                                setError('Org Admin rolleri bu ekrandan değiştirilemez.')
                                return
                              }
                              setRoleModal(user)
                            }}
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
                          <Link
                            href={`/admin/users/${user.id}`}
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
                            <span className="hidden sm:inline">Analiz</span>
                          </Link>
                          {!user.accountApprovedAt ? (
                            <button
                              onClick={() => handleApproveAccount(user.id)}
                              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--color-success)'
                                e.currentTarget.style.borderColor = 'var(--color-success)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text-secondary)'
                                e.currentTarget.style.borderColor = 'var(--color-border)'
                              }}
                              title="Hesabı Onayla"
                            >
                              <Check size={13} />
                              <span className="hidden sm:inline">Onay</span>
                            </button>
                          ) : null}
                          <button
                            onClick={() => setVerifyEmailModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-success)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="E-posta Onayla"
                          >
                            <MailCheck size={13} />
                            <span className="hidden sm:inline">Onayla</span>
                          </button>
                          <button
                            onClick={() => setPasswordResetModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-warning)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Şifre Sıfırlama Linki Gönder"
                          >
                            <KeyRound size={13} />
                            <span className="hidden sm:inline">Şifre</span>
                          </button>
                          <button
                            onClick={() => openGiftTokenModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-warning)'
                              e.currentTarget.style.borderColor = 'var(--color-warning)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Token Hediye Et"
                          >
                            <Coins size={13} />
                            <span className="hidden sm:inline">Token</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal(user)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-primary)'
                              e.currentTarget.style.borderColor = 'var(--color-destructive)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                            }}
                            title="Sil"
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Sil</span>
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
      {createUserModal && (
        <CreateUserModal
          packages={packages}
          onClose={() => setCreateUserModal(false)}
          onConfirm={handleCreateUserConfirm}
          loading={mutating}
        />
      )}
      {detailModal && (
        <DetailModal user={detailModal} onClose={() => setDetailModal(null)} />
      )}
      {verifyEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setVerifyEmailModal(null)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
                <MailCheck size={20} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  E-posta Adresini Onayla
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Kullanıcının e-postası doğrulanmış olarak işaretlenecek
                </p>
              </div>
            </div>
            <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{verifyEmailModal.name ?? verifyEmailModal.email}</span> kullanıcısının e-posta adresi ({verifyEmailModal.email}) onaylanacak. Kullanıcı e-posta doğrulaması yapmadan giriş yapabilecek.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setVerifyEmailModal(null)} disabled={mutating}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={mutating}
                onClick={() => handleVerifyEmailConfirm(verifyEmailModal.id)}
              >
                <MailCheck size={14} />
                E-postayı Onayla
              </Button>
            </div>
          </div>
        </div>
      )}
      {passwordResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPasswordResetModal(null)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
                <KeyRound size={20} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Şifre Sıfırlama Linki Gönder
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Kullanıcıya güvenli sıfırlama e-postası gönderilecek
                </p>
              </div>
            </div>
            <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{passwordResetModal.name ?? passwordResetModal.email}</span> kullanıcısına ({passwordResetModal.email}) şifre sıfırlama bağlantısı gönderilecek.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setPasswordResetModal(null)} disabled={mutating}>
                Vazgeç
              </Button>
              <Button
                size="sm"
                loading={mutating}
                onClick={() => handleSendPasswordResetLink(passwordResetModal.id)}
              >
                <KeyRound size={14} />
                Link Gönder
              </Button>
            </div>
          </div>
        </div>
      )}
      {giftTokenModal && (
        <GiftTokenModal
          user={giftTokenModal}
          currentBalance={giftTokenBalance}
          loading={mutating}
          onClose={() => { setGiftTokenModal(null); setGiftTokenBalance(null) }}
          onConfirm={handleGiftTokenConfirm}
        />
      )}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
                <AlertCircle size={20} style={{ color: 'var(--color-destructive)' }} />
              </div>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Kullanıcıyı Sil
                </h2>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Bu işlem geri alınamaz. Kullanıcının tüm verileri kalıcı olarak silinecektir.
                </p>
              </div>
            </div>

            <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{deleteModal.name ?? deleteModal.email}</span> adlı kullanıcıyı silmek istediğinize emin misiniz?
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDeleteModal(null)} disabled={mutating}>
                Vazgeç
              </Button>
              <Button variant="destructive" size="sm" loading={mutating} onClick={() => handleDeleteConfirm(deleteModal.id)}>
                Kalıcı Olarak Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
