'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Upload,
  Trash2,
  BookOpen,
  Layers,
  AlertCircle,
  CheckCircle2,
  Download,
  ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getPoolStats, deletePoolItems } from '@/lib/actions/admin'

// ─── JSON Example Templates ─────────────────────────────────────────────────

const QUESTION_EXAMPLE = [
  {
    subject: 'Kardiyoloji',
    difficulty: 'orta',
    questionText: 'Miyokard enfarktüsünde en erken yükselen biyobelirteç hangisidir?',
    options: [
      { label: 'A', text: 'Troponin I' },
      { label: 'B', text: 'CK-MB' },
      { label: 'C', text: 'Miyoglobin' },
      { label: 'D', text: 'LDH' },
      { label: 'E', text: 'AST' },
    ],
    correctAnswer: 'C',
    explanation: 'Miyoglobin, 1-4 saat içinde yükselir; en erken biyobelirteçtir.',
    tags: ['kalp', 'biyobelirteç', 'enfarktüs'],
  },
]

const FLASHCARD_EXAMPLE = [
  {
    subject: 'Kardiyoloji',
    front: 'MI sonrası en erken yükselen biyobelirteç nedir?',
    back: 'Miyoglobin — 1-4 saat içinde yükselir.',
    tags: ['kalp', 'biyobelirteç'],
  },
]

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PoolStats {
  questions: number
  flashcards: number
  subjects: string[]
}

interface UploadResult {
  inserted: number
  errors: string[]
}

// ─── Upload Card ─────────────────────────────────────────────────────────────

function UploadCard({
  type,
  title,
  icon: Icon,
  stats,
  onRefresh,
}: {
  type: 'questions' | 'flashcards'
  title: string
  icon: React.ElementType
  stats: PoolStats | null
  onRefresh: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [deleteSubject, setDeleteSubject] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showSubjectSelect, setShowSubjectSelect] = useState(false)

  const count = stats ? (type === 'questions' ? stats.questions : stats.flashcards) : null

  async function handleFile(file: File) {
    if (!file.name.endsWith('.json')) {
      toast.error('Sadece .json dosyaları kabul edilir.')
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await fetch('/api/admin/pool', { method: 'POST', body: fd })
      const data = (await res.json()) as UploadResult & { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Yükleme başarısız.')
      } else {
        setResult(data)
        toast.success(`${data.inserted} kayıt eklendi.`)
        onRefresh()
      }
    } catch {
      toast.error('Ağ hatası.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      deleteSubject
        ? `"${deleteSubject}" konusundaki tüm ${title.toLowerCase()} silinecek. Emin misiniz?`
        : `Tüm ${title.toLowerCase()} silinecek. Emin misiniz?`
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await deletePoolItems(type, deleteSubject || undefined)
      toast.success(`${res.deleted} kayıt silindi.`)
      setDeleteSubject('')
      onRefresh()
    } catch {
      toast.error('Silme işlemi başarısız.')
    } finally {
      setDeleting(false)
    }
  }

  const subjects = stats?.subjects ?? []

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Icon size={18} style={{ color: 'var(--color-primary)' }} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {count !== null && (
              <Badge variant="default">
                {count.toLocaleString('tr-TR')} kayıt
              </Badge>
            )}
            <button
              onClick={() =>
                downloadJson(
                  type === 'questions' ? QUESTION_EXAMPLE : FLASHCARD_EXAMPLE,
                  type === 'questions' ? 'soru-ornek.json' : 'flashcard-ornek.json'
                )
              }
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              title="Örnek JSON indir"
            >
              <Download size={12} />
              Örnek JSON
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-8 cursor-pointer transition-colors select-none"
          style={{
            borderColor: dragging ? 'var(--color-primary)' : 'var(--color-border)',
            backgroundColor: dragging
              ? 'color-mix(in srgb, var(--color-primary) 6%, transparent)'
              : 'var(--color-surface-elevated)',
          }}
        >
          <div
            className="rounded-full p-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            }}
          >
            <Upload size={22} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {uploading ? 'Yükleniyor...' : 'JSON dosyasını sürükleyin veya tıklayın'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-disabled)' }}>
              Yalnızca .json formatı
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
        </div>

        {/* Upload result */}
        {result && (
          <div
            className="rounded-lg p-4 space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} style={{ color: 'var(--color-success, #22c55e)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {result.inserted} kayıt başarıyla eklendi
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={13} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {result.errors.length} satır atlandı
                  </span>
                </div>
                <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Delete section */}
        <div
          className="rounded-lg p-4 space-y-3"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-disabled)' }}>
            Kayıt Silme
          </p>

          {/* Subject select */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSubjectSelect((v) => !v)}
              className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-md border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: deleteSubject ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
              }}
            >
              <span>{deleteSubject || 'Tüm konular (filtre yok)'}</span>
              <ChevronDown size={14} />
            </button>
            {showSubjectSelect && (
              <div
                className="absolute z-10 mt-1 w-full rounded-md border shadow-lg max-h-48 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <button
                  onClick={() => { setDeleteSubject(''); setShowSubjectSelect(false) }}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Tüm konular
                </button>
                {subjects.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setDeleteSubject(s); setShowSubjectSelect(false) }}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-red-500 border border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            {deleteSubject ? `"${deleteSubject}" konusunu sil` : 'Tüm kayıtları sil'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [stats, setStats] = useState<PoolStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const data = await getPoolStats()
      setStats(data)
    } catch {
      // silently fail — admin may not have DB yet
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            İçerik Havuzu
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Soru bankası ve flashcard havuzunu JSON dosyası ile yükleyin.
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <BookOpen size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{stats.questions.toLocaleString('tr-TR')} soru</span>
            </div>
            <div
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Layers size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{stats.flashcards.toLocaleString('tr-TR')} flashcard</span>
            </div>
            {stats.subjects.length > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-disabled)',
                }}
              >
                {stats.subjects.length} konu
              </div>
            )}
          </div>
        )}
        {loadingStats && (
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            İstatistikler yükleniyor...
          </span>
        )}
      </div>

      {/* Two upload cards side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UploadCard
          type="questions"
          title="Soru Havuzu"
          icon={BookOpen}
          stats={stats}
          onRefresh={fetchStats}
        />
        <UploadCard
          type="flashcards"
          title="Flashcard Havuzu"
          icon={Layers}
          stats={stats}
          onRefresh={fetchStats}
        />
      </div>

      {/* Format info */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>JSON Format Bilgisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-disabled)' }}>
                Soru Formatı
              </p>
              <pre
                className="text-xs rounded-lg p-4 overflow-x-auto leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {JSON.stringify(QUESTION_EXAMPLE, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-disabled)' }}>
                Flashcard Formatı
              </p>
              <pre
                className="text-xs rounded-lg p-4 overflow-x-auto leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {JSON.stringify(FLASHCARD_EXAMPLE, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
