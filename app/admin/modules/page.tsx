'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ShieldCheck, ArrowLeft, Puzzle, RefreshCw, Plus, Trash2, X,
  Package, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getAllModules, createModule, deleteModule, getModuleUsageStats,
} from '@/lib/actions/admin'

type ModuleStats = {
  moduleId: string
  name: string
  description: string | null
  packageCount: number
  userCount: number
}

// ── Create Module Modal ─────────────────────────────────────────────────────

function CreateModuleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Modül adı gerekli')

    setSaving(true)
    try {
      await createModule({ name: name.trim(), description: description.trim() })
      toast.success('Modül oluşturuldu')
      onCreated()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Oluşturma başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Yeni Modül Oluştur</h2>
          <button onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
              Modül Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="Örn: AI Tanı"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              placeholder="Modül hakkında kısa açıklama"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" loading={saving} disabled={saving}>
              <Plus size={14} />
              Oluştur
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadModules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getModuleUsageStats()
      setModules(data)
    } catch {
      toast.error('Modüller yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModules()
  }, [loadModules])

  async function handleDelete(mod: ModuleStats) {
    if (mod.packageCount > 0 || mod.userCount > 0) {
      toast.error(`Bu modül ${mod.packageCount} pakette ve ${mod.userCount} kullanıcıda kullanılıyor.`)
      return
    }
    if (!confirm(`"${mod.name}" modülünü silmek istediğinizden emin misiniz?`)) return

    setDeletingIds((prev) => new Set([...prev, mod.moduleId]))
    try {
      await deleteModule(mod.moduleId)
      setModules((prev) => prev.filter((m) => m.moduleId !== mod.moduleId))
      toast.success(`${mod.name} modülü silindi`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Silme başarısız')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(mod.moduleId)
        return next
      })
    }
  }

  const inUseCount = modules.filter((m) => m.packageCount > 0 || m.userCount > 0).length

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {showCreateModal && (
        <CreateModuleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadModules}
        />
      )}

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
          <Button variant="ghost" size="sm" onClick={loadModules} disabled={loading}>
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Puzzle size={22} className="text-[var(--color-primary)]" />
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Modül Yönetimi</h1>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Platform modüllerini oluşturun, silin ve paket/kullanıcı kullanımını izleyin.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} />
            Yeni Modül
          </Button>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Toplam Modül', value: modules.length, color: 'var(--color-primary)' },
              { label: 'Kullanımda', value: inUseCount, color: 'var(--color-success)' },
              { label: 'Kullanılmayan', value: modules.length - inUseCount, color: 'var(--color-text-secondary)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[var(--color-surface-elevated)] rounded-xl p-4 text-center"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Module list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl animate-pulse bg-[var(--color-surface-elevated)]"
                style={{ border: '1px solid var(--color-border)' }}
              />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div
            className="bg-[var(--color-surface-elevated)] rounded-xl p-12 text-center"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <Puzzle size={40} className="mx-auto mb-3 text-[var(--color-text-secondary)] opacity-40" />
            <p className="text-[var(--color-text-secondary)] text-sm">Henüz modül yok.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-sm font-medium underline"
              style={{ color: 'var(--color-primary)' }}
            >
              İlk modülü oluştur
            </button>
          </div>
        ) : (
          <div
            className="bg-[var(--color-surface-elevated)] rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div className="px-6 py-3 border-b border-[var(--color-border)] grid grid-cols-12 gap-4">
              <div className="col-span-5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Modül
              </div>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] text-center">
                Paketler
              </div>
              <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] text-center">
                Kullanıcı Geçersizlemeleri
              </div>
              <div className="col-span-1" />
            </div>

            {modules.map((mod, idx) => {
              const isDeleting = deletingIds.has(mod.moduleId)
              const canDelete = mod.packageCount === 0 && mod.userCount === 0

              return (
                <div
                  key={mod.moduleId}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center transition-colors hover:bg-[var(--color-surface)]"
                  style={{
                    borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  {/* Name + description */}
                  <div className="col-span-5">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{mod.name}</p>
                    {mod.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                        {mod.description}
                      </p>
                    )}
                  </div>

                  {/* Package count */}
                  <div className="col-span-3 flex items-center justify-center gap-1.5">
                    <Package size={13} className="text-[var(--color-text-secondary)]" />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: mod.packageCount > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                    >
                      {mod.packageCount}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">paket</span>
                  </div>

                  {/* User override count */}
                  <div className="col-span-3 flex items-center justify-center gap-1.5">
                    <Users size={13} className="text-[var(--color-text-secondary)]" />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: mod.userCount > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}
                    >
                      {mod.userCount}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">kullanıcı</span>
                  </div>

                  {/* Delete button */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(mod)}
                      disabled={isDeleting || !canDelete}
                      title={
                        !canDelete
                          ? `${mod.packageCount} pakette / ${mod.userCount} kullanıcıda kullanılıyor`
                          : 'Sil'
                      }
                      className="p-1.5 rounded-md transition-colors"
                      style={{
                        color: canDelete ? 'var(--color-destructive)' : 'var(--color-text-secondary)',
                        opacity: canDelete ? 1 : 0.35,
                        cursor: canDelete ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
