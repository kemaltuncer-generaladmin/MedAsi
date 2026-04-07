'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle, X, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_staj_planner_v1'

type RotationStatus = 'upcoming' | 'active' | 'completed'

type Procedure = {
  id: string
  label: string
  done: boolean
}

type Rotation = {
  id: string
  department: string
  startDate: string
  endDate: string
  status: RotationStatus
  procedures: Procedure[]
}

const STATUS_LABELS: Record<RotationStatus, string> = {
  upcoming: 'Yaklaşan',
  active: 'Aktif',
  completed: 'Tamamlandı',
}

const STATUS_BADGE: Record<RotationStatus, 'secondary' | 'warning' | 'success'> = {
  upcoming: 'secondary',
  active: 'warning',
  completed: 'success',
}

const DEFAULT_PROCEDURES: Record<string, string[]> = {
  'Dahiliye': ['IV Kanül Takma', 'Kan Alma', 'EKG Çekme', 'Tansiyon Ölçme', 'Nazogastrik Sonda'],
  'Cerrahi': ['Yara Bakımı', 'Sütür Atma', 'Sütür Alma', 'Asepsi Prosedürü', 'Dren Bakımı'],
  'Pediatri': ['Çocuk Muayenesi', 'Aşı Uygulaması', 'Burun Kültürü', 'İnhaler Kullanımı'],
  'Kadın-Doğum': ['Pelvik Muayene', 'Fetal Kalp Sesi Dinleme', 'NST Yorumu', 'USG Takibi'],
  'Acil': ['Temel Yaşam Desteği', 'Oksijen Uygulaması', 'Triaj', 'IV Erişim'],
  'default': ['IV Kanül Takma', 'Kan Alma', 'EKG Çekme', 'Tansiyon Ölçme'],
}

function getDefaultProcedures(department: string): Procedure[] {
  const list = DEFAULT_PROCEDURES[department] || DEFAULT_PROCEDURES['default']
  return list.map(label => ({ id: Math.random().toString(36).slice(2), label, done: false }))
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function diffDays(start: string, end: string) {
  if (!start || !end) return 0
  return Math.max(0, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

const EMPTY_FORM = { department: '', startDate: '', endDate: '', status: 'upcoming' as RotationStatus }

export default function StajPlannerPage() {
  const [rotations, setRotations] = useState<Rotation[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newProcText, setNewProcText] = useState<Record<string, string>>({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rotations))
  }, [rotations])

  const sorted = [...rotations].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))

  const allProcs = rotations.flatMap(r => r.procedures)
  const totalProcs = allProcs.length
  const doneProcs = allProcs.filter(p => p.done).length
  const overallPct = totalProcs > 0 ? Math.round((doneProcs / totalProcs) * 100) : 0

  function addRotation() {
    if (!form.department.trim()) { toast.error('Bölüm adı giriniz'); return }
    const rotation: Rotation = {
      id: newId(),
      ...form,
      procedures: getDefaultProcedures(form.department),
    }
    setRotations(prev => [...prev, rotation])
    setForm(EMPTY_FORM)
    setShowModal(false)
    toast.success('Staj rotasyonu eklendi')
  }

  function deleteRotation(id: string) {
    setRotations(prev => prev.filter(r => r.id !== id))
    toast.success('Rotasyon silindi')
  }

  function toggleProcedure(rotationId: string, procId: string) {
    setRotations(prev => prev.map(r =>
      r.id === rotationId
        ? { ...r, procedures: r.procedures.map(p => p.id === procId ? { ...p, done: !p.done } : p) }
        : r
    ))
  }

  function addProcedure(rotationId: string) {
    const text = (newProcText[rotationId] || '').trim()
    if (!text) return
    const proc: Procedure = { id: newId(), label: text, done: false }
    setRotations(prev => prev.map(r => r.id === rotationId ? { ...r, procedures: [...r.procedures, proc] } : r))
    setNewProcText(prev => ({ ...prev, [rotationId]: '' }))
  }

  function deleteProcedure(rotationId: string, procId: string) {
    setRotations(prev => prev.map(r =>
      r.id === rotationId ? { ...r, procedures: r.procedures.filter(p => p.id !== procId) } : r
    ))
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Staj Planlayıcı</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Klinik staj rotasyonları ve prosedür takibi</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Rotasyon Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Rotasyonlar</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">{rotations.length}</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Prosedürler</p>
          <p className="text-2xl font-bold text-[var(--color-success)]">{doneProcs}/{totalProcs}</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Genel İlerleme</p>
          <p className="text-2xl font-bold text-[var(--color-warning)]">%{overallPct}</p>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalProcs > 0 && (
        <Card variant="bordered" className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Tüm Prosedürlerde İlerleme</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{doneProcs}/{totalProcs} tamamlandı</p>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-elevated)]">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${overallPct}%`, background: 'var(--color-primary)' }}
            />
          </div>
        </Card>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card variant="elevated" className="w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Staj Rotasyonu Ekle</CardTitle>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-[var(--color-text-secondary)]" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Bölüm</label>
                <input
                  value={form.department}
                  onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Dahiliye, Cerrahi, Pediatri..."
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70">Bilinen bölümler için varsayılan prosedürler otomatik eklenir</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Başlangıç</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Bitiş</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Durum</label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as RotationStatus }))}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]">
                  <option value="upcoming">Yaklaşan</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Tamamlandı</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addRotation}><Plus size={14} /> Ekle</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowModal(false)}>İptal</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rotation List */}
      {sorted.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">Henüz rotasyon eklenmedi</p>
          <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}><Plus size={14} /> İlk Rotasyonu Ekle</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(rot => {
            const days = diffDays(rot.startDate, rot.endDate)
            const done = rot.procedures.filter(p => p.done).length
            const total = rot.procedures.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const isOpen = expanded[rot.id]
            const isActive = rot.status === 'active'
            return (
              <Card
                key={rot.id}
                variant={isActive ? 'elevated' : 'bordered'}
                className={`p-0 overflow-hidden ${isActive ? 'ring-1 ring-[var(--color-warning)]/40' : ''}`}
              >
                <button
                  onClick={() => toggleExpanded(rot.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[var(--color-surface-elevated)]/50 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown size={16} className="text-[var(--color-text-secondary)] shrink-0" /> : <ChevronRight size={16} className="text-[var(--color-text-secondary)] shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--color-text-primary)]">{rot.department}</p>
                      <Badge variant={STATUS_BADGE[rot.status]}>{STATUS_LABELS[rot.status]}</Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {rot.startDate || '?'} — {rot.endDate || '?'} ({days} gün)
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-elevated)] max-w-[120px]">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-primary)' }} />
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)]">{done}/{total} prosedür</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteRotation(rot.id) }}
                    className="shrink-0 p-1"
                  >
                    <Trash2 size={14} className="text-[var(--color-destructive)] opacity-40 hover:opacity-100" />
                  </button>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide my-3">Prosedürler</p>
                    <div className="space-y-1.5 mb-3">
                      {rot.procedures.length === 0 && (
                        <p className="text-xs text-[var(--color-text-secondary)] opacity-60">Henüz prosedür yok</p>
                      )}
                      {rot.procedures.map(proc => (
                        <div key={proc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors">
                          <button onClick={() => toggleProcedure(rot.id, proc.id)}>
                            {proc.done
                              ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                              : <Circle size={16} className="text-[var(--color-text-secondary)]" />}
                          </button>
                          <span className={`text-sm flex-1 ${proc.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>{proc.label}</span>
                          <button onClick={() => deleteProcedure(rot.id, proc.id)}>
                            <X size={11} className="text-[var(--color-destructive)] opacity-30 hover:opacity-100" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newProcText[rot.id] || ''}
                        onChange={e => setNewProcText(prev => ({ ...prev, [rot.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addProcedure(rot.id)}
                        placeholder="Özel prosedür ekle..."
                        className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <Button size="sm" onClick={() => addProcedure(rot.id)}><Plus size={12} /></Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
