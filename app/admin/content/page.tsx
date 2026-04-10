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
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getPoolStats,
  getPoolQuestions,
  getPoolFlashcards,
  deletePoolQuestion,
  deletePoolFlashcard,
  bulkDeletePoolQuestions,
  bulkDeletePoolFlashcards,
  getPoolBatches,
  deletePoolBatch,
} from '@/lib/actions/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PoolStats {
  questions: number
  flashcards: number
  subjects: string[]
}

interface UploadResult {
  inserted: number
  errors: string[]
}

interface PoolQuestion {
  id: string
  subject: string
  difficulty: string | null
  questionText: string
  options: unknown
  correctAnswer: string
  explanation: string | null
  tags: unknown
  source: string | null
  isActive: boolean
  createdAt: Date
}

interface PoolFlashcard {
  id: string
  subject: string
  front: string
  back: string
  tags: unknown
  source: string | null
  isActive: boolean
  createdAt: Date
}

interface BatchInfo {
  source: string
  questionCount: number
  flashcardCount: number
  createdAt: Date
}

// ─── Example Templates ────────────────────────────────────────────────────────

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

const QUESTION_EXCEL_HEADERS = [
  'subject',
  'difficulty',
  'questionText',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'optionE',
  'correctAnswer',
  'explanation',
  'tags',
]

const FLASHCARD_EXCEL_HEADERS = ['subject', 'front', 'back', 'tags']

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadExcelTemplate(headers: string[], filename: string) {
  // Build CSV-like content as a minimal Excel-compatible TSV
  const row = headers.join('\t')
  const blob = new Blob([row + '\n'], { type: 'text/tab-separated-values' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function difficultyColor(d: string | null) {
  if (d === 'kolay') return '#22c55e'
  if (d === 'zor') return '#ef4444'
  return '#f59e0b'
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  type,
  onSuccess,
}: {
  type: 'questions' | 'flashcards'
  onSuccess: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  async function handleUpload(file: File) {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const isJson = file.name.endsWith('.json')
    if (!isExcel && !isJson) {
      toast.error('Sadece .json veya .xlsx dosyaları kabul edilir.')
      return
    }
    setSelectedFile(file)
    setResult(null)
    setUploading(true)
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
        onSuccess()
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
    if (file) handleUpload(file)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
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
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
        >
          <Upload size={22} style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {uploading
              ? 'Yükleniyor...'
              : selectedFile
              ? selectedFile.name
              : 'JSON veya Excel (.xlsx) dosyası sürükleyin'}
          </p>
          {selectedFile && !uploading && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-disabled)' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          )}
          {!selectedFile && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-disabled)' }}>
              .json veya .xlsx formatı
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Template downloads */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            downloadJson(
              type === 'questions' ? QUESTION_EXAMPLE : FLASHCARD_EXAMPLE,
              type === 'questions' ? 'soru-ornek.json' : 'flashcard-ornek.json'
            )
          }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <Download size={11} />
          Örnek JSON indir
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            downloadExcelTemplate(
              type === 'questions' ? QUESTION_EXCEL_HEADERS : FLASHCARD_EXCEL_HEADERS,
              type === 'questions' ? 'soru-excel-sablon.tsv' : 'flashcard-excel-sablon.tsv'
            )
          }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <Download size={11} />
          Örnek Excel formatı
        </button>
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
    </div>
  )
}

// ─── Subject Dropdown ─────────────────────────────────────────────────────────

function SubjectDropdown({
  subjects,
  value,
  onChange,
  placeholder,
}: {
  subjects: string[]
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md border w-40"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-elevated)',
          color: value ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
        }}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 w-52 rounded-md border shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-left text-sm px-3 py-2 hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Tümü
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className="w-full text-left text-sm px-3 py-2 hover:opacity-70"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Question Browser ─────────────────────────────────────────────────────────

function QuestionBrowser({ subjects }: { subjects: string[] }) {
  const [items, setItems] = useState<PoolQuestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const PAGE_SIZE = 20

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPoolQuestions({ subject, difficulty, search, page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setTotal(res.total)
      setSelected(new Set())
    } catch {
      toast.error('Sorular yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [subject, difficulty, search, page])

  useEffect(() => { fetch() }, [fetch])

  async function handleDelete(id: string) {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return
    try {
      await deletePoolQuestion(id)
      toast.success('Soru silindi.')
      fetch()
    } catch {
      toast.error('Silme başarısız.')
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`${selected.size} soruyu silmek istediğinizden emin misiniz?`)) return
    setBulkDeleting(true)
    try {
      await bulkDeletePoolQuestions(Array.from(selected))
      toast.success(`${selected.size} soru silindi.`)
      fetch()
    } catch {
      toast.error('Toplu silme başarısız.')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(items.map((i) => i.id)))
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <SubjectDropdown
          subjects={subjects}
          value={subject}
          onChange={(v) => { setSubject(v); setPage(1) }}
          placeholder="Konu filtrele"
        />
        <select
          value={difficulty}
          onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
          className="text-sm px-3 py-2 rounded-md border"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-elevated)',
            color: difficulty ? 'var(--color-text-primary)' : 'var(--color-text-disabled)',
          }}
        >
          <option value="">Zorluk (tümü)</option>
          <option value="kolay">Kolay</option>
          <option value="orta">Orta</option>
          <option value="zor">Zor</option>
        </select>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
          className="flex items-center gap-1"
        >
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-disabled)' }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Soru metni ara..."
              className="text-sm pl-8 pr-3 py-2 rounded-md border w-52"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-elevated)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <button
            type="submit"
            className="text-xs px-3 py-2 rounded-md border hover:opacity-80"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Ara
          </button>
          {(search || subject || difficulty) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setSubject(''); setDifficulty(''); setPage(1) }}
              className="text-xs px-2 py-2 rounded-md border hover:opacity-80 flex items-center gap-1"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-disabled)',
              }}
            >
              <X size={11} />
              Temizle
            </button>
          )}
        </form>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-red-500 border border-red-500/30 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 size={13} />
            {selected.size} seçiliyi sil
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>Soru</th>
              <th className="px-3 py-3 text-left font-medium w-32" style={{ color: 'var(--color-text-secondary)' }}>Konu</th>
              <th className="px-3 py-3 text-left font-medium w-20" style={{ color: 'var(--color-text-secondary)' }}>Zorluk</th>
              <th className="px-3 py-3 text-left font-medium w-20" style={{ color: 'var(--color-text-secondary)' }}>Cevap</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>
                  Sonuç bulunamadı
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: selected.has(item.id)
                      ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)'
                      : undefined,
                  }}
                  className="hover:bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)]"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3" style={{ color: 'var(--color-text-primary)' }}>
                    {truncate(item.questionText, 90)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="default" className="text-xs">{item.subject}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-xs font-medium"
                      style={{ color: difficultyColor(item.difficulty) }}
                    >
                      {item.difficulty ?? 'orta'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {item.correctAnswer}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            {total.toLocaleString('tr-TR')} sonuçtan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} gösteriliyor
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:opacity-70"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm px-2" style={{ color: 'var(--color-text-secondary)' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:opacity-70"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Flashcard Browser ────────────────────────────────────────────────────────

function FlashcardBrowser({ subjects }: { subjects: string[] }) {
  const [items, setItems] = useState<PoolFlashcard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const PAGE_SIZE = 20

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPoolFlashcards({ subject, search, page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setTotal(res.total)
      setSelected(new Set())
    } catch {
      toast.error('Flashcardlar yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [subject, search, page])

  useEffect(() => { fetch() }, [fetch])

  async function handleDelete(id: string) {
    if (!confirm('Bu flashcardı silmek istediğinizden emin misiniz?')) return
    try {
      await deletePoolFlashcard(id)
      toast.success('Flashcard silindi.')
      fetch()
    } catch {
      toast.error('Silme başarısız.')
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`${selected.size} flashcardı silmek istediğinizden emin misiniz?`)) return
    setBulkDeleting(true)
    try {
      await bulkDeletePoolFlashcards(Array.from(selected))
      toast.success(`${selected.size} flashcard silindi.`)
      fetch()
    } catch {
      toast.error('Toplu silme başarısız.')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((i) => i.id)))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <SubjectDropdown
          subjects={subjects}
          value={subject}
          onChange={(v) => { setSubject(v); setPage(1) }}
          placeholder="Konu filtrele"
        />
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
          className="flex items-center gap-1"
        >
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-disabled)' }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ön yüz ara..."
              className="text-sm pl-8 pr-3 py-2 rounded-md border w-52"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-elevated)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
          <button
            type="submit"
            className="text-xs px-3 py-2 rounded-md border hover:opacity-80"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Ara
          </button>
          {(search || subject) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setSubject(''); setPage(1) }}
              className="text-xs px-2 py-2 rounded-md border hover:opacity-80 flex items-center gap-1"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-disabled)' }}
            >
              <X size={11} />
              Temizle
            </button>
          )}
        </form>
        {selected.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-red-500 border border-red-500/30 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 size={13} />
            {selected.size} seçiliyi sil
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>Ön Yüz</th>
              <th className="px-3 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>Arka Yüz</th>
              <th className="px-3 py-3 text-left font-medium w-32" style={{ color: 'var(--color-text-secondary)' }}>Konu</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>
                  Yükleniyor...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm" style={{ color: 'var(--color-text-disabled)' }}>
                  Sonuç bulunamadı
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: selected.has(item.id)
                      ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)'
                      : undefined,
                  }}
                  className="hover:bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)]"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3" style={{ color: 'var(--color-text-primary)' }}>
                    {truncate(item.front, 70)}
                  </td>
                  <td className="px-3 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {truncate(item.back, 70)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="default" className="text-xs">{item.subject}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            {total.toLocaleString('tr-TR')} sonuçtan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} gösteriliyor
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:opacity-70"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm px-2" style={{ color: 'var(--color-text-secondary)' }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded border disabled:opacity-40 hover:opacity-70"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Batch Manager ────────────────────────────────────────────────────────────

function BatchManager() {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPoolBatches()
      setBatches(data)
    } catch {
      toast.error('Batch bilgileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(source: string) {
    if (!confirm(`"${source}" batch'ini ve tüm içeriğini silmek istediğinizden emin misiniz?`)) return
    setDeleting(source)
    try {
      await deletePoolBatch(source)
      toast.success('Batch silindi.')
      load()
    } catch {
      toast.error('Silme başarısız.')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-disabled)' }}>
        Yükleniyor...
      </p>
    )
  }

  if (batches.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-disabled)' }}>
        Henüz batch yüklemesi yok.
      </p>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
            <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>Kaynak / Batch ID</th>
            <th className="px-4 py-3 text-left font-medium w-28" style={{ color: 'var(--color-text-secondary)' }}>Soru</th>
            <th className="px-4 py-3 text-left font-medium w-28" style={{ color: 'var(--color-text-secondary)' }}>Flashcard</th>
            <th className="px-4 py-3 text-left font-medium w-36" style={{ color: 'var(--color-text-secondary)' }}>Tarih</th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr
              key={b.source}
              style={{ borderBottom: '1px solid var(--color-border)' }}
              className="hover:bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)]"
            >
              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {b.source}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                {b.questionCount.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                {b.flashcardCount.toLocaleString('tr-TR')}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-disabled)' }}>
                {new Date(b.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <button
                  disabled={deleting === b.source}
                  onClick={() => handleDelete(b.source)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-40"
                  title="Batch'i sil"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'questions' | 'flashcards'

export default function ContentPage() {
  const [stats, setStats] = useState<PoolStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('questions')

  const fetchStats = useCallback(async () => {
    try {
      const data = await getPoolStats()
      setStats(data)
    } catch {
      // silently fail
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const subjects = stats?.subjects ?? []

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-10">
      {/* Header + Stats Bar */}
      <div className="flex items-start justify-between flex-wrap gap-4 py-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            İçerik Havuzu
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Soru bankası ve flashcard havuzunu yönetin.
          </p>
        </div>

        {/* Stats chips */}
        {!loadingStats && stats && (
          <div className="flex flex-wrap gap-2">
            <div
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
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
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Layers size={14} style={{ color: 'var(--color-primary)' }} />
              <span>{stats.flashcards.toLocaleString('tr-TR')} flashcard</span>
            </div>
            <div
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-disabled)',
              }}
            >
              <Package size={14} />
              <span>{stats.subjects.length} konu</span>
            </div>
          </div>
        )}
        {loadingStats && (
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            İstatistikler yükleniyor...
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-0 rounded-xl overflow-hidden border w-fit"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {(['questions', 'flashcards'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab
                  ? 'var(--color-primary)'
                  : 'var(--color-surface-elevated)',
              color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {tab === 'questions' ? <BookOpen size={14} /> : <Layers size={14} />}
            {tab === 'questions' ? 'Sorular' : 'Flashcardlar'}
          </button>
        ))}
      </div>

      {/* Upload + Browse Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upload Card */}
        <Card variant="bordered" className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={16} style={{ color: 'var(--color-primary)' }} />
              {activeTab === 'questions' ? 'Soru Yükle' : 'Flashcard Yükle'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UploadZone type={activeTab} onSuccess={fetchStats} />
          </CardContent>
        </Card>

        {/* Browser Card */}
        <Card variant="bordered" className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeTab === 'questions' ? (
                <>
                  <BookOpen size={16} style={{ color: 'var(--color-primary)' }} />
                  Soru Listesi
                </>
              ) : (
                <>
                  <Layers size={16} style={{ color: 'var(--color-primary)' }} />
                  Flashcard Listesi
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'questions' ? (
              <QuestionBrowser subjects={subjects} />
            ) : (
              <FlashcardBrowser subjects={subjects} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batch Management */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package size={16} style={{ color: 'var(--color-primary)' }} />
            Batch Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BatchManager />
        </CardContent>
      </Card>
    </div>
  )
}
