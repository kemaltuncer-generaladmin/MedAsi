'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ClipboardList, Plus, Search, Edit2, Trash2, X, Calendar, User, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

type Case = { id: string; title: string; description: string; patientId?: string | null; createdAt: string }
type Patient = { id: string; name: string }
type FormData = { title: string; description: string; patientId: string }
type Filter = 'all' | 'week' | 'month'

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Case | null>(null)
  const [form, setForm] = useState<FormData>({ title: '', description: '', patientId: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Case | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [casesRes, patientsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/patients'),
      ])
      if (casesRes.ok) {
        const d = await casesRes.json()
        setCases(d.cases ?? [])
      }
      if (patientsRes.ok) {
        const d = await patientsRes.json()
        setPatients(d.patients ?? [])
      }
    } catch {
      toast.error('Vakalar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ title: '', description: '', patientId: '' })
    setShowForm(true)
  }

  function openEdit(c: Case) {
    setEditing(c)
    setForm({ title: c.title, description: c.description, patientId: c.patientId ?? '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Vaka başlığı zorunludur'); return }
    if (!form.description.trim()) { toast.error('Vaka açıklaması zorunludur'); return }
    setSaving(true)
    try {
      const body = {
        ...(editing && { id: editing.id }),
        title: form.title,
        description: form.description,
        ...(form.patientId && { patientId: form.patientId }),
      }
      const res = await fetch('/api/cases', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? 'Vaka güncellendi' : 'Vaka oluşturuldu')
      setShowForm(false)
      load()
    } catch {
      toast.error('Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCase() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch('/api/cases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: confirmDelete.id }),
      })
      if (!res.ok) throw new Error()
      toast.success('Vaka silindi')
      setConfirmDelete(null)
      load()
    } catch {
      toast.error('Silme başarısız')
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function getPatientName(id?: string | null) {
    return patients.find(p => p.id === id)?.name ?? null
  }

  function filterByDate(c: Case) {
    if (filter === 'all') return true
    const d = new Date(c.createdAt)
    const now = new Date()
    if (filter === 'week') {
      const week = new Date(now.getTime() - 7 * 86400000)
      return d >= week
    }
    const month = new Date(now.getFullYear(), now.getMonth(), 1)
    return d >= month
  }

  const filtered = cases.filter(c =>
    filterByDate(c) &&
    (c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Vakalarım</h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">AI destekli vaka takip sistemi</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Yeni Vaka
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          {([['all', 'Tümü'], ['week', 'Bu Hafta'], ['month', 'Bu Ay']] as [Filter, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={[
                'px-3 py-1.5 rounded-md text-sm transition-all',
                filter === v ? 'bg-[var(--color-primary)] text-black font-medium' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Vaka ara..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <Badge variant="default" className="shrink-0 self-center">{filtered.length} vaka</Badge>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-[var(--color-surface)] animate-pulse border border-[var(--color-border)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
            <ClipboardList size={28} className="text-[var(--color-text-secondary)]" />
          </div>
          <div className="text-center">
            <p className="text-[var(--color-text-primary)] font-medium text-lg">
              {search ? 'Sonuç bulunamadı' : 'Henüz vaka kaydı yok'}
            </p>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Vakalarınızı kaydedin ve AI ile analiz edin
            </p>
          </div>
          {!search && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} />
              Vaka Ekle
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(c => {
            const patientName = getPatientName(c.patientId)
            return (
              <div
                key={c.id}
                className="flex gap-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/40 transition-all overflow-hidden group"
              >
                <div className="w-1 bg-[var(--color-primary)] shrink-0" />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-1.5">{c.title}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {patientName && (
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-[var(--color-text-secondary)]" />
                        <Badge variant="default" className="text-xs">{patientName}</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Calendar size={11} className="text-[var(--color-text-secondary)]" />
                      <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-lg border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editing ? 'Vakayı Düzenle' : 'Yeni Vaka Oluştur'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Vaka Başlığı"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Kısa ve açıklayıcı başlık"
              />
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Vaka Açıklaması</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Vakanın detaylı açıklaması..."
                  rows={4}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Bağlı Hasta (İsteğe Bağlı)</label>
                <select
                  value={form.patientId}
                  onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Hasta seçin (isteğe bağlı)</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">İptal</Button>
                <Button variant="primary" loading={saving} onClick={save} className="flex-1">Kaydet</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-sm border border-[var(--color-border)]">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Vakayı Sil</h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              <span className="text-[var(--color-text-primary)] font-medium">&ldquo;{confirmDelete.title}&rdquo;</span> adlı vakayı silmek istediğinizden emin misiniz?
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">İptal</Button>
              <Button variant="destructive" loading={deleting} onClick={deleteCase} className="flex-1">Sil</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
