'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Gamepad2, Heart, Thermometer, Activity, Zap,
  Trophy, RotateCcw, ChevronRight, Star, Target,
  User, Stethoscope, FlaskConical, Brain
} from 'lucide-react'
import toast from 'react-hot-toast'

type Specialty = { id: string; label: string; icon: string; color: string }
type Difficulty = 'easy' | 'medium' | 'hard'
type CaseStep = { question: string; options: string[]; correct: number; feedback: string }
type CaseData = {
  patientName: string
  age: number
  gender: 'male' | 'female'
  complaint: string
  vitals: { temp: string; pulse: string; bp: string; spo2: string }
  narrative: string
  steps: CaseStep[]
}

const specialties: Specialty[] = [
  { id: 'cardiology', label: 'Kardiyoloji', icon: '❤️', color: 'var(--color-destructive)' },
  { id: 'neurology', label: 'Nöroloji', icon: '🧠', color: 'var(--color-primary)' },
  { id: 'internal', label: 'Dahiliye', icon: '🏥', color: 'var(--color-success)' },
  { id: 'emergency', label: 'Acil Tıp', icon: '🚨', color: 'var(--color-warning)' },
  { id: 'pediatrics', label: 'Pediatri', icon: '👶', color: '#A78BFA' },
  { id: 'surgery', label: 'Cerrahi', icon: '🔬', color: '#FB923C' },
]

const difficultyConfig = {
  easy: { label: 'Kolay', variant: 'success' as const, xpBonus: 1 },
  medium: { label: 'Orta', variant: 'warning' as const, xpBonus: 2 },
  hard: { label: 'Zor', variant: 'destructive' as const, xpBonus: 3 },
}

export default function CaseRPGPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [xp, setXP] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [completedCases, setCompletedCases] = useState(0)
  const [caseFinished, setCaseFinished] = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  const specialtyLabel = specialties.find(s => s.id === selectedSpecialty)?.label ?? ''

  async function startCase() {
    if (!selectedSpecialty) {
      toast.error('Lütfen bir uzmanlık alanı seçin')
      return
    }
    setLoading(true)
    try {
      const diffLabel = difficultyConfig[difficulty].label
      const message = `${specialtyLabel} alanında ${diffLabel} zorlukta interaktif bir tıbbi vaka oluştur.

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "patientName": "Türkçe isim",
  "age": 45,
  "gender": "male",
  "complaint": "Baş şikayeti 1 cümle",
  "vitals": { "temp": "37.2", "pulse": "88", "bp": "130/85", "spo2": "96" },
  "narrative": "Anamnez ve klinik tablo 3-4 cümle",
  "steps": [
    {
      "question": "Klinik karar sorusu",
      "options": ["A) Seçenek", "B) Seçenek", "C) Seçenek", "D) Seçenek"],
      "correct": 0,
      "feedback": "Doğru cevabın açıklaması 2 cümle"
    },
    {
      "question": "Soru 2",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 1,
      "feedback": "Açıklama"
    },
    {
      "question": "Soru 3",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 2,
      "feedback": "Açıklama"
    }
  ]
}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model: 'FAST' }),
      })

      if (!res.ok) {
        if (res.status === 429) throw new Error('Günlük AI limitinize ulaştınız')
        throw new Error('Vaka oluşturulamadı')
      }

      const data = await res.json()
      const text = data.response?.[0]?.text || data.response?.find?.((b: { type: string }) => b.type === 'text')?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Vaka verisi işlenemedi')

      const parsed: CaseData = JSON.parse(jsonMatch[0])
      setCaseData(parsed)
      setCurrentStep(0)
      setSelectedOption(null)
      setShowFeedback(false)
      setXP(0)
      setCaseFinished(false)
      setCorrectAnswers(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vaka oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function selectOption(idx: number) {
    if (showFeedback) return
    setSelectedOption(idx)
    setShowFeedback(true)

    if (!caseData) return
    const step = caseData.steps[currentStep]
    const isCorrect = idx === step.correct
    const earned = isCorrect ? 50 * difficultyConfig[difficulty].xpBonus : 10
    setXP(prev => prev + earned)
    if (isCorrect) setCorrectAnswers(prev => prev + 1)
  }

  function nextStep() {
    if (!caseData) return
    if (currentStep < caseData.steps.length - 1) {
      setCurrentStep(prev => prev + 1)
      setSelectedOption(null)
      setShowFeedback(false)
    } else {
      setCaseFinished(true)
      setTotalXP(prev => prev + xp)
      setCompletedCases(prev => prev + 1)
    }
  }

  function exitCase() {
    setCaseData(null)
    setCaseFinished(false)
    setSelectedOption(null)
    setShowFeedback(false)
    setCurrentStep(0)
  }

  if (caseFinished && caseData) {
    const accuracy = Math.round((correctAnswers / caseData.steps.length) * 100)
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 py-12">
        <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)] flex items-center justify-center">
          <Trophy size={40} className="text-[var(--color-primary)]" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Vaka Tamamlandı!</h2>
          <p className="text-[var(--color-text-secondary)] mt-2">{caseData.patientName} vakasını başarıyla tamamladın</p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full">
          {[
            { label: 'Kazanılan XP', value: `+${xp}`, color: 'text-[var(--color-primary)]' },
            { label: 'Doğruluk', value: `%${accuracy}`, color: accuracy >= 70 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]' },
            { label: 'Toplam XP', value: totalXP + xp, color: 'text-[var(--color-warning)]' },
          ].map(s => (
            <Card key={s.label} variant="bordered" className="text-center p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{s.label}</p>
            </Card>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="primary" onClick={startCase} loading={loading} className="flex-1">
            <RotateCcw size={16} />
            Yeni Vaka
          </Button>
          <Button variant="ghost" onClick={exitCase} className="flex-1">
            Lobiye Dön
          </Button>
        </div>
      </div>
    )
  }

  if (caseData) {
    const step = caseData.steps[currentStep]
    const progress = ((currentStep + (showFeedback ? 1 : 0)) / caseData.steps.length) * 100
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{specialtyLabel}</Badge>
            <Badge variant={difficultyConfig[difficulty].variant}>{difficultyConfig[difficulty].label}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Zap size={14} className="text-[var(--color-warning)]" />
              <span className="text-sm font-bold text-[var(--color-warning)]">{xp} XP</span>
            </div>
            <Button variant="ghost" size="sm" onClick={exitCase}>Çıkış</Button>
          </div>
        </div>

        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] text-right -mt-2">
          Adım {currentStep + 1} / {caseData.steps.length}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card variant="elevated" className="lg:col-span-1">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-secondary)]/20 border border-[var(--color-border)] flex items-center justify-center">
                <User size={28} className="text-[var(--color-text-secondary)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--color-text-primary)]">{caseData.patientName}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {caseData.age} yaş · {caseData.gender === 'male' ? 'Erkek' : 'Kadın'}
                </p>
              </div>
              <div className="w-full border-t border-[var(--color-border)] pt-3">
                <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wide mb-2">Vitaller</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Thermometer, label: 'Ateş', value: `${caseData.vitals.temp}°C` },
                    { icon: Heart, label: 'Nabız', value: `${caseData.vitals.pulse} bpm` },
                    { icon: Activity, label: 'TA', value: caseData.vitals.bp },
                    { icon: Zap, label: 'SpO2', value: `${caseData.vitals.spo2}%` },
                  ].map(v => (
                    <div key={v.label} className="flex flex-col items-center p-2 bg-[var(--color-surface)] rounded-md">
                      <v.icon size={14} className="text-[var(--color-primary)] mb-0.5" />
                      <p className="text-xs font-bold text-[var(--color-text-primary)]">{v.value}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{v.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card variant="bordered">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={16} className="text-[var(--color-primary)]" />
                <CardTitle className="text-base">Hasta Anamnezi</CardTitle>
              </div>
              <CardContent className="text-sm leading-relaxed">{caseData.narrative}</CardContent>
            </Card>

            <Card variant="bordered">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} className="text-[var(--color-primary)]" />
                <p className="font-semibold text-[var(--color-text-primary)]">{step.question}</p>
              </div>
              <div className="flex flex-col gap-2">
                {step.options.map((opt, idx) => {
                  let optStyle = 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]'
                  if (showFeedback) {
                    if (idx === step.correct) optStyle = 'border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    else if (idx === selectedOption) optStyle = 'border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                    else optStyle = 'border-[var(--color-border)] text-[var(--color-text-secondary)] opacity-50'
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => selectOption(idx)}
                      disabled={showFeedback}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${optStyle}`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              {showFeedback && (
                <div className={`mt-4 p-4 rounded-lg text-sm ${
                  selectedOption === step.correct
                    ? 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
                    : 'bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 text-[var(--color-destructive)]'
                }`}>
                  <p className="font-bold mb-1">
                    {selectedOption === step.correct ? '✓ Doğru!' : '✗ Yanlış'}
                    <span className="ml-2 text-[var(--color-warning)]">
                      +{selectedOption === step.correct ? 50 * difficultyConfig[difficulty].xpBonus : 10} XP
                    </span>
                  </p>
                  <p className="opacity-90">{step.feedback}</p>
                </div>
              )}

              {showFeedback && (
                <Button variant="primary" onClick={nextStep} className="w-full mt-4">
                  {currentStep < caseData.steps.length - 1 ? (
                    <><ChevronRight size={16} /> Sonraki Adım</>
                  ) : (
                    <><Trophy size={16} /> Vakayı Tamamla</>
                  )}
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Gamepad2 size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Vaka RPG</h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Simüle vakalarla klinik düşünme becerini geliştir
          </p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { icon: Trophy, value: completedCases, label: 'Vaka' },
            { icon: Star, value: totalXP, label: 'XP' },
            { icon: Target, value: `%${completedCases > 0 ? Math.round((correctAnswers / (completedCases * 3)) * 100) : 0}`, label: 'Doğruluk' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <s.icon size={14} className="text-[var(--color-primary)]" />
              <span className="text-sm font-bold text-[var(--color-text-primary)]">{s.value}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Uzmanlık Alanı Seç</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {specialties.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSpecialty(s.id)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                selectedSpecialty === s.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50',
              ].join(' ')}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-xs font-medium ${selectedSpecialty === s.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Zorluk Seviyesi</p>
        <div className="flex gap-3">
          {(Object.keys(difficultyConfig) as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={[
                'flex-1 py-3 rounded-xl border text-sm font-semibold transition-all',
                difficulty === d
                  ? d === 'easy'
                    ? 'border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    : d === 'medium'
                    ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)]',
              ].join(' ')}
            >
              {difficultyConfig[d].label}
              <span className="ml-2 text-xs opacity-70">×{difficultyConfig[d].xpBonus} XP</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={startCase}
          className="px-12"
        >
          <Gamepad2 size={18} />
          {loading ? 'Vaka Oluşturuluyor...' : 'Vakayı Başlat'}
        </Button>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {selectedSpecialty ? `${specialtyLabel} · ${difficultyConfig[difficulty].label} · FAST Model` : 'Başlamak için uzmanlık alanı seçin'}
        </p>
      </div>

      {completedCases > 0 && (
        <Card variant="bordered">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-[var(--color-warning)]" />
            <CardTitle className="text-base">Başarım Rozeti</CardTitle>
          </div>
          <div className="flex gap-3">
            {completedCases >= 1 && <Badge variant="success">İlk Vaka ✓</Badge>}
            {completedCases >= 5 && <Badge variant="warning">5 Vaka ✓</Badge>}
            {totalXP >= 500 && <Badge variant="secondary">500 XP ✓</Badge>}
          </div>
        </Card>
      )}
    </div>
  )
}
