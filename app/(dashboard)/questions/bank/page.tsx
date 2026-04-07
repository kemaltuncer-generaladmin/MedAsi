'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  BookOpen, Plus, Play, X, ChevronRight, CheckCircle, XCircle,
  Filter, BarChart2, Trash2, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_soru_bankasi_v1'
const WRONG_KEY = 'medasi_hatali_sorular_v1'

type Difficulty = 'Kolay' | 'Orta' | 'Zor'
type Subject =
  | 'Anatomi' | 'Fizyoloji' | 'Farmakoloji' | 'Patoloji'
  | 'Dahiliye' | 'Cerrahi' | 'Pediatri' | 'Kardiyoloji'
  | 'Nöroloji' | 'Psikiyatri' | 'Diğer'

interface Question {
  id: string
  text: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  subject: Subject
  difficulty: Difficulty
  explanation: string
  createdAt: string
}

interface WrongAnswer {
  id: string
  questionSnapshot: Question
  userAnswer: number
  addedAt: string
  learned: boolean
}

const SUBJECTS: Subject[] = [
  'Anatomi', 'Fizyoloji', 'Farmakoloji', 'Patoloji',
  'Dahiliye', 'Cerrahi', 'Pediatri', 'Kardiyoloji',
  'Nöroloji', 'Psikiyatri', 'Diğer'
]

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'sample_1',
    text: 'Kalbin pacemaker\'ı olarak görev yapan yapı hangisidir?',
    options: [
      'AV nod',
      'SA nod',
      'His demeti',
      'Purkinje lifleri'
    ],
    correct: 1,
    subject: 'Kardiyoloji',
    difficulty: 'Kolay',
    explanation: 'Sinoatriyal (SA) nod, kalbin doğal pace-maker\'ıdır. Dakikada 60-100 impuls üreterek normal sinüs ritmini sağlar.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_2',
    text: 'Akut miyokard enfarktüsünde ilk yükselen kardiyak biyobelirteç hangisidir?',
    options: [
      'CK-MB',
      'Troponin I',
      'Miyoglobin',
      'LDH'
    ],
    correct: 2,
    subject: 'Dahiliye',
    difficulty: 'Orta',
    explanation: 'Miyoglobin, MI sonrası 1-3 saatte yükselir ve ilk yükselen belirteçtir. Ancak özgüllüğü düşük olduğu için troponin ile birlikte değerlendirilmelidir.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_3',
    text: 'Beta-laktamazlara dirençli penisilin hangisidir?',
    options: [
      'Ampisilin',
      'Amoksisilin',
      'Metisilin',
      'Piperasilin'
    ],
    correct: 2,
    subject: 'Farmakoloji',
    difficulty: 'Kolay',
    explanation: 'Metisilin, beta-laktamaz enzimlerine karşı dirençlidir. Günümüzde klinikte kullanılmasa da MRSA adı bu antibiyotikten gelmektedir.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_4',
    text: 'Karaciğer sinüzoidlerini döşeyen hücre tipi hangisidir?',
    options: [
      'Hepatosit',
      'Kupffer hücresi',
      'Ito hücresi',
      'Sinüzoidal endotel hücresi'
    ],
    correct: 3,
    subject: 'Anatomi',
    difficulty: 'Orta',
    explanation: 'Karaciğer sinüzoidleri, özel fenestrasyonlu sinüzoidal endotel hücreleriyle döşelidir. Kupffer hücreleri ise sinüzoidlerin içinde bulunan makrofajlardır.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample_5',
    text: 'Çocuklarda en sık görülen akut lösemi tipi hangisidir?',
    options: [
      'AML (Akut Miyeloid Lösemi)',
      'CML (Kronik Miyeloid Lösemi)',
      'ALL (Akut Lenfoblastik Lösemi)',
      'CLL (Kronik Lenfositik Lösemi)'
    ],
    correct: 2,
    subject: 'Pediatri',
    difficulty: 'Kolay',
    explanation: 'ALL, çocuklarda en sık görülen lösemi tipidir ve tüm çocukluk çağı lösemilerinin yaklaşık %75-80\'ini oluşturur. 2-5 yaş en sık görüldüğü dönemdir.',
    createdAt: new Date().toISOString()
  }
]

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function difficultyBadgeVariant(d: Difficulty): 'success' | 'warning' | 'destructive' {
  if (d === 'Kolay') return 'success'
  if (d === 'Orta') return 'warning'
  return 'destructive'
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [mode, setMode] = useState<'list' | 'practice' | 'add'>('list')
  const [filterSubject, setFilterSubject] = useState<Subject | 'Tümü'>('Tümü')
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'Tümü'>('Tümü')

  // Practice state
  const [practiceQueue, setPracticeQueue] = useState<Question[]>([])
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, skipped: 0 })

  // Add question form
  const [form, setForm] = useState({
    text: '',
    optionA: '', optionB: '', optionC: '', optionD: '',
    correct: '0',
    subject: 'Anatomi' as Subject,
    difficulty: 'Orta' as Difficulty,
    explanation: ''
  })

  const [showExplanationInList, setShowExplanationInList] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      setQuestions(JSON.parse(raw))
    } else {
      setQuestions(SAMPLE_QUESTIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_QUESTIONS))
    }
  }, [])

  const saveQuestions = useCallback((qs: Question[]) => {
    setQuestions(qs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(qs))
  }, [])

  const filteredQuestions = questions.filter(q => {
    if (filterSubject !== 'Tümü' && q.subject !== filterSubject) return false
    if (filterDifficulty !== 'Tümü' && q.difficulty !== filterDifficulty) return false
    return true
  })

  function startPractice() {
    if (filteredQuestions.length === 0) {
      toast.error('Seçili kriterlere uygun soru bulunamadı.')
      return
    }
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5)
    setPracticeQueue(shuffled)
    setPracticeIndex(0)
    setSelectedOption(null)
    setShowExplanation(false)
    setSessionStats({ correct: 0, wrong: 0, skipped: 0 })
    setMode('practice')
  }

  function handleSelectOption(idx: number) {
    if (selectedOption !== null) return
    setSelectedOption(idx)
    setShowExplanation(true)
    const q = practiceQueue[practiceIndex]
    if (idx === q.correct) {
      setSessionStats(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
      // Save to wrong answers
      const wrongRaw = localStorage.getItem(WRONG_KEY)
      const wrongs: WrongAnswer[] = wrongRaw ? JSON.parse(wrongRaw) : []
      const already = wrongs.find(w => w.questionSnapshot.id === q.id && !w.learned)
      if (!already) {
        wrongs.push({
          id: `wrong_${Date.now()}`,
          questionSnapshot: q,
          userAnswer: idx,
          addedAt: new Date().toISOString(),
          learned: false
        })
        localStorage.setItem(WRONG_KEY, JSON.stringify(wrongs))
      }
    }
  }

  function nextQuestion() {
    if (practiceIndex >= practiceQueue.length - 1) {
      setMode('list')
      toast.success(`Pratik tamamlandı! Doğru: ${sessionStats.correct + (selectedOption === practiceQueue[practiceIndex].correct ? 1 : 0)}, Yanlış: ${sessionStats.wrong}`)
      return
    }
    setPracticeIndex(i => i + 1)
    setSelectedOption(null)
    setShowExplanation(false)
  }

  function skipQuestion() {
    setSessionStats(s => ({ ...s, skipped: s.skipped + 1 }))
    nextQuestion()
  }

  function addQuestion() {
    if (!form.text.trim() || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
      toast.error('Lütfen tüm alanları doldurun.')
      return
    }
    const newQ: Question = {
      id: `q_${Date.now()}`,
      text: form.text.trim(),
      options: [form.optionA, form.optionB, form.optionC, form.optionD],
      correct: parseInt(form.correct) as 0 | 1 | 2 | 3,
      subject: form.subject,
      difficulty: form.difficulty,
      explanation: form.explanation.trim(),
      createdAt: new Date().toISOString()
    }
    saveQuestions([...questions, newQ])
    setForm({ text: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: '0', subject: 'Anatomi', difficulty: 'Orta', explanation: '' })
    setMode('list')
    toast.success('Soru eklendi!')
  }

  function deleteQuestion(id: string) {
    saveQuestions(questions.filter(q => q.id !== id))
    toast.success('Soru silindi.')
  }

  const currentQ = practiceQueue[practiceIndex]

  // PRACTICE MODE
  if (mode === 'practice' && currentQ) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Play size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Pratik Modu</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soru {practiceIndex + 1} / {practiceQueue.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X size={15} /> Çıkış
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-[var(--color-success)]">{sessionStats.correct}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Doğru</p>
          </div>
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-[var(--color-destructive)]">{sessionStats.wrong}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Yanlış</p>
          </div>
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-[var(--color-text-secondary)]">{sessionStats.skipped}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Atlandı</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[var(--color-surface-elevated)] rounded-full">
          <div
            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
            style={{ width: `${((practiceIndex + 1) / practiceQueue.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{currentQ.subject}</Badge>
            <Badge variant={difficultyBadgeVariant(currentQ.difficulty)}>{currentQ.difficulty}</Badge>
          </div>
          <p className="text-[var(--color-text-primary)] text-lg font-medium leading-relaxed mb-6">
            {currentQ.text}
          </p>

          <div className="space-y-3">
            {currentQ.options.map((opt, idx) => {
              let cls = 'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all '
              if (selectedOption === null) {
                cls += 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 cursor-pointer'
              } else if (idx === currentQ.correct) {
                cls += 'border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]'
              } else if (idx === selectedOption) {
                cls += 'border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
              } else {
                cls += 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] opacity-50'
              }
              return (
                <button key={idx} className={cls} onClick={() => handleSelectOption(idx)}>
                  <span className="font-bold mr-2">{OPTION_LABELS[idx]}.</span> {opt}
                  {selectedOption !== null && idx === currentQ.correct && (
                    <CheckCircle size={16} className="inline ml-2" />
                  )}
                  {selectedOption === idx && idx !== currentQ.correct && (
                    <XCircle size={16} className="inline ml-2" />
                  )}
                </button>
              )
            })}
          </div>

          {showExplanation && currentQ.explanation && (
            <div className="mt-5 p-4 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
              <p className="text-xs font-semibold text-[var(--color-primary)] mb-1 uppercase tracking-wide">Açıklama</p>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          {selectedOption === null && (
            <Button variant="ghost" size="sm" onClick={skipQuestion} className="flex-1">
              Atla
            </Button>
          )}
          {selectedOption !== null && (
            <Button variant="primary" onClick={nextQuestion} className="flex-1">
              {practiceIndex >= practiceQueue.length - 1 ? 'Bitir' : 'Sonraki Soru'}
              <ChevronRight size={15} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ADD QUESTION MODE
  if (mode === 'add') {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Plus size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Soru Ekle</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">Soru bankasına yeni soru ekle</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X size={15} /> İptal
          </Button>
        </div>

        <Card variant="elevated" className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Soru Metni</label>
              <textarea
                value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                rows={3}
                placeholder="Soruyu buraya yazın..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
              />
            </div>

            {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => {
              const key = `option${letter}` as keyof typeof form
              return (
                <div key={letter}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Seçenek {letter}
                    {form.correct === String(idx) && (
                      <span className="ml-2 text-xs text-[var(--color-success)]">(Doğru Cevap)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={String(form[key])}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={`${letter} şıkkı`}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
              )
            })}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Doğru Cevap</label>
                <select
                  value={form.correct}
                  onChange={e => setForm(f => ({ ...f, correct: e.target.value }))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  {['A', 'B', 'C', 'D'].map((l, i) => <option key={l} value={i}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Konu</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value as Subject }))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Zorluk</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  {(['Kolay', 'Orta', 'Zor'] as Difficulty[]).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Açıklama (Opsiyonel)</label>
              <textarea
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                rows={2}
                placeholder="Doğru cevabın açıklaması..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
              />
            </div>

            <Button variant="primary" onClick={addQuestion} className="w-full">
              <Plus size={15} /> Soruyu Ekle
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // LIST MODE
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <BookOpen size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Soru Bankası</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">{questions.length} soru mevcut</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMode('add')}>
            <Plus size={14} /> Soru Ekle
          </Button>
          <Button variant="primary" size="sm" onClick={startPractice}>
            <Play size={14} /> Pratik Başlat
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Soru', value: questions.length, icon: <BookOpen size={16} /> },
          { label: 'Kolay', value: questions.filter(q => q.difficulty === 'Kolay').length, icon: <BarChart2 size={16} /> },
          { label: 'Orta', value: questions.filter(q => q.difficulty === 'Orta').length, icon: <BarChart2 size={16} /> },
          { label: 'Zor', value: questions.filter(q => q.difficulty === 'Zor').length, icon: <BarChart2 size={16} /> },
        ].map(stat => (
          <Card key={stat.label} variant="bordered" className="p-4 text-center">
            <div className="text-[var(--color-primary)] flex justify-center mb-1">{stat.icon}</div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={15} className="text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Filtrele:</span>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value as Subject | 'Tümü')}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="Tümü">Tüm Konular</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value as Difficulty | 'Tümü')}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="Tümü">Tüm Zorluklar</option>
            {(['Kolay', 'Orta', 'Zor'] as Difficulty[]).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-xs text-[var(--color-text-secondary)] ml-auto">
            {filteredQuestions.length} soru gösteriliyor
          </span>
        </div>
      </Card>

      {/* Question list */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 && (
          <Card variant="bordered" className="p-8 text-center">
            <BookOpen size={32} className="text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--color-text-secondary)]">Kriterlere uygun soru bulunamadı.</p>
          </Card>
        )}
        {filteredQuestions.map(q => (
          <Card key={q.id} variant="bordered" className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary">{q.subject}</Badge>
                  <Badge variant={difficultyBadgeVariant(q.difficulty)}>{q.difficulty}</Badge>
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] leading-relaxed mb-3">{q.text}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {q.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={[
                        'text-xs px-3 py-1.5 rounded border',
                        idx === q.correct
                          ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      ].join(' ')}
                    >
                      <span className="font-bold">{OPTION_LABELS[idx]}.</span> {opt}
                    </div>
                  ))}
                </div>
                {showExplanationInList === q.id && q.explanation && (
                  <div className="mt-3 p-3 rounded bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                    <p className="text-xs font-semibold text-[var(--color-primary)] mb-1">Açıklama</p>
                    <p className="text-xs text-[var(--color-text-primary)]">{q.explanation}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {q.explanation && (
                  <button
                    onClick={() => setShowExplanationInList(showExplanationInList === q.id ? null : q.id)}
                    className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                    title="Açıklamayı göster"
                  >
                    {showExplanationInList === q.id ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                  title="Sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
