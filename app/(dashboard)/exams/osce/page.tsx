'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ClipboardList, Play, Timer, CheckSquare, Square, Star, Trophy, X, ChevronRight, RotateCcw, History } from 'lucide-react'
import toast from 'react-hot-toast'

const OSCE_KEY = 'medasi_osce_v1'

interface Station {
  id: string
  title: string
  duration: number // minutes
  category: string
  description: string
  task: string
  skills: string[]
}

interface CompletedStation {
  stationId: string
  score: number
  date: string
  checkedSkills: string[]
}

interface OSCEData {
  completed: CompletedStation[]
}

const STATIONS: Station[] = [
  {
    id: 'kardiyoloji',
    title: 'Kardiyoloji Muayenesi',
    duration: 8,
    category: 'Muayene',
    description: 'Kardiyovasküler sistem muayenesi istasyonu. Hastanın kalp sesleri, nabız ve periferik dolaşımını değerlendirin.',
    task: '55 yaşında erkek hasta, efor dispnesi ve çarpıntı şikayetiyle başvuruyor. Sistematik kardiyovasküler muayene yapınız ve bulgularınızı özetleyiniz.',
    skills: ['Genel görünüm değerlendirmesi', 'Juguler venöz basınç ölçümü', 'Apeks nabzı lokalizasyonu', 'Kalp seslerini dinleme (S1/S2)', 'Ek ses değerlendirmesi (S3/S4)', 'Üfürüm tespiti', 'Periferik nabız muayenesi', 'Ödem değerlendirmesi'],
  },
  {
    id: 'noroloji',
    title: 'Nörolojik Muayene',
    duration: 10,
    category: 'Muayene',
    description: 'Nörolojik sistem muayenesi istasyonu. Kranial sinirler, motor ve duyusal sistem değerlendirmesi.',
    task: '42 yaşında kadın hasta, sol el uyuşması ve zayıflık şikayetiyle başvuruyor. Nörolojik muayene yaparak olası lezyon lokalizasyonunu belirtiniz.',
    skills: ['Mental durum değerlendirmesi', 'Kranial sinir muayenesi (II-XII)', 'Motor sistem muayenesi', 'Refleks muayenesi (DTR)', 'Serebeller testler', 'Duyusal sistem muayenesi', 'Yürüyüş ve koordinasyon', 'Meningeal işaretler'],
  },
  {
    id: 'karin',
    title: 'Karın Muayenesi',
    duration: 7,
    category: 'Muayene',
    description: 'Abdominal sistem muayenesi istasyonu. Sistematik karın muayenesi teknikleri.',
    task: '35 yaşında erkek hasta, sağ alt kadran ağrısı ve ateş şikayetiyle geliyor. Sistematik karın muayenesi yapınız.',
    skills: ['İnspeksiyon', 'Yüzeyel palpasyon', 'Derin palpasyon', 'Karaciğer perküsyonu', 'Dalak değerlendirmesi', 'Rebound tenderness', 'Murphy işareti', 'Bağırsak seslerinin oskültasyonu'],
  },
  {
    id: 'gogus',
    title: 'Göğüs Muayenesi',
    duration: 8,
    category: 'Muayene',
    description: 'Solunum sistemi muayenesi istasyonu. Akciğer muayenesi ve değerlendirmesi.',
    task: '68 yaşında erkek hasta, kronik öksürük ve nefes darlığı şikayetiyle başvuruyor. Solunum sistemi muayenesi yapınız.',
    skills: ['Solunum hızı ve ritmi', 'Göğüs şekli değerlendirmesi', 'Palpasyon (fremitus)', 'Akciğer perküsyonu', 'Soluk sesi oskültasyonu', 'Ek sesler (ral/ronküs/wheeze)', 'Vokal resonans', 'Oksijen saturasyonu'],
  },
  {
    id: 'ekg',
    title: 'EKG Yorumlama',
    duration: 5,
    category: 'Teknik',
    description: 'EKG okuma ve yorumlama istasyonu. Ritmik ve yapısal anormallikleri tespit edin.',
    task: 'Gösterilen 12 derivasyonlu EKG\'yi sistematik olarak yorumlayınız ve klinik önemine göre değerlendiriniz.',
    skills: ['Ritim tanımlaması', 'Hız hesaplama', 'Aks hesaplama', 'P dalgası değerlendirmesi', 'PR intervali', 'QRS kompleksi', 'ST segment analizi', 'T dalgası değerlendirmesi'],
  },
  {
    id: 'lab',
    title: 'Lab Değerlendirme',
    duration: 5,
    category: 'Teknik',
    description: 'Laboratuvar sonuçlarını değerlendirme ve klinik bağlamda yorumlama istasyonu.',
    task: 'Verilen hemogram, biyokimya ve koagülasyon sonuçlarını değerlendirerek ayırıcı tanı listesi oluşturunuz.',
    skills: ['Hemogram yorumlama', 'Elektrolit bozukluğu tespiti', 'Karaciğer fonksiyon testleri', 'Böbrek fonksiyon testleri', 'Koagülasyon parametreleri', 'Enflamasyon göstergeleri', 'Kritik değerleri tanıma', 'Klinik korelasyon'],
  },
  {
    id: 'iletisim',
    title: 'Hasta İletişimi',
    duration: 8,
    category: 'İletişim',
    description: 'Hasta ile iletişim becerileri istasyonu. Anamnez alma ve hasta eğitimi.',
    task: 'Hipertansiyon tanısı konulan 60 yaşında bir hastaya yaşam tarzı değişikliklerini ve ilaç tedavisini açıklayınız.',
    skills: ['Empati kurma', 'Açık uçlu sorular', 'Aktif dinleme', 'Tıbbi jargondan kaçınma', 'Bilginin doğrulanması', 'Hasta endişelerini karşılama', 'Tedavi planı açıklama', 'Takip planı oluşturma'],
  },
  {
    id: 'recete',
    title: 'Reçete Yazma',
    duration: 6,
    category: 'Teknik',
    description: 'Doğru ve eksiksiz reçete yazma istasyonu. İlaç seçimi ve doz hesaplama.',
    task: 'Akut pnömoni tanısıyla penicillin alerjisi olmayan 45 yaşında bir hastaya amoksisilin-klavulanat reçetesi yazınız ve dozu hesaplayınız.',
    skills: ['Hasta bilgisi eksiksizliği', 'İlaç adı (jenerik/ticari)', 'Doz belirleme', 'Kullanım sıklığı', 'Tedavi süresi', 'Özel talimatlar', 'İmza ve tarih', 'İlaç etkileşimi kontrolü'],
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Muayene: 'var(--color-primary)',
  Teknik: 'var(--color-warning)',
  İletişim: 'var(--color-success)',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

type View = 'list' | 'practice' | 'history'

export default function OSCEPage() {
  const [view, setView] = useState<View>('list')
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [checkedSkills, setCheckedSkills] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [selfRating, setSelfRating] = useState(0)
  const [oscData, setOscData] = useState<OSCEData>({ completed: [] })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OSCE_KEY)
      if (raw) setOscData(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setTimerActive(false)
            toast('Süre doldu!', { icon: '⏰' })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, timeLeft])

  function startPractice(station: Station) {
    setSelectedStation(station)
    setCheckedSkills([])
    setTimeLeft(station.duration * 60)
    setTimerActive(false)
    setSelfRating(0)
    setView('practice')
  }

  function toggleSkill(skill: string) {
    setCheckedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  function startTimer() {
    setTimerActive(true)
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
    if (selectedStation) setTimeLeft(selectedStation.duration * 60)
  }

  function completeStation() {
    if (!selectedStation || selfRating === 0) {
      toast.error('Lütfen kendinizi değerlendirin (1-5 yıldız)')
      return
    }
    const entry: CompletedStation = {
      stationId: selectedStation.id,
      score: selfRating,
      date: new Date().toLocaleDateString('tr-TR'),
      checkedSkills: [...checkedSkills],
    }
    const updated: OSCEData = { completed: [entry, ...oscData.completed] }
    setOscData(updated)
    try {
      localStorage.setItem(OSCE_KEY, JSON.stringify(updated))
    } catch {}
    toast.success(`${selectedStation.title} tamamlandı! ${selfRating}/5 yıldız`)
    setView('list')
  }

  function getStationHistory(stationId: string): CompletedStation[] {
    return oscData.completed.filter(c => c.stationId === stationId)
  }

  function getAvgScore(stationId: string): number | null {
    const hist = getStationHistory(stationId)
    if (hist.length === 0) return null
    return Math.round(hist.reduce((sum, c) => sum + c.score, 0) / hist.length * 10) / 10
  }

  const totalScore = oscData.completed.reduce((sum, c) => sum + c.score, 0)
  const avgScore = oscData.completed.length > 0
    ? Math.round((totalScore / oscData.completed.length) * 10) / 10
    : 0

  if (view === 'practice' && selectedStation) {
    const completedCount = checkedSkills.length
    const totalSkills = selectedStation.skills.length
    const progressPct = Math.round((completedCount / totalSkills) * 100)
    const timerPct = timeLeft / (selectedStation.duration * 60) * 100
    const timerColor = timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-destructive)'

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">{selectedStation.category}</Badge>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{selectedStation.title}</h1>
          </div>
          <button
            onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setView('list') }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Timer */}
        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Timer size={20} className="text-[var(--color-primary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Kalan Süre</p>
                  <p className="text-3xl font-bold font-mono" style={{ color: timerColor }}>
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!timerActive ? (
                  <Button variant="primary" size="sm" onClick={startTimer} disabled={timeLeft === 0}>
                    <Play size={14} />
                    Başlat
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={() => setTimerActive(false)}>
                    Durdur
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={resetTimer}>
                  <RotateCcw size={14} />
                </Button>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden mt-4">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${timerPct}%`, background: timerColor }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Görev */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Görev</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">{selectedStation.description}</p>
            <div className="bg-[var(--color-surface-elevated)] rounded-lg p-4 border border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{selectedStation.task}</p>
            </div>
          </CardContent>
        </Card>

        {/* Beceri Kontrol Listesi */}
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList size={18} className="text-[var(--color-primary)]" />
                Beceri Kontrol Listesi
              </CardTitle>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {completedCount}/{totalSkills}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: 'var(--color-primary)' }}
              />
            </div>
            <div className="space-y-2">
              {selectedStation.skills.map((skill, i) => {
                const checked = checkedSkills.includes(skill)
                return (
                  <button
                    key={i}
                    onClick={() => toggleSkill(skill)}
                    className={[
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      checked
                        ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-secondary)]',
                    ].join(' ')}
                  >
                    {checked
                      ? <CheckSquare size={16} className="text-[var(--color-primary)] shrink-0" />
                      : <Square size={16} className="text-[var(--color-text-secondary)] shrink-0" />
                    }
                    <span className={`text-sm ${checked ? 'text-[var(--color-text-primary)] line-through opacity-70' : 'text-[var(--color-text-secondary)]'}`}>
                      {skill}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Öz Değerlendirme */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star size={18} className="text-[var(--color-primary)]" />
              Öz Değerlendirme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Bu istasyondaki performansınızı değerlendirin</p>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setSelfRating(n)}
                  className="flex-1 py-2 rounded-lg transition-all"
                  style={{
                    background: n <= selfRating ? 'var(--color-warning)' : 'var(--color-surface-elevated)',
                    border: `1px solid ${n <= selfRating ? 'var(--color-warning)' : 'var(--color-border)'}`,
                  }}
                >
                  <Star
                    size={18}
                    className="mx-auto"
                    style={{
                      color: n <= selfRating ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                      fill: n <= selfRating ? 'var(--color-text-inverse)' : 'transparent',
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="text-center mb-4">
              {selfRating === 0 && <p className="text-xs text-[var(--color-text-secondary)]">Yıldız seçin</p>}
              {selfRating === 1 && <p className="text-xs" style={{ color: 'var(--color-destructive)' }}>Yetersiz — Daha fazla pratik gerekli</p>}
              {selfRating === 2 && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>Geliştirilmeli — Bazı eksiklikler var</p>}
              {selfRating === 3 && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>Orta — Kabul edilebilir performans</p>}
              {selfRating === 4 && <p className="text-xs" style={{ color: 'var(--color-success)' }}>İyi — Küçük iyileştirmeler yapılabilir</p>}
              {selfRating === 5 && <p className="text-xs" style={{ color: 'var(--color-success)' }}>Mükemmel — Tam puanlı performans</p>}
            </div>
            <Button variant="primary" className="w-full" onClick={completeStation} disabled={selfRating === 0}>
              <CheckSquare size={15} />
              İstasyonu Tamamla
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">OSCE Geçmişi</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{oscData.completed.length} tamamlanan istasyon</p>
          </div>
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={() => setView('list')}>
            ← Geri
          </Button>
        </div>

        {oscData.completed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <History size={32} className="text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-primary)]">Henüz tamamlanan istasyon yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {oscData.completed.map((c, i) => {
              const st = STATIONS.find(s => s.id === c.stationId)
              return (
                <Card key={i} variant="bordered" className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)] text-sm">{st?.title ?? c.stationId}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--color-text-secondary)]">{c.date}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{c.checkedSkills.length} / {st?.skills.length ?? '?'} beceri</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          size={14}
                          style={{
                            color: n <= c.score ? 'var(--color-warning)' : 'var(--color-border)',
                            fill: n <= c.score ? 'var(--color-warning)' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">OSCE Simülatörü</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Klinik muayene istasyonlarını pratik yapın ve kendinizi değerlendirin</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-[var(--color-border)] shrink-0"
          onClick={() => setView('history')}
        >
          <History size={14} />
          Geçmiş
        </Button>
      </div>

      {/* İstatistikler */}
      {oscData.completed.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card variant="bordered" className="p-3 text-center">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Tamamlanan</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{oscData.completed.length}</p>
          </Card>
          <Card variant="bordered" className="p-3 text-center">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Ort. Puan</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{avgScore}/5</p>
          </Card>
          <Card variant="bordered" className="p-3 text-center">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Toplam Puan</p>
            <div className="flex items-center justify-center gap-1">
              <Trophy size={16} style={{ color: 'var(--color-warning)' }} />
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalScore}</p>
            </div>
          </Card>
        </div>
      )}

      {/* İstasyon Listesi */}
      <div className="space-y-3">
        {STATIONS.map(station => {
          const avgSt = getAvgScore(station.id)
          const timesCompleted = getStationHistory(station.id).length
          const catColor = CATEGORY_COLORS[station.category] ?? 'var(--color-primary)'

          return (
            <Card key={station.id} variant="bordered" className="p-0 hover:border-[var(--color-primary)]/30 transition-colors">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">{station.title}</h3>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-[var(--color-surface-elevated)]"
                        style={{ borderColor: catColor, color: catColor }}
                      >
                        {station.category}
                      </span>
                      {timesCompleted > 0 && (
                        <Badge variant="success" className="text-xs">{timesCompleted}x tamamlandı</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mb-2 line-clamp-2">{station.description}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1"><Timer size={11} /> {station.duration} dk</span>
                      <span className="flex items-center gap-1"><ClipboardList size={11} /> {station.skills.length} beceri</span>
                      {avgSt !== null && (
                        <span className="flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
                          <Star size={11} /> Ort: {avgSt}/5
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => startPractice(station)}
                  >
                    <Play size={13} />
                    Başla
                    <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
