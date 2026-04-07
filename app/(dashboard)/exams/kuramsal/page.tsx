'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  ClipboardList, Play, X, ChevronRight, ChevronLeft,
  Flag, CheckCircle, XCircle, Clock, BarChart2, RotateCcw,
  BookOpen, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

const BANK_KEY = 'medasi_soru_bankasi_v1'
const WRONG_KEY = 'medasi_hatali_sorular_v1'
const SESSIONS_KEY = 'medasi_exam_sessions_v1'

type Difficulty = 'Kolay' | 'Orta' | 'Zor'

interface BankQuestion {
  id: string
  text: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  subject: string
  difficulty: Difficulty
  explanation: string
  createdAt: string
}

interface ExamQuestion extends BankQuestion {
  userAnswer: number | null
  flagged: boolean
}

interface ExamSession {
  id: string
  date: string
  config: ExamConfig
  questions: ExamQuestion[]
  timeTaken: number
  score: number
  total: number
}

interface ExamConfig {
  subjectFilter: string
  questionCount: number
  timeLimit: number // minutes, 0 = unlimited
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function KuramsalSinavPage() {
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([])
  const [mode, setMode] = useState<'config' | 'exam' | 'results'>('config')

  // Config state
  const [config, setConfig] = useState<ExamConfig>({
    subjectFilter: 'Tümü',
    questionCount: 25,
    timeLimit: 30
  })

  // Exam state
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [examStartTime, setExamStartTime] = useState(0)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Results state
  const [timeTaken, setTimeTaken] = useState(0)
  const [sessions, setSessions] = useState<ExamSession[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(BANK_KEY)
    if (raw) setBankQuestions(JSON.parse(raw))
    const sessRaw = localStorage.getItem(SESSIONS_KEY)
    if (sessRaw) setSessions(JSON.parse(sessRaw))
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const subjects = Array.from(new Set(bankQuestions.map(q => q.subject)))

  const availableForConfig = bankQuestions.filter(q =>
    config.subjectFilter === 'Tümü' || q.subject === config.subjectFilter
  )

  function startExam() {
    const pool = bankQuestions.filter(q =>
      config.subjectFilter === 'Tümü' || q.subject === config.subjectFilter
    )
    if (pool.length === 0) {
      toast.error('Soru bankasında uygun soru bulunamadı.')
      return
    }
    const count = Math.min(config.questionCount, pool.length)
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count)
    const questions: ExamQuestion[] = shuffled.map(q => ({ ...q, userAnswer: null, flagged: false }))
    setExamQuestions(questions)
    setCurrentIndex(0)
    setShowConfirmEnd(false)

    const startTime = Date.now()
    setExamStartTime(startTime)

    if (config.timeLimit > 0) {
      const totalSeconds = config.timeLimit * 60
      setTimeRemaining(totalSeconds)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            finishExamWithQuestions(questions, startTime)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    setMode('exam')
  }

  const finishExamWithQuestions = useCallback((qs: ExamQuestion[], startTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const taken = Math.floor((Date.now() - startTime) / 1000)
    setTimeTaken(taken)
    const score = qs.filter(q => q.userAnswer === q.correct).length
    const session: ExamSession = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      config,
      questions: qs,
      timeTaken: taken,
      score,
      total: qs.length
    }
    setSessions(prev => {
      const updated = [session, ...prev].slice(0, 20)
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
      return updated
    })
    setMode('results')
  }, [config])

  function finishExam() {
    finishExamWithQuestions(examQuestions, examStartTime)
  }

  function selectAnswer(idx: number) {
    setExamQuestions(prev =>
      prev.map((q, i) => i === currentIndex ? { ...q, userAnswer: idx } : q)
    )
  }

  function toggleFlag() {
    setExamQuestions(prev =>
      prev.map((q, i) => i === currentIndex ? { ...q, flagged: !q.flagged } : q)
    )
  }

  function saveWrongAnswers(qs: ExamQuestion[]) {
    const wrongRaw = localStorage.getItem(WRONG_KEY)
    const wrongs = wrongRaw ? JSON.parse(wrongRaw) : []
    const wrongQs = qs.filter(q => q.userAnswer !== null && q.userAnswer !== q.correct)
    let added = 0
    wrongQs.forEach(q => {
      const already = wrongs.find((w: { questionSnapshot: BankQuestion; learned: boolean }) =>
        w.questionSnapshot.id === q.id && !w.learned
      )
      if (!already) {
        wrongs.push({
          id: `wrong_exam_${Date.now()}_${q.id}`,
          questionSnapshot: q,
          userAnswer: q.userAnswer,
          addedAt: new Date().toISOString(),
          learned: false
        })
        added++
      }
    })
    localStorage.setItem(WRONG_KEY, JSON.stringify(wrongs))
    toast.success(`${added} hatalı soru kaydedildi!`)
  }

  const current = examQuestions[currentIndex]
  const totalSeconds = config.timeLimit * 60
  const timePct = totalSeconds > 0 ? (timeRemaining / totalSeconds) * 100 : 100
  const timerDanger = config.timeLimit > 0 && timePct < 20

  // CONFIG MODE
  if (mode === 'config') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Kuramsal Sınav</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Çoktan seçmeli sınav simülatörü</p>
          </div>
        </div>

        {bankQuestions.length === 0 ? (
          <Card variant="bordered" className="p-8 text-center">
            <BookOpen size={36} className="text-[var(--color-text-secondary)] mx-auto mb-4 opacity-40" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Soru Bankası Boş</h2>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Sınav başlatmak için önce Soru Bankası sayfasından sorular ekleyin.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card variant="elevated" className="p-6">
              <CardTitle className="mb-5">Sınav Ayarları</CardTitle>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Konu Filtresi</label>
                  <select
                    value={config.subjectFilter}
                    onChange={e => setConfig(c => ({ ...c, subjectFilter: e.target.value }))}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  >
                    <option value="Tümü">Tüm Konular</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {availableForConfig.length} soru mevcut
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Soru Sayısı</label>
                  <div className="flex gap-2">
                    {[10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        onClick={() => setConfig(c => ({ ...c, questionCount: n }))}
                        disabled={availableForConfig.length < n}
                        className={[
                          'flex-1 py-2 rounded-lg text-sm font-medium transition-all border',
                          config.questionCount === n
                            ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed'
                        ].join(' ')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Seçilen: {Math.min(config.questionCount, availableForConfig.length)} soru
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Süre Limiti</label>
                  <div className="flex gap-2">
                    {[0, 15, 30, 45, 60].map(m => (
                      <button
                        key={m}
                        onClick={() => setConfig(c => ({ ...c, timeLimit: m }))}
                        className={[
                          'flex-1 py-2 rounded-lg text-xs font-medium transition-all border',
                          config.timeLimit === m
                            ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                        ].join(' ')}
                      >
                        {m === 0 ? 'Süresiz' : `${m}dk`}
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" onClick={startExam} className="w-full" size="lg">
                  <Play size={18} /> Sınavı Başlat
                </Button>
              </div>
            </Card>

            {/* Recent sessions */}
            <Card variant="bordered" className="p-6">
              <CardTitle className="mb-4">Son Sınavlar</CardTitle>
              {sessions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">Henüz sınav yapılmadı.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map(s => {
                    const pct = Math.round((s.score / s.total) * 100)
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-elevated)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {s.config.subjectFilter === 'Tümü' ? 'Karışık' : s.config.subjectFilter}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {new Date(s.date).toLocaleDateString('tr-TR')} · {s.total} soru · {formatTime(s.timeTaken)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={[
                            'text-lg font-bold',
                            pct >= 70 ? 'text-[var(--color-success)]' : pct >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-destructive)]'
                          ].join(' ')}>
                            %{pct}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{s.score}/{s.total}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    )
  }

  // EXAM MODE
  if (mode === 'exam' && current) {
    const answered = examQuestions.filter(q => q.userAnswer !== null).length
    const flagged = examQuestions.filter(q => q.flagged).length

    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {/* Exam header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Soru {currentIndex + 1} / {examQuestions.length}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {answered} cevaplanmış
              </span>
              {flagged > 0 && (
                <span className="text-xs text-[var(--color-warning)]">
                  {flagged} işaretlenmiş
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-[var(--color-surface-elevated)] rounded-full">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {config.timeLimit > 0 && (
            <div className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold border',
              timerDanger
                ? 'bg-[var(--color-destructive)]/10 border-[var(--color-destructive)]/30 text-[var(--color-destructive)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]'
            ].join(' ')}>
              <Clock size={14} />
              {formatTime(timeRemaining)}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirmEnd(true)}
            className="text-[var(--color-destructive)]"
          >
            Sınavı Bitir
          </Button>
        </div>

        {/* Confirm end dialog */}
        {showConfirmEnd && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card variant="elevated" className="p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} className="text-[var(--color-warning)]" />
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Sınavı Bitir</h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {examQuestions.length - answered} soru cevaplanmamış.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                Sınavı bitirmek istediğinizden emin misiniz?
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowConfirmEnd(false)} className="flex-1">
                  Devam Et
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setShowConfirmEnd(false); finishExam() }}
                  className="flex-1"
                >
                  Bitir
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Question */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="secondary">{current.subject}</Badge>
            <Badge variant={current.difficulty === 'Kolay' ? 'success' : current.difficulty === 'Orta' ? 'warning' : 'destructive'}>
              {current.difficulty}
            </Badge>
            {current.flagged && (
              <Badge variant="warning">İşaretlendi</Badge>
            )}
          </div>

          <p className="text-[var(--color-text-primary)] text-base font-medium leading-relaxed mb-6">
            {current.text}
          </p>

          <div className="space-y-3">
            {current.options.map((opt, idx) => {
              const isSelected = current.userAnswer === idx
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(idx)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all',
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5'
                  ].join(' ')}
                >
                  <span className="font-bold mr-2">{OPTION_LABELS[idx]}.</span> {opt}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={15} /> Önceki
          </Button>

          <button
            onClick={toggleFlag}
            className={[
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all border',
              current.flagged
                ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/40 text-[var(--color-warning)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]'
            ].join(' ')}
          >
            <Flag size={13} className="inline mr-1" />
            {current.flagged ? 'İşaret Kaldır' : 'İşaretle'}
          </button>

          <div className="flex-1" />

          {currentIndex < examQuestions.length - 1 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentIndex(i => i + 1)}
            >
              Sonraki <ChevronRight size={15} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowConfirmEnd(true)}
            >
              Sınavı Bitir
            </Button>
          )}
        </div>

        {/* Question map */}
        <Card variant="bordered" className="p-4">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Soru Haritası</p>
          <div className="flex flex-wrap gap-1.5">
            {examQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={[
                  'w-8 h-8 rounded text-xs font-bold transition-all',
                  currentIndex === idx
                    ? 'bg-[var(--color-primary)] text-black'
                    : q.flagged
                      ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/40'
                      : q.userAnswer !== null
                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] opacity-60'
                ].join(' ')}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // RESULTS MODE
  if (mode === 'results') {
    const score = examQuestions.filter(q => q.userAnswer === q.correct).length
    const wrong = examQuestions.filter(q => q.userAnswer !== null && q.userAnswer !== q.correct).length
    const skipped = examQuestions.filter(q => q.userAnswer === null).length
    const pct = Math.round((score / examQuestions.length) * 100)

    // Per-subject breakdown
    const subjectMap: Record<string, { correct: number; total: number }> = {}
    examQuestions.forEach(q => {
      if (!subjectMap[q.subject]) subjectMap[q.subject] = { correct: 0, total: 0 }
      subjectMap[q.subject].total++
      if (q.userAnswer === q.correct) subjectMap[q.subject].correct++
    })

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <BarChart2 size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Sınav Sonuçları</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {new Date().toLocaleDateString('tr-TR')} · {formatTime(timeTaken)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => saveWrongAnswers(examQuestions)}>
              Hatalıları Kaydet
            </Button>
            <Button variant="primary" size="sm" onClick={() => setMode('config')}>
              <RotateCcw size={14} /> Tekrar Çöz
            </Button>
          </div>
        </div>

        {/* Score */}
        <Card variant="elevated" className="p-6 text-center">
          <p className={[
            'text-6xl font-bold mb-2',
            pct >= 70 ? 'text-[var(--color-success)]' : pct >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-destructive)]'
          ].join(' ')}>
            %{pct}
          </p>
          <p className="text-[var(--color-text-secondary)]">{score} / {examQuestions.length} doğru</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <span className="text-[var(--color-success)] font-medium">{score} Doğru</span>
            <span className="text-[var(--color-destructive)] font-medium">{wrong} Yanlış</span>
            <span className="text-[var(--color-text-secondary)]">{skipped} Boş</span>
            <span className="text-[var(--color-primary)] flex items-center gap-1">
              <Clock size={13} /> {formatTime(timeTaken)}
            </span>
          </div>
        </Card>

        {/* Subject breakdown */}
        {Object.keys(subjectMap).length > 1 && (
          <Card variant="bordered" className="p-5">
            <CardTitle className="mb-4">Konu Bazlı Sonuçlar</CardTitle>
            <div className="space-y-3">
              {Object.entries(subjectMap).map(([subj, data]) => {
                const subjPct = Math.round((data.correct / data.total) * 100)
                return (
                  <div key={subj}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[var(--color-text-primary)] font-medium">{subj}</span>
                      <span className={[
                        'font-bold',
                        subjPct >= 70 ? 'text-[var(--color-success)]' : subjPct >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-destructive)]'
                      ].join(' ')}>
                        {data.correct}/{data.total} (%{subjPct})
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-surface-elevated)] rounded-full">
                      <div
                        className={[
                          'h-full rounded-full transition-all',
                          subjPct >= 70 ? 'bg-[var(--color-success)]' : subjPct >= 50 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-destructive)]'
                        ].join(' ')}
                        style={{ width: `${subjPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Question review */}
        <Card variant="bordered" className="p-5">
          <CardTitle className="mb-4">Soru İnceleme</CardTitle>
          <div className="space-y-3">
            {examQuestions.map((q, idx) => {
              const isCorrect = q.userAnswer === q.correct
              const isSkipped = q.userAnswer === null
              return (
                <div key={q.id} className={[
                  'p-4 rounded-lg border',
                  isCorrect ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/3'
                    : isSkipped ? 'border-[var(--color-border)] opacity-70'
                      : 'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/3'
                ].join(' ')}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {isCorrect ? (
                        <CheckCircle size={16} className="text-[var(--color-success)]" />
                      ) : isSkipped ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--color-text-secondary)]" />
                      ) : (
                        <XCircle size={16} className="text-[var(--color-destructive)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                        {idx + 1}. · {q.subject}
                      </p>
                      <p className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed mb-2">{q.text}</p>
                      <div className="text-xs space-y-0.5">
                        <p className="text-[var(--color-success)]">
                          ✓ Doğru: {OPTION_LABELS[q.correct]}. {q.options[q.correct]}
                        </p>
                        {!isCorrect && !isSkipped && q.userAnswer !== null && (
                          <p className="text-[var(--color-destructive)]">
                            ✗ Seçtiğin: {OPTION_LABELS[q.userAnswer]}. {q.options[q.userAnswer]}
                          </p>
                        )}
                        {isSkipped && (
                          <p className="text-[var(--color-text-secondary)]">— Boş bırakıldı</p>
                        )}
                        {q.explanation && (
                          <p className="text-[var(--color-text-secondary)] mt-1 italic">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  return null
}
