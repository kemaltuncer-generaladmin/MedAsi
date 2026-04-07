'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Zap, Plus, Play, X, Search, Star, Check,
  Trash2, Pencil, Filter, ChevronRight, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_spot_notlar_v1'

type Subject = string

interface SpotNote {
  id: string
  title: string
  fact: string
  subject: Subject
  importance: 1 | 2 | 3
  memorized: boolean
  createdAt: string
  editedAt?: string
}

const SAMPLE_SPOTS: SpotNote[] = [
  {
    id: 'spot_1',
    title: 'Wells Skoru PE',
    fact: 'Wells Skoru >4 → PE olası (Klinik olasılık yüksek). BT anjiyografi ile doğrula. D-dimer yalnızca düşük olasılıkta kullanılır.',
    subject: 'Dahiliye',
    importance: 3,
    memorized: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'spot_2',
    title: 'HEART Skoru',
    fact: 'HEART skoru >6 → Yüksek risk AKS. Troponin, EKG, yaş, risk faktörleri ve anamnez değerlendirilir. Yatış ve invazif tetkik gerekir.',
    subject: 'Kardiyoloji',
    importance: 3,
    memorized: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'spot_3',
    title: 'Digoksin Toksisitesi Bulguları',
    fact: 'GI: bulantı, kusma, karın ağrısı\nNörolojik: görme bozukluğu (sarı-yeşil görme), konfüzyon\nKardiyak: bradikardi, AV blok, ventriküler aritmiler\nTedavi: Digoksin-spesifik antikor (Digibind)',
    subject: 'Farmakoloji',
    importance: 3,
    memorized: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'spot_4',
    title: 'Child-Pugh Skoru',
    fact: 'Karaciğer sirozu şiddetini derecelendiren skor. 5 parametre: Bilirubin, Albumin, PT/INR, Asit, Ensefalopati.\nA: 5-6 puan (iyi prognoz)\nB: 7-9 puan\nC: 10-15 puan (kötü prognoz)',
    subject: 'Dahiliye',
    importance: 2,
    memorized: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'spot_5',
    title: 'Ranson Kriterleri (Pankreatit)',
    fact: 'Akut pankreatitte ciddiyet değerlendirmesi.\nKabulde: Yaş >55, BK >16k, Glukoz >200, LDH >350, AST >250\n48 saatte: Htc ↓>10%, BUN ↑>5, Ca <8, PO2 <60, Baz def >4, Sıvı ihtiyacı >6L\n≥3 kriter → ciddi pankreatit',
    subject: 'Cerrahi',
    importance: 3,
    memorized: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'spot_6',
    title: 'Glasgow-Blatchford Skoru (ÜGİ Kanama)',
    fact: 'Üst GİS kanamasında acil girişim gereksinimini öngörür.\nSkor 0 → ambulatuvar takip güvenli\nSkor >6 → yüksek risk, endoskopi gerekli\nParametreler: BUN, Hgb, SKB, nabız, melena, senkop, karaciğer/kalp hastalığı',
    subject: 'Dahiliye',
    importance: 2,
    memorized: false,
    createdAt: new Date().toISOString()
  }
]

function Stars({ count, interactive = false, onChange }: { count: number; interactive?: boolean; onChange?: (n: 1 | 2 | 3) => void }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= count ? 'var(--color-warning)' : 'none'}
          stroke={i <= count ? 'var(--color-warning)' : 'var(--color-text-secondary)'}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
          onClick={interactive && onChange ? () => onChange(i as 1 | 2 | 3) : undefined}
        />
      ))}
    </span>
  )
}

export default function SpotNotlarPage() {
  const [notes, setNotes] = useState<SpotNote[]>([])
  const [mode, setMode] = useState<'list' | 'quiz' | 'add' | 'edit'>('list')
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState<string>('Tümü')
  const [filterImportance, setFilterImportance] = useState<number>(0)
  const [showMemorized, setShowMemorized] = useState(false)

  // Quiz state
  const [quizQueue, setQuizQueue] = useState<SpotNote[]>([])
  const [quizIndex, setQuizIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // Form
  const [form, setForm] = useState<{
    id?: string; title: string; fact: string; subject: string; importance: 1 | 2 | 3
  }>({ title: '', fact: '', subject: 'Dahiliye', importance: 2 })

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      setNotes(JSON.parse(raw))
    } else {
      setNotes(SAMPLE_SPOTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_SPOTS))
    }
  }, [])

  const saveNotes = useCallback((ns: SpotNote[]) => {
    setNotes(ns)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ns))
  }, [])

  const subjects = Array.from(new Set(notes.map(n => n.subject)))

  const filtered = notes.filter(n => {
    if (!showMemorized && n.memorized) return false
    if (showMemorized && !n.memorized) return false
    if (filterSubject !== 'Tümü' && n.subject !== filterSubject) return false
    if (filterImportance > 0 && n.importance !== filterImportance) return false
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
      !n.fact.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => b.importance - a.importance)

  function startQuiz() {
    const queue = notes.filter(n => !n.memorized)
      .filter(n => filterSubject === 'Tümü' || n.subject === filterSubject)
    if (queue.length === 0) {
      toast.error('Quiz için aktif spot not bulunamadı.')
      return
    }
    const shuffled = [...queue].sort(() => Math.random() - 0.5)
    setQuizQueue(shuffled)
    setQuizIndex(0)
    setRevealed(false)
    setMode('quiz')
  }

  function markMemorized(id: string) {
    saveNotes(notes.map(n => n.id === id ? { ...n, memorized: true } : n))
    toast.success('Ezberlenmiş olarak işaretlendi!')
  }

  function unmarkMemorized(id: string) {
    saveNotes(notes.map(n => n.id === id ? { ...n, memorized: false } : n))
  }

  function deleteNote(id: string) {
    saveNotes(notes.filter(n => n.id !== id))
    toast.success('Spot not silindi.')
  }

  function saveForm() {
    if (!form.title.trim() || !form.fact.trim()) {
      toast.error('Başlık ve not zorunludur.')
      return
    }
    if (form.id) {
      // Edit
      saveNotes(notes.map(n => n.id === form.id
        ? { ...n, title: form.title.trim(), fact: form.fact.trim(), subject: form.subject, importance: form.importance, editedAt: new Date().toISOString() }
        : n
      ))
      toast.success('Güncellendi!')
    } else {
      // Add
      const newNote: SpotNote = {
        id: `spot_${Date.now()}`,
        title: form.title.trim(),
        fact: form.fact.trim(),
        subject: form.subject,
        importance: form.importance,
        memorized: false,
        createdAt: new Date().toISOString()
      }
      saveNotes([...notes, newNote])
      toast.success('Spot not eklendi!')
    }
    setForm({ title: '', fact: '', subject: 'Dahiliye', importance: 2 })
    setMode('list')
  }

  function openEdit(note: SpotNote) {
    setForm({ id: note.id, title: note.title, fact: note.fact, subject: note.subject, importance: note.importance })
    setMode('edit')
  }

  // QUIZ MODE
  if (mode === 'quiz' && quizQueue[quizIndex]) {
    const current = quizQueue[quizIndex]
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center">
              <Zap size={20} className="text-[var(--color-warning)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Quiz Modu</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {quizIndex + 1} / {quizQueue.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X size={15} /> Çıkış
          </Button>
        </div>

        <div className="w-full h-1.5 bg-[var(--color-surface-elevated)] rounded-full">
          <div
            className="h-full bg-[var(--color-warning)] rounded-full transition-all"
            style={{ width: `${((quizIndex + 1) / quizQueue.length) * 100}%` }}
          />
        </div>

        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{current.subject}</Badge>
            <Stars count={current.importance} />
          </div>

          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{current.title}</h2>

          {!revealed ? (
            <div className="text-center py-8">
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">Hatırlamaya çalış, sonra yanıtı göster</p>
              <Button variant="secondary" onClick={() => setRevealed(true)}>
                <Eye size={15} /> Göster
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">{current.fact}</p>
            </div>
          )}
        </Card>

        {revealed && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (quizIndex >= quizQueue.length - 1) { setMode('list'); toast.success('Quiz tamamlandı!'); return }
                setQuizIndex(i => i + 1)
                setRevealed(false)
              }}
              className="flex-1 py-3 rounded-lg border-2 border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)] text-sm font-semibold hover:bg-[var(--color-destructive)]/10 transition-all"
            >
              Hatırlamadım
            </button>
            <button
              onClick={() => {
                markMemorized(current.id)
                if (quizIndex >= quizQueue.length - 1) { setMode('list'); toast.success('Quiz tamamlandı!'); return }
                setQuizIndex(i => i + 1)
                setRevealed(false)
              }}
              className="flex-1 py-3 rounded-lg border-2 border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)] text-sm font-semibold hover:bg-[var(--color-success)]/10 transition-all"
            >
              Ezberledim
            </button>
          </div>
        )}
      </div>
    )
  }

  // ADD / EDIT MODE
  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center">
              <Plus size={20} className="text-[var(--color-warning)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {mode === 'edit' ? 'Spot Not Düzenle' : 'Spot Not Ekle'}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setMode('list'); setForm({ title: '', fact: '', subject: 'Dahiliye', importance: 2 }) }}>
            <X size={15} /> İptal
          </Button>
        </div>

        <Card variant="elevated" className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Başlık</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Örn. Wells Skoru PE"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Not</label>
            <textarea
              value={form.fact}
              onChange={e => setForm(f => ({ ...f, fact: e.target.value }))}
              rows={5}
              placeholder="Yüksek verimli bilgiyi kısa ve net yaz..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Konu</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Konu..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Önem</label>
              <Stars count={form.importance} interactive onChange={n => setForm(f => ({ ...f, importance: n }))} />
            </div>
          </div>
          <Button variant="primary" onClick={saveForm} className="w-full">
            <Check size={15} /> {mode === 'edit' ? 'Güncelle' : 'Kaydet'}
          </Button>
        </Card>
      </div>
    )
  }

  // LIST MODE
  const activeCount = notes.filter(n => !n.memorized).length
  const memorizedCount = notes.filter(n => n.memorized).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center">
            <Zap size={20} className="text-[var(--color-warning)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Spot Notlar</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">{activeCount} aktif · {memorizedCount} ezberlenmiş</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMode('add')}>
            <Plus size={14} /> Ekle
          </Button>
          <Button variant="primary" size="sm" onClick={startQuiz}>
            <Play size={14} /> Quiz
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="bordered" className="p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{notes.length}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Toplam</p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-warning)]">
            {notes.filter(n => n.importance === 3).length}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">★★★ Kritik</p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-success)]">{memorizedCount}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Ezberlenmiş</p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-primary)]">{activeCount}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Öğrenilecek</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Başlık veya içerikte ara..."
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md pl-8 pr-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="Tümü">Tüm Konular</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterImportance}
            onChange={e => setFilterImportance(parseInt(e.target.value))}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value={0}>Tüm Önem</option>
            <option value={3}>★★★ Kritik</option>
            <option value={2}>★★ Orta</option>
            <option value={1}>★ Düşük</option>
          </select>
          <button
            onClick={() => setShowMemorized(!showMemorized)}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all border whitespace-nowrap',
              showMemorized
                ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/40 text-[var(--color-success)]'
                : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
            ].join(' ')}
          >
            {showMemorized ? 'Ezberlenenler' : 'Aktifler'}
          </button>
        </div>
      </Card>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <Zap size={32} className="text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--color-text-secondary)]">
            {showMemorized ? 'Henüz ezberlenmiş spot not yok.' : 'Kriterlere uygun spot not bulunamadı.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(note => (
            <Card key={note.id} variant="bordered" className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars count={note.importance} />
                  <Badge variant="secondary">{note.subject}</Badge>
                  {note.memorized && <Badge variant="success">Ezberlenmiş</Badge>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(note)}
                    className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  {!note.memorized ? (
                    <button
                      onClick={() => markMemorized(note.id)}
                      className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors"
                      title="Ezberledim"
                    >
                      <Check size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => unmarkMemorized(note.id)}
                      className="p-1.5 rounded text-[var(--color-success)] hover:text-[var(--color-warning)] transition-colors"
                      title="Geri al"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">{note.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">{note.fact}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
