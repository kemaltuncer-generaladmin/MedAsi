'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Stethoscope, Brain, Send, RotateCcw, AlertTriangle,
  CheckCircle, Clock, FlaskConical, Zap, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

type Diagnosis = {
  name: string
  probability: number
  explanation: string
}

type AnalysisResult = {
  diagnoses: Diagnosis[]
  urgency: 'low' | 'medium' | 'high'
  tests: string[]
  explanation: string
}

type HistoryEntry = {
  id: string
  symptoms: string
  result: AnalysisResult
  timestamp: Date
}

export default function AIDiagnosisPage() {
  const [symptoms, setSymptoms] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [temp, setTemp] = useState('')
  const [pulse, setPulse] = useState('')
  const [bp, setBp] = useState('')
  const [spo2, setSpo2] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const urgencyConfig = {
    high: { label: 'ACİL', variant: 'destructive' as const, icon: AlertTriangle, color: 'text-[var(--color-destructive)]' },
    medium: { label: 'ORTA ACİLİYET', variant: 'warning' as const, icon: Clock, color: 'text-[var(--color-warning)]' },
    low: { label: 'DÜŞÜK ACİLİYET', variant: 'success' as const, icon: CheckCircle, color: 'text-[var(--color-success)]' },
  }

  const getProbabilityColor = (p: number) => {
    if (p >= 60) return 'bg-[var(--color-destructive)]'
    if (p >= 35) return 'bg-[var(--color-warning)]'
    return 'bg-[var(--color-success)]'
  }

  async function analyze() {
    if (!symptoms.trim()) {
      toast.error('Lütfen semptomları açıklayın')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const vitalParts = [
        temp && `Ateş: ${temp}°C`,
        pulse && `Nabız: ${pulse} bpm`,
        bp && `TA: ${bp} mmHg`,
        spo2 && `SpO2: ${spo2}%`,
      ].filter(Boolean).join(', ')

      const message = `Sen deneyimli bir iç hastalıkları uzmanısın. Aşağıdaki klinik bilgilere dayanarak ayırıcı tanı listesi sun.

Semptomlar: ${symptoms}
${age ? `Yaş: ${age}` : ''}
${gender ? `Cinsiyet: ${gender === 'male' ? 'Erkek' : 'Kadın'}` : ''}
${vitalParts ? `Vital Bulgular: ${vitalParts}` : ''}

Lütfen SADECE şu JSON formatında yanıt ver (başka hiçbir şey yazma):
{
  "diagnoses": [
    { "name": "tanı adı", "probability": 75, "explanation": "kısa klinik açıklama" },
    { "name": "tanı adı", "probability": 45, "explanation": "kısa klinik açıklama" },
    { "name": "tanı adı", "probability": 20, "explanation": "kısa klinik açıklama" }
  ],
  "urgency": "high",
  "tests": ["Tam kan sayımı", "Biyokimya paneli", "EKG"],
  "explanation": "Genel klinik değerlendirme metni"
}`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model: 'FAST' }),
      })

      if (!res.ok) {
        if (res.status === 429) throw new Error('Günlük AI limitinize ulaştınız')
        throw new Error('AI yanıt vermedi')
      }

      const data = await res.json()
      const text = data.response?.[0]?.text || data.response?.find?.((b: { type: string }) => b.type === 'text')?.text || ''

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI yanıtı işlenemedi')

      const parsed: AnalysisResult = JSON.parse(jsonMatch[0])
      setResult(parsed)
      setSelectedHistory(null)

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        symptoms: symptoms.slice(0, 50),
        result: parsed,
        timestamp: new Date(),
      }
      setHistory(prev => [entry, ...prev.slice(0, 4)])

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analiz sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setSymptoms('')
    setAge('')
    setGender('')
    setTemp('')
    setPulse('')
    setBp('')
    setSpo2('')
    setResult(null)
    setSelectedHistory(null)
  }

  function loadHistory(entry: HistoryEntry) {
    setResult(entry.result)
    setSymptoms(entry.symptoms)
    setSelectedHistory(entry.id)
  }

  const displayResult = selectedHistory
    ? history.find(h => h.id === selectedHistory)?.result ?? result
    : result

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Stethoscope size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">AI Tanı Asistanı</h1>
          </div>
          <p className="text-[var(--color-text-secondary)] ml-13 pl-0.5">
            Semptomları girin, olası tanıları ve önerilen tetkikleri anında alın
          </p>
        </div>
        <Badge variant="secondary">FAST Model</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card variant="bordered" className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Semptomlar & Şikayetler
              </label>
              <textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                placeholder="Belirtileri açıklayın... Örn: 3 gündür süren ateş, öksürük ve nefes darlığı mevcut. Balgam çıkarmak istiyor, göğüste ağrı tarif ediyor."
                rows={5}
                className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Yaş</label>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="Örn: 45"
                  className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Cinsiyet</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Seçin</option>
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 uppercase tracking-wide">Vital Bulgular (İsteğe Bağlı)</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Ateş (°C)', value: temp, set: setTemp, placeholder: '37.0' },
                  { label: 'Nabız (bpm)', value: pulse, set: setPulse, placeholder: '72' },
                  { label: 'Tansiyon', value: bp, set: setBp, placeholder: '120/80' },
                  { label: 'SpO2 (%)', value: spo2, set: setSpo2, placeholder: '98' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{field.label}</label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                loading={loading}
                onClick={analyze}
                className="w-full"
              >
                <Brain size={16} />
                {loading ? 'Analiz Ediliyor...' : 'Analiz Et'}
              </Button>
              {(result || symptoms) && (
                <Button variant="ghost" size="sm" onClick={reset} className="w-full">
                  <RotateCcw size={14} />
                  Yeni Analiz
                </Button>
              )}
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              FAST Model · claude-3-5-sonnet kullanılıyor
            </p>
          </Card>

          {history.length > 0 && (
            <Card variant="bordered">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Son Analizler</p>
              <div className="flex flex-col gap-1">
                {history.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => loadHistory(entry)}
                    className={[
                      'w-full text-left px-3 py-2 rounded-md text-xs transition-colors',
                      selectedHistory === entry.id
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]',
                    ].join(' ')}
                  >
                    <span className="font-medium">{entry.symptoms}...</span>
                    <span className="ml-2 opacity-60">
                      {entry.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3" ref={resultRef}>
          {!displayResult && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                <Brain size={36} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="text-center">
                <p className="text-[var(--color-text-primary)] font-medium text-lg">Analiz Bekleniyor</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                  Sol panelden belirtileri girin ve &quot;Analiz Et&quot; butonuna tıklayın
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {['Ateş + Öksürük', 'Göğüs ağrısı', 'Baş dönmesi', 'Karın ağrısı'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSymptoms(s)}
                    className="px-3 py-1.5 rounded-full border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[var(--color-border)] animate-spin border-t-[var(--color-primary)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain size={20} className="text-[var(--color-primary)]" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[var(--color-text-primary)] font-medium">AI Analiz Yapıyor</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">FAST model değerlendiriyor...</p>
              </div>
            </div>
          )}

          {displayResult && !loading && (
            <div className="flex flex-col gap-4">
              {(() => {
                const u = urgencyConfig[displayResult.urgency]
                const UrgIcon = u.icon
                return (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    displayResult.urgency === 'high'
                      ? 'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5'
                      : displayResult.urgency === 'medium'
                      ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                      : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                  }`}>
                    <UrgIcon size={20} className={u.color} />
                    <div>
                      <p className={`text-sm font-bold ${u.color}`}>{u.label}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">Klinik değerlendirme önceliği</p>
                    </div>
                    <Badge variant={u.variant} className="ml-auto">{u.label}</Badge>
                  </div>
                )
              })()}

              <Card variant="bordered">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-[var(--color-primary)]" />
                  <CardTitle className="text-base">Olası Tanılar</CardTitle>
                </div>
                <div className="flex flex-col gap-4">
                  {displayResult.diagnoses.map((d, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--color-text-secondary)] font-mono w-4">{i + 1}.</span>
                          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-[var(--color-text-primary)]">{d.probability}%</span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getProbabilityColor(d.probability)}`}
                          style={{ width: `${d.probability}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] pl-6">{d.explanation}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="bordered">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-[var(--color-primary)]" />
                  <CardTitle className="text-base">Önerilen Tetkikler</CardTitle>
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayResult.tests.map((t, i) => (
                    <Badge key={i} variant="default" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </Card>

              <Card variant="bordered">
                <div className="flex items-center gap-2 mb-3">
                  <Send size={16} className="text-[var(--color-primary)]" />
                  <CardTitle className="text-base">AI Değerlendirmesi</CardTitle>
                </div>
                <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
                  {displayResult.explanation}
                </CardContent>
              </Card>

              <p className="text-xs text-[var(--color-text-secondary)] text-center border border-[var(--color-border)] rounded-lg p-3">
                ⚕️ Bu analiz yalnızca eğitim amaçlıdır. Klinik kararlar için uzman hekime danışın.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
