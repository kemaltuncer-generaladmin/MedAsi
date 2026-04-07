'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GraduationCap, Calendar, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_tus_planner_v1'

type StudyStatus = 'Çalışmadım' | 'Çalışıyorum' | 'Tamamlandım' | 'Tekrar Gerekli'

const STATUS_CYCLE: StudyStatus[] = ['Çalışmadım', 'Çalışıyorum', 'Tamamlandım', 'Tekrar Gerekli']

const STATUS_STYLE: Record<StudyStatus, { badge: 'secondary' | 'warning' | 'success' | 'destructive'; dot: string }> = {
  'Çalışmadım':    { badge: 'secondary',    dot: 'var(--color-border)' },
  'Çalışıyorum':   { badge: 'warning',      dot: 'var(--color-warning)' },
  'Tamamlandım':   { badge: 'success',      dot: 'var(--color-success)' },
  'Tekrar Gerekli':{ badge: 'destructive',  dot: 'var(--color-destructive)' },
}

type SubjectGroup = {
  name: string
  subtopics: string[]
}

const SUBJECT_GROUPS: SubjectGroup[] = [
  {
    name: 'Dahiliye',
    subtopics: ['Kardiyoloji', 'Endokrinoloji', 'Gastroenteroloji', 'Nefroloji', 'Hematoloji', 'Romatoloji', 'Pulmoner', 'Nöroloji', 'İnfeksiyon'],
  },
  {
    name: 'Cerrahi',
    subtopics: ['Genel Cerrahi', 'Ortopedi', 'Üroloji', 'KBB', 'Göz', 'Plastik'],
  },
  {
    name: 'Temel Bilimler',
    subtopics: ['Anatomi', 'Fizyoloji', 'Biyokimya', 'Histoloji', 'Embriyoloji', 'Farmakoloji', 'Mikrobiyoloji', 'Patoloji', 'Biyoistatistik'],
  },
  {
    name: 'Pediatri',
    subtopics: ['Çocuk Sağlığı', 'Çocuk Hastalıkları'],
  },
  {
    name: 'Kadın-Doğum',
    subtopics: ['Obstetri', 'Jinekoloji'],
  },
  {
    name: 'Psikiyatri',
    subtopics: ['Genel Psikiyatri', 'Çocuk Psikiyatrisi'],
  },
  {
    name: 'Deri (Dermatoloji)',
    subtopics: ['Dermatoloji'],
  },
  {
    name: 'Radyoloji',
    subtopics: ['Radyoloji'],
  },
]

type StatusMap = Record<string, StudyStatus>

function groupKey(groupName: string, subtopic: string) {
  return `${groupName}::${subtopic}`
}

export default function TusPlannerPage() {
  const [statusMap, setStatusMap] = useState<StatusMap>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.statusMap || {}
      }
    } catch { /* ignore */ }
    return {}
  })

  const [examDate, setExamDate] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw).examDate || ''
    } catch { /* ignore */ }
    return ''
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SUBJECT_GROUPS.map(g => [g.name, true]))
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ statusMap, examDate }))
  }, [statusMap, examDate])

  function cycleStatus(groupName: string, subtopic: string) {
    const key = groupKey(groupName, subtopic)
    const current: StudyStatus = statusMap[key] || 'Çalışmadım'
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length
    setStatusMap(prev => ({ ...prev, [key]: STATUS_CYCLE[nextIdx] }))
  }

  function resetAll() {
    setStatusMap({})
    toast.success('Tüm ilerlemeler sıfırlandı')
  }

  const allSubtopics = SUBJECT_GROUPS.flatMap(g => g.subtopics.map(s => groupKey(g.name, s)))
  const total = allSubtopics.length
  const completed = allSubtopics.filter(k => statusMap[k] === 'Tamamlandım').length
  const inProgress = allSubtopics.filter(k => statusMap[k] === 'Çalışıyorum').length
  const needsRepeat = allSubtopics.filter(k => statusMap[k] === 'Tekrar Gerekli').length
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const remainingDays = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null

  function toggleGroup(name: string) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function groupProgress(group: SubjectGroup) {
    const done = group.subtopics.filter(s => statusMap[groupKey(group.name, s)] === 'Tamamlandım').length
    return { done, total: group.subtopics.length, pct: Math.round((done / group.subtopics.length) * 100) }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-[var(--color-warning)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">TUS Planlayıcı</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">TUS sınav hazırlık takip sistemi</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={resetAll}>
          <RotateCcw size={14} /> Sıfırla
        </Button>
      </div>

      {/* Exam date + stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1 flex items-center gap-1"><Calendar size={11} /> Sınav Tarihi</p>
          <input
            type="date"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
          {remainingDays !== null && (
            <p className="text-xs mt-1 font-semibold" style={{ color: remainingDays < 30 ? 'var(--color-destructive)' : 'var(--color-success)' }}>
              {remainingDays} gün kaldı
            </p>
          )}
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tamamlanan</p>
          <p className="text-2xl font-bold text-[var(--color-success)]">{completed}/{total}</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Devam Eden</p>
          <p className="text-2xl font-bold text-[var(--color-warning)]">{inProgress}</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tekrar Gerekli</p>
          <p className="text-2xl font-bold text-[var(--color-destructive)]">{needsRepeat}</p>
        </Card>
      </div>

      {/* Overall progress */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Genel İlerleme</p>
          <p className="text-sm text-[var(--color-text-secondary)]">%{overallPct}</p>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--color-surface-elevated)]">
          <div
            className="h-2.5 rounded-full transition-all"
            style={{ width: `${overallPct}%`, background: 'var(--color-success)' }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Konulara tıklayarak durumunu döngüsel olarak değiştir</p>
      </Card>

      {/* Subject groups */}
      <div className="space-y-3">
        {SUBJECT_GROUPS.map(group => {
          const prog = groupProgress(group)
          const isOpen = expanded[group.name]
          return (
            <Card key={group.name} variant="bordered" className="p-0 overflow-hidden">
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center gap-3 p-4 hover:bg-[var(--color-surface-elevated)] transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={16} className="text-[var(--color-text-secondary)] shrink-0" /> : <ChevronRight size={16} className="text-[var(--color-text-secondary)] shrink-0" />}
                <span className="flex-1 font-semibold text-[var(--color-text-primary)]">{group.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)] mr-2">{prog.done}/{prog.total}</span>
                <div className="w-24 h-1.5 rounded-full bg-[var(--color-surface-elevated)]">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${prog.pct}%`, background: 'var(--color-success)' }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] ml-2 w-8 text-right">%{prog.pct}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {group.subtopics.map(sub => {
                    const key = groupKey(group.name, sub)
                    const status: StudyStatus = statusMap[key] || 'Çalışmadım'
                    const style = STATUS_STYLE[status]
                    return (
                      <button
                        key={sub}
                        onClick={() => cycleStatus(group.name, sub)}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-all text-left group"
                      >
                        <div className="w-2 h-2 rounded-full shrink-0 transition-all" style={{ background: style.dot }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{sub}</p>
                          <Badge variant={style.badge} className="mt-0.5 text-[10px] px-1.5 py-0">{status}</Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Status Legend */}
      <Card variant="bordered" className="p-4">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Durum Açıklamaları</p>
        <div className="flex flex-wrap gap-3">
          {STATUS_CYCLE.map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_STYLE[s].dot }} />
              <span className="text-xs text-[var(--color-text-secondary)]">{s}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-2 opacity-70">Konuya tıkladıkça durum sırayla değişir</p>
      </Card>
    </div>
  )
}
