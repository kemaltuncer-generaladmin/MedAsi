'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, Plus, Trash2, CheckCircle2, Circle, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_ders_planner_v1'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const SUBJECTS = [
  { label: 'Anatomi', color: 'var(--color-primary)' },
  { label: 'Fizyoloji', color: 'var(--color-success)' },
  { label: 'Farmakoloji', color: 'var(--color-warning)' },
  { label: 'Patoloji', color: 'var(--color-destructive)' },
  { label: 'Biyokimya', color: 'var(--color-secondary, #6366f1)' },
  { label: 'Histoloji', color: 'var(--color-primary)' },
  { label: 'Mikrobiyoloji', color: 'var(--color-success)' },
  { label: 'Dahiliye', color: 'var(--color-warning)' },
  { label: 'Cerrahi', color: 'var(--color-destructive)' },
  { label: 'Diğer', color: 'var(--color-text-secondary)' },
]

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

type Task = {
  id: string
  subject: string
  topic: string
  duration: number
  timeSlot: string
  done: boolean
}

type WeekData = Record<string, Task[]>

function getSubjectColor(subject: string): string {
  const found = SUBJECTS.find(s => s.label === subject)
  return found ? found.color : 'var(--color-text-secondary)'
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function DersPlannerPage() {
  const [weekData, setWeekData] = useState<WeekData>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const [showForm, setShowForm] = useState(false)
  const [formDay, setFormDay] = useState(DAY_KEYS[0])
  const [formSubject, setFormSubject] = useState(SUBJECTS[0].label)
  const [formTopic, setFormTopic] = useState('')
  const [formDuration, setFormDuration] = useState(60)
  const [formTimeSlot, setFormTimeSlot] = useState('09:00')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weekData))
  }, [weekData])

  const allTasks = DAY_KEYS.flatMap(d => weekData[d] || [])
  const totalPlanned = allTasks.reduce((s, t) => s + t.duration, 0)
  const totalDone = allTasks.filter(t => t.done).reduce((s, t) => s + t.duration, 0)
  const completionPct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0

  function addTask() {
    if (!formTopic.trim()) { toast.error('Konu giriniz'); return }
    const task: Task = {
      id: newId(),
      subject: formSubject,
      topic: formTopic.trim(),
      duration: formDuration,
      timeSlot: formTimeSlot,
      done: false,
    }
    setWeekData(prev => ({ ...prev, [formDay]: [...(prev[formDay] || []), task] }))
    setFormTopic('')
    setShowForm(false)
    toast.success('Görev eklendi')
  }

  function toggleTask(day: string, id: string) {
    setWeekData(prev => ({
      ...prev,
      [day]: (prev[day] || []).map(t => t.id === id ? { ...t, done: !t.done } : t),
    }))
  }

  function deleteTask(day: string, id: string) {
    setWeekData(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter(t => t.id !== id),
    }))
    toast.success('Görev silindi')
  }

  function clearWeek() {
    setWeekData({})
    toast.success('Hafta temizlendi')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <BookOpen size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Ders Planlayıcı</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Haftalık ders programı ve çalışma takibi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearWeek}>
            <Trash2 size={14} /> Bu Hafta Temizle
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> Görev Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Planlanan</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">{(totalPlanned / 60).toFixed(1)}s</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tamamlanan</p>
          <p className="text-2xl font-bold text-[var(--color-success)]">{(totalDone / 60).toFixed(1)}s</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tamamlanma</p>
          <p className="text-2xl font-bold text-[var(--color-warning)]">%{completionPct}</p>
        </Card>
      </div>

      {/* Progress */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Haftalık İlerleme</p>
          <p className="text-sm text-[var(--color-text-secondary)]">%{completionPct}</p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-surface-elevated)]">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${completionPct}%`, background: 'var(--color-primary)' }}
          />
        </div>
      </Card>

      {/* Add Task Form */}
      {showForm && (
        <Card variant="elevated" className="p-5">
          <CardTitle className="mb-4">Yeni Görev Ekle</CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Gün</label>
              <select
                value={formDay}
                onChange={e => setFormDay(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                {DAY_KEYS.map((d, i) => <option key={d} value={d}>{DAYS[i]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Ders</label>
              <select
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                {SUBJECTS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Saat</label>
              <select
                value={formTimeSlot}
                onChange={e => setFormTimeSlot(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-2">
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Konu</label>
              <input
                value={formTopic}
                onChange={e => setFormTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Çalışılacak konu..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Süre (dk)</label>
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={formDuration}
                onChange={e => setFormDuration(Number(e.target.value))}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addTask}><Plus size={14} /> Ekle</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </Card>
      )}

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {DAY_KEYS.map((dayKey, idx) => {
          const tasks = (weekData[dayKey] || []).slice().sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
          const dayDone = tasks.filter(t => t.done).reduce((s, t) => s + t.duration, 0)
          const dayTotal = tasks.reduce((s, t) => s + t.duration, 0)
          return (
            <Card key={dayKey} variant="bordered" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[var(--color-text-primary)] text-sm">{DAYS[idx]}</p>
                {tasks.length > 0 && (
                  <span className="text-xs text-[var(--color-text-secondary)]">{(dayDone / 60).toFixed(1)}/{(dayTotal / 60).toFixed(1)}s</span>
                )}
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)] text-center py-4 opacity-50">Görev yok</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={`rounded-lg p-2.5 border transition-all ${task.done ? 'opacity-60' : ''}`}
                      style={{ borderColor: `color-mix(in srgb, ${getSubjectColor(task.subject)} 40%, transparent)`, background: `color-mix(in srgb, ${getSubjectColor(task.subject)} 8%, transparent)` }}
                    >
                      <div className="flex items-start gap-2">
                        <button onClick={() => toggleTask(dayKey, task.id)} className="mt-0.5 shrink-0">
                          {task.done
                            ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                            : <Circle size={14} className="text-[var(--color-text-secondary)]" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${task.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>{task.topic}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-medium" style={{ color: getSubjectColor(task.subject) }}>{task.subject}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                            <Clock size={9} className="text-[var(--color-text-secondary)]" />
                            <span className="text-xs text-[var(--color-text-secondary)]">{task.timeSlot}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">{task.duration}dk</span>
                          </div>
                        </div>
                        <button onClick={() => deleteTask(dayKey, task.id)} className="shrink-0 opacity-30 hover:opacity-100 transition-opacity">
                          <Trash2 size={11} className="text-[var(--color-destructive)]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Subject Legend */}
      <Card variant="bordered" className="p-4">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Renk Kodlaması</p>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
