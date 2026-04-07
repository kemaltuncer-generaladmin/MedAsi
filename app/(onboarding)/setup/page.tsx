'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Target, GraduationCap, Hospital, Activity, BookOpen, FlaskConical,
  Newspaper, MoreHorizontal, Stethoscope, Brain, ArrowRight, ArrowLeft,
  Loader2, User, Clock, Zap, BarChart2, CheckCircle, AlertCircle,
  Calendar, TrendingUp, Lightbulb, Star,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { Toggle } from '@/components/ui/Toggle'
import { ProgressStepper } from '@/components/onboarding/ProgressStepper'
import { useOnboardingStore } from '@/stores/onboarding'
import type { StudyLevel, LearningStyle, StudyTime, SubjectLevel } from '@/stores/onboarding'
import { onboardingSchema } from '@/lib/schemas/onboarding'
import { completeOnboarding } from '@/lib/actions/onboarding'

const STEP_LABELS = ['Hoş Geldin', 'Kimsin?', 'Hedefler', 'Profil', 'Branşlar', 'Bildirimler']
const TOTAL_STEPS = STEP_LABELS.length

// ── Step 2 data ────────────────────────────────────────────
const LEVELS: { value: StudyLevel; label: string; sub: string }[] = [
  { value: 'ogrenci_1', label: '1. Sınıf', sub: 'Tıp Fakültesi' },
  { value: 'ogrenci_2', label: '2. Sınıf', sub: 'Tıp Fakültesi' },
  { value: 'ogrenci_3', label: '3. Sınıf', sub: 'Tıp Fakültesi' },
  { value: 'ogrenci_4', label: '4. Sınıf', sub: 'Klinik Dönem' },
  { value: 'ogrenci_5', label: '5. Sınıf', sub: 'Klinik Dönem' },
  { value: 'ogrenci_6', label: '6. Sınıf', sub: 'Klinik Dönem' },
  { value: 'intern', label: 'İntörn', sub: 'Dönem 7' },
  { value: 'asistan', label: 'Asistan', sub: 'Uzmanlık' },
  { value: 'uzman', label: 'Uzman Hekim', sub: '' },
  { value: 'pratisyen', label: 'Pratisyen', sub: 'Hekim' },
  { value: 'diger', label: 'Diğer', sub: '' },
]

// ── Step 3 data ────────────────────────────────────────────
type GoalItem = { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }
const GOALS: GoalItem[] = [
  { key: 'tus', label: 'TUS Hazırlığı', Icon: Target },
  { key: 'uzmanlik', label: 'Uzmanlık Sınavı', Icon: GraduationCap },
  { key: 'staj', label: 'Staj/İntörnlük', Icon: Hospital },
  { key: 'klinik', label: 'Klinik Pratik', Icon: Activity },
  { key: 'akademik', label: 'Akademik Kariyer', Icon: BookOpen },
  { key: 'arastirma', label: 'Araştırma', Icon: FlaskConical },
  { key: 'guncel', label: 'Güncel Kalmak', Icon: Newspaper },
  { key: 'diger', label: 'Diğer', Icon: MoreHorizontal },
]

// ── Step 4 data ────────────────────────────────────────────
const STUDY_TIMES: { value: StudyTime; label: string; icon: string }[] = [
  { value: 'sabah', label: 'Sabah (06-12)', icon: '🌅' },
  { value: 'oglen', label: 'Öğlen (12-17)', icon: '☀️' },
  { value: 'aksam', label: 'Akşam (17-22)', icon: '🌆' },
  { value: 'gece', label: 'Gece (22+)', icon: '🌙' },
  { value: 'esnek', label: 'Esnek', icon: '🔄' },
]

const LEARNING_STYLES: { value: LearningStyle; label: string; desc: string; icon: string }[] = [
  { value: 'visual', label: 'Görsel', desc: 'Şema, tablo ve diyagramlar', icon: '👁️' },
  { value: 'reading', label: 'Okuma', desc: 'Metin ve not okuma', icon: '📖' },
  { value: 'practice', label: 'Pratik', desc: 'Soru çözme ve uygulama', icon: '✏️' },
  { value: 'mixed', label: 'Karma', desc: 'Her yöntemi kombine', icon: '🔀' },
]

const SUBJECT_GROUPS = [
  {
    group: 'Temel Bilimler',
    subjects: ['Anatomi', 'Fizyoloji', 'Biyokimya', 'Farmakoloji', 'Patoloji', 'Mikrobiyoloji'],
  },
  {
    group: 'Dahiliye',
    subjects: ['Kardiyoloji', 'Endokrinoloji', 'Gastroenteroloji', 'Nefroloji', 'Hematoloji', 'Nöroloji'],
  },
  {
    group: 'Cerrahi & Diğer',
    subjects: ['Cerrahi', 'Pediatri', 'Kadın-Doğum', 'Psikiyatri', 'Radyoloji', 'Acil Tıp'],
  },
]

const SUBJECT_LEVELS: { value: SubjectLevel; label: string; color: string }[] = [
  { value: 'cok_zayif', label: 'Çok Zayıf', color: 'var(--color-destructive)' },
  { value: 'zayif', label: 'Zayıf', color: 'var(--color-warning)' },
  { value: 'orta', label: 'Orta', color: 'var(--color-text-secondary)' },
  { value: 'iyi', label: 'İyi', color: 'var(--color-success)' },
  { value: 'cok_iyi', label: 'Çok İyi', color: 'var(--color-primary)' },
]

// ── Step 5 data ────────────────────────────────────────────
const INTERESTS = [
  'Acil Tıp', 'Anesteziyoloji', 'Araştırma', 'Beyin Cerrahi', 'Çocuk Sağlığı',
  'Dahiliye', 'Dermatoloji', 'Diğer', 'Enfeksiyon', 'FTR', 'Genel Cerrahi',
  'Göğüs Hastalıkları', 'Göz', 'Hematoloji', 'İç Hastalıkları', 'Kadın Doğum',
  'Kardiyoloji', 'KBB', 'Nöroloji', 'Onkoloji', 'Ortopedi',
  'Pediatri', 'Plastik Cerrahi', 'Psikiyatri', 'Radyoloji', 'Üroloji',
].sort((a, b) => a.localeCompare(b, 'tr'))

function groupByInitial(items: string[]) {
  return items.reduce<Record<string, string[]>>((acc, item) => {
    const initial = item[0].toUpperCase()
    if (!acc[initial]) acc[initial] = []
    acc[initial].push(item)
    return acc
  }, {})
}

// ── Shared input style ────────────────────────────────────
const inputCls = 'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'

// ─────────────────────────────────────────────────────────
export default function OnboardingSetupPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isInitializing, setIsInitializing] = useState(true)
  const [goalError, setGoalError] = useState('')
  const [otherGoal, setOtherGoal] = useState('')
  const [search, setSearch] = useState('')

  const {
    currentStep, goals, interests, notifications, profile,
    setStep, setGoals, setInterests, setNotifications, setProfile, markDirty,
  } = useOnboardingStore()

  const STORAGE_KEY = 'medasi_onboarding_v2'

  // Hydrate from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const p = JSON.parse(raw)
        if (p.currentStep) setStep(p.currentStep)
        if (p.goals) setGoals(p.goals)
        if (p.interests) setInterests(p.interests)
        if (p.notifications) setNotifications(p.notifications)
        if (p.profile) setProfile(p.profile)
        if (p.otherGoal) setOtherGoal(p.otherGoal)
      } catch {}
    }
    const t = setTimeout(() => setIsInitializing(false), 300)
    return () => clearTimeout(t)
  }, [setStep, setGoals, setInterests, setNotifications, setProfile])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep, goals, interests, notifications, profile, otherGoal }))
  }, [currentStep, goals, interests, notifications, profile, otherGoal])

  // Warn before unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (currentStep === 1) return
      e.preventDefault(); e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [currentStep])

  const filteredInterests = useMemo(
    () => INTERESTS.filter(i => i.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))),
    [search]
  )
  const groupedInterests = useMemo(() => groupByInitial(filteredInterests), [filteredInterests])

  function next() {
    if (currentStep === 3 && goals.length === 0) { setGoalError('En az bir hedef seçmelisin'); return }
    setGoalError('')
    setStep(Math.min(TOTAL_STEPS, currentStep + 1))
    markDirty(true)
  }
  function back() { setStep(Math.max(1, currentStep - 1)) }

  function toggleGoal(label: string) {
    setGoals(goals.includes(label) ? goals.filter(g => g !== label) : [...goals, label])
  }
  function toggleInterest(item: string) {
    setInterests(interests.includes(item) ? interests.filter(i => i !== item) : [...interests, item])
  }

  function submit() {
    const finalGoals = goals.includes('Diğer') && otherGoal.trim()
      ? goals.map(g => g === 'Diğer' ? `Diğer: ${otherGoal.trim()}` : g)
      : goals
    const parsed = onboardingSchema.safeParse({ goals: finalGoals, interests, notifications, profile })
    if (!parsed.success) {
      setGoalError(parsed.error.flatten().fieldErrors.goals?.[0] || '')
      return
    }
    // Also save profile to medasi_profile_v1 for account/profile page
    const profilePayload = {
      displayName: profile.displayName,
      phone: '',
      city: '',
      role: profile.level,
      institution: profile.university,
      graduationYear: profile.expectedGradYear,
      specialty: '',
      lastUpdated: new Date().toLocaleDateString('tr-TR'),
    }
    localStorage.setItem('medasi_profile_v1', JSON.stringify(profilePayload))

    startTransition(async () => {
      const result = await completeOnboarding({ goals: finalGoals, interests, notifications, profile })
      if (!result.success) { alert(result.error || 'Bağlantı hatası, lütfen tekrar dene'); return }
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } })
      localStorage.removeItem(STORAGE_KEY)
      router.push('/dashboard')
    })
  }

  if (isInitializing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
          <div className="mb-6 h-6 w-48 rounded bg-[var(--color-border)]" />
          <div className="h-4 w-full rounded bg-[var(--color-border)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:max-w-[900px]">
      <div className="relative">
        {currentStep < TOTAL_STEPS && (
          <button
            onClick={() => setStep(TOTAL_STEPS)}
            className="absolute right-0 top-0 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]"
          >
            Şimdilik Atla →
          </button>
        )}

        <ProgressStepper currentStep={currentStep} labels={STEP_LABELS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Card className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8">

              {/* ── STEP 1: Welcome ─────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-7 text-center">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                    className="mx-auto w-fit rounded-xl border border-[var(--color-border)] px-6 py-3 text-2xl font-bold text-[var(--color-text-primary)]">
                    MEDASI
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl mb-3">Hoş Geldin!</h1>
                    <p className="text-[var(--color-text-secondary)] text-base max-w-lg mx-auto">
                      Tıbbi eğitim yolculuğunu tamamen sana özel hale getirmek için birkaç dakikan var mı?
                      Bu veriler bugün ve ilerleyen aylarda her modülü kişiselleştirmek için kullanılacak.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                    {[
                      { icon: Stethoscope, label: 'Klinik' },
                      { icon: Brain, label: 'Eğitim' },
                      { icon: TrendingUp, label: 'Gelişim' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                        <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                        <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <CheckCircle size={13} className="text-[var(--color-success)]" />
                    <span>Verilerini istediğin zaman değiştirebilirsin</span>
                  </div>
                  <Button className="h-11 rounded-xl px-8 mx-auto" onClick={next}>
                    Başlayalım <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* ── STEP 2: Kim Olduğun ─────────────────────── */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Sen Kimsin?</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Platform seni tanıyarak içerikleri kişiselleştirir</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        <User size={13} className="inline mr-1" />Ad Soyad <span className="text-[var(--color-text-secondary)] font-normal">(opsiyonel)</span>
                      </label>
                      <input
                        value={profile.displayName}
                        onChange={e => setProfile({ displayName: e.target.value })}
                        placeholder="Doktor adınız..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        <GraduationCap size={13} className="inline mr-1" />Üniversite / Hastane
                      </label>
                      <input
                        value={profile.university}
                        onChange={e => setProfile({ university: e.target.value })}
                        placeholder="Örn: Hacettepe Tıp Fakültesi"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                      Eğitim / Kariyer Seviyesi
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {LEVELS.map(level => (
                        <button
                          key={level.value}
                          onClick={() => setProfile({ level: level.value })}
                          className={[
                            'rounded-xl border p-3 text-left transition-all duration-150 hover:scale-[1.02]',
                            profile.level === level.value
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50',
                          ].join(' ')}
                        >
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{level.label}</p>
                          {level.sub && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{level.sub}</p>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(profile.level?.startsWith('ogrenci') || profile.level === 'intern') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                          <Calendar size={13} className="inline mr-1" />Mezuniyet Yılı (Tahmini)
                        </label>
                        <input
                          type="number"
                          min={2024} max={2035}
                          value={profile.expectedGradYear}
                          onChange={e => setProfile({ expectedGradYear: e.target.value })}
                          placeholder="2027"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" className="h-11 rounded-xl" onClick={back}>
                      <ArrowLeft className="h-4 w-4" /> Geri
                    </Button>
                    <Button className="h-11 rounded-xl" onClick={next}>
                      Devam <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Hedefler ────────────────────────── */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Hedeflerini Seç</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Hangi alanlarda gelişmek istiyorsun?</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {GOALS.map(({ key, label, Icon }) => {
                      const checked = goals.includes(label)
                      return (
                        <button key={key} onClick={() => toggleGoal(label)}
                          className={['rounded-xl border p-3.5 text-left transition-all duration-150 hover:scale-[1.02]',
                            checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'].join(' ')}>
                          <Icon className="h-5 w-5 text-[var(--color-primary)] mb-2" />
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {goals.includes('Diğer') && (
                    <input value={otherGoal} onChange={e => setOtherGoal(e.target.value)}
                      placeholder="Diğer hedefini yaz..." className={inputCls} />
                  )}
                  {goalError && <p className="text-sm text-[var(--color-destructive)]">{goalError}</p>}

                  {/* TUS target — only if tus selected */}
                  {goals.includes('TUS Hazırlığı') && (
                    <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                        <Target size={14} className="text-[var(--color-warning)]" /> TUS Hedefi
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Hedef Sınav Tarihi</label>
                          <input type="date" value={profile.tusTargetDate}
                            onChange={e => setProfile({ tusTargetDate: e.target.value })}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Hedef Puan (0-500)</label>
                          <input type="number" min={0} max={500}
                            value={profile.tusTargetScore ?? ''}
                            onChange={e => setProfile({ tusTargetScore: e.target.value ? Number(e.target.value) : null })}
                            placeholder="350"
                            className={inputCls} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" className="h-11 rounded-xl" onClick={back}>
                      <ArrowLeft className="h-4 w-4" /> Geri
                    </Button>
                    <Button className="h-11 rounded-xl" onClick={next} disabled={!goals.length}>
                      Devam <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Öğrenme Profili ───────────────── */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Öğrenme Profilin</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Günlük alışkanlıkların ve konu değerlendirmen</p>
                  </div>

                  {/* Study hours + daily targets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        <Clock size={13} className="inline mr-1" />Günlük Çalışma (saat)
                      </label>
                      <input type="number" min={0} max={16} step={0.5}
                        value={profile.dailyStudyHours}
                        onChange={e => setProfile({ dailyStudyHours: Number(e.target.value) })}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        <Zap size={13} className="inline mr-1" />Günlük Soru Hedefi
                      </label>
                      <input type="number" min={0} max={500}
                        value={profile.dailyQuestionTarget}
                        onChange={e => setProfile({ dailyQuestionTarget: Number(e.target.value) })}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                        <Star size={13} className="inline mr-1" />Günlük Flashcard Hedefi
                      </label>
                      <input type="number" min={0} max={200}
                        value={profile.dailyFlashcardTarget}
                        onChange={e => setProfile({ dailyFlashcardTarget: Number(e.target.value) })}
                        className={inputCls} />
                    </div>
                  </div>

                  {/* Preferred study time */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      <Clock size={13} className="inline mr-1" />En Verimli Çalışma Zamanım
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STUDY_TIMES.map(t => (
                        <button key={t.value} onClick={() => setProfile({ preferredStudyTime: profile.preferredStudyTime === t.value ? '' : t.value })}
                          className={['px-3 py-2 rounded-xl border text-sm transition-all',
                            profile.preferredStudyTime === t.value
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'].join(' ')}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Learning style */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      <Lightbulb size={13} className="inline mr-1" />Öğrenme Stilim
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LEARNING_STYLES.map(s => (
                        <button key={s.value} onClick={() => setProfile({ learningStyle: profile.learningStyle === s.value ? '' : s.value })}
                          className={['rounded-xl border p-3 text-center transition-all',
                            profile.learningStyle === s.value
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'].join(' ')}>
                          <div className="text-xl mb-1">{s.icon}</div>
                          <p className="text-xs font-medium text-[var(--color-text-primary)]">{s.label}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-tight">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject self-assessment */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      <BarChart2 size={13} className="inline mr-1" />Konu Öz Değerlendirmesi
                    </label>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-3">Her konudaki seviyeni belirt (opsiyonel — AI önerilerini geliştirir)</p>
                    <div className="space-y-4">
                      {SUBJECT_GROUPS.map(group => (
                        <div key={group.group}>
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">{group.group}</p>
                          <div className="space-y-2">
                            {group.subjects.map(subject => (
                              <div key={subject} className="flex items-center gap-3">
                                <span className="text-sm text-[var(--color-text-primary)] w-32 shrink-0">{subject}</span>
                                <div className="flex gap-1 flex-wrap">
                                  {SUBJECT_LEVELS.map(sl => (
                                    <button key={sl.value}
                                      onClick={() => setProfile({ subjectLevels: { ...profile.subjectLevels, [subject]: profile.subjectLevels[subject] === sl.value ? undefined as unknown as SubjectLevel : sl.value } })}
                                      className={['px-2 py-0.5 rounded-md border text-xs transition-all',
                                        profile.subjectLevels[subject] === sl.value
                                          ? 'border-transparent text-black font-medium'
                                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/30'].join(' ')}
                                      style={profile.subjectLevels[subject] === sl.value ? { backgroundColor: sl.color, borderColor: sl.color } : {}}>
                                      {sl.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" className="h-11 rounded-xl" onClick={back}>
                      <ArrowLeft className="h-4 w-4" /> Geri
                    </Button>
                    <Button className="h-11 rounded-xl" onClick={next}>
                      Devam <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Branş İlgileri ───────────────── */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">İlgi Alanların</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Hangi branşları takip etmek istersin?</p>
                  </div>

                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Branş ara..." className={inputCls} />

                  <div className="flex gap-2">
                    <button onClick={() => setInterests(INTERESTS)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      Tümünü Seç
                    </button>
                    <button onClick={() => setInterests([])}
                      className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      Temizle
                    </button>
                    {interests.length > 0 && (
                      <span className="px-3 py-1.5 text-xs text-[var(--color-primary)]">{interests.length} seçili</span>
                    )}
                  </div>

                  <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-[var(--color-border)] p-4">
                    {Object.entries(groupedInterests).map(([letter, items]) => (
                      <div key={letter}>
                        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">{letter}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map(item => (
                            <button key={item} onClick={() => toggleInterest(item)}
                              className={['px-2.5 py-1 rounded-lg text-xs border transition-all',
                                interests.includes(item)
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'].join(' ')}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" className="h-11 rounded-xl" onClick={back}>
                      <ArrowLeft className="h-4 w-4" /> Geri
                    </Button>
                    <Button className="h-11 rounded-xl" onClick={next}>
                      Devam <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Bildirimler & Bitir ──────────── */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Neredeyse Bitti!</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Bildirim tercihlerini ayarla ve başla</p>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-2">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Özet</p>
                    {[
                      { icon: User, label: 'Seviye', value: LEVELS.find(l => l.value === profile.level)?.label || '—' },
                      { icon: Target, label: 'Hedef', value: goals.length ? `${goals.length} hedef seçildi` : '—' },
                      { icon: Brain, label: 'Branş', value: interests.length ? `${interests.length} branş seçildi` : '—' },
                      { icon: Clock, label: 'Günlük', value: `${profile.dailyStudyHours}s çalışma · ${profile.dailyQuestionTarget} soru` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 text-sm">
                        <Icon size={14} className="text-[var(--color-primary)] shrink-0" />
                        <span className="text-[var(--color-text-secondary)] w-16 shrink-0">{label}</span>
                        <span className="text-[var(--color-text-primary)] font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Toggle checked={notifications.email} onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                      label="E-posta Bildirimleri" description="Haftalık özet, önemli güncellemeler" />
                    <Toggle checked={notifications.push} onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                      label="Push Bildirimleri" description="Tarayıcı bildirimleri (anında)" />
                    <Toggle checked={notifications.sms} onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                      label="SMS Bildirimleri" description="Kritik hatırlatmalar (opsiyonel)" />
                  </div>

                  <div className="rounded-xl border-l-4 border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-3.5 flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                    <AlertCircle size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                    Tüm tercihlerini profil ayarlarından istediğin zaman değiştirebilirsin.
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" className="h-11 rounded-xl" onClick={back}>
                      <ArrowLeft className="h-4 w-4" /> Geri
                    </Button>
                    <Button className="h-11 rounded-xl px-6" onClick={submit} disabled={isPending}>
                      {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Tamamlanıyor...</> : 'Hadi Başlayalım! 🚀'}
                    </Button>
                  </div>
                </div>
              )}

            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
