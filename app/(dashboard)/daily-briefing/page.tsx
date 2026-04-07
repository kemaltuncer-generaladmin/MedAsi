import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Newspaper, Calendar, Target, CheckCircle, Circle,
  TrendingUp, BookOpen, Lightbulb, ChevronRight, Activity
} from 'lucide-react'

function TodayDate() {
  const now = new Date()
  const formatted = now.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
  return <span>{formatted}</span>
}

const DAILY_TOPICS = [
  { title: "Yeni GLP-1 Reseptör Agonistleri Kılavuzu", specialty: "Endokrinoloji", isNew: true },
  { title: "Kardiyovasküler Risk Hesaplama Güncellendi", specialty: "Kardiyoloji", isNew: true },
  { title: "Antibiyotik Yönetimi: 2025 Protokolleri", specialty: "Enfeksiyon", isNew: false },
  { title: "Pediatrik Aşı Takvimi Güncellemesi", specialty: "Pediatri", isNew: false },
  { title: "Diyabetik Nefropati Yönetimi", specialty: "Nefroloji", isNew: false },
]

const GOALS = [
  { text: "AI Tanı Modülünde 1 analiz yap", done: false },
  { text: "Vaka RPG'de 1 vaka tamamla", done: false },
  { text: "25 dakika odaklanmış çalışma (Pomodoro)", done: false },
  { text: "3 not kaydet", done: false },
]

const WEEKLY_DATA = [
  { day: 'Pzt', value: 6 },
  { day: 'Sal', value: 8 },
  { day: 'Çar', value: 4 },
  { day: 'Per', value: 9 },
  { day: 'Cum', value: 7 },
  { day: 'Cmt', value: 3 },
  { day: 'Paz', value: 0 },
]

export default function DailyBriefingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Newspaper size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Günlük Brifing</h1>
          </div>
          <div className="flex items-center gap-2 ml-0.5 mt-1">
            <Calendar size={14} className="text-[var(--color-text-secondary)]" />
            <p className="text-[var(--color-text-secondary)] text-sm">
              <TodayDate />
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Activity size={14} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bugünkü Çalışma", value: "0 dk", color: "text-[var(--color-primary)]", icon: "⏱" },
          { label: "Tamamlanan Vaka", value: "0", color: "text-[var(--color-success)]", icon: "✅" },
          { label: "AI Sorgusu", value: "2 / 10", color: "text-[var(--color-warning)]", icon: "🤖" },
          { label: "Aktif Hasta", value: "45", color: "text-[var(--color-primary)]", icon: "👥" },
        ].map(stat => (
          <Card key={stat.label} variant="bordered" className="p-4">
            <p className="text-lg mb-1">{stat.icon}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <Card variant="elevated">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={16} className="text-[var(--color-primary)]" />
                  <CardTitle>Günün Vakası</CardTitle>
                </div>
                <Badge variant="secondary">Rastgele Seçildi</Badge>
              </div>
            </div>
            <p className="text-[var(--color-text-primary)] font-semibold text-base leading-snug mb-3">
              58 yaşında erkek hasta, eforla artan göğüs ağrısı ve nefes darlığı ile başvuruyor
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
              10 yıldır hipertansiyon ve tip 2 diyabet öyküsü mevcut. EKG&apos;de ST segment değişiklikleri dikkat çekiyor. Troponin sonuçları bekleniyor.
            </p>
            <Button variant="primary" size="sm" className="w-full">
              <ChevronRight size={14} />
              Vakayı İncele
            </Button>
          </Card>

          <Card variant="bordered">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-[var(--color-primary)]" />
              <CardTitle>Bugünün Hedefleri</CardTitle>
            </div>
            <div className="flex flex-col gap-3">
              {GOALS.map((goal, i) => (
                <div key={i} className="flex items-center gap-3">
                  {goal.done
                    ? <CheckCircle size={16} className="text-[var(--color-success)] shrink-0" />
                    : <Circle size={16} className="text-[var(--color-text-secondary)] shrink-0" />}
                  <span className={`text-sm ${goal.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--color-text-secondary)] mb-1.5">
                <span>İlerleme</span>
                <span>0 / 4 Tamamlandı</span>
              </div>
              <div className="h-1.5 bg-[var(--color-border)] rounded-full">
                <div className="h-full w-0 bg-[var(--color-primary)] rounded-full" />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card variant="bordered">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper size={16} className="text-[var(--color-primary)]" />
              <CardTitle>Bu Haftanın Gündem Konuları</CardTitle>
            </div>
            <div className="flex flex-col gap-3">
              {DAILY_TOPICS.map((topic, i) => (
                <div key={i} className="flex items-start gap-3 group cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                        {topic.title}
                      </p>
                      {topic.isNew && <Badge variant="success" className="text-xs">Yeni</Badge>}
                    </div>
                    <Badge variant="default" className="text-xs mt-1">{topic.specialty}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="elevated">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[var(--color-primary)]" />
              <CardTitle>Bu Haftaki Aktivite</CardTitle>
            </div>
            <div className="flex items-end gap-2 h-24">
              {WEEKLY_DATA.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-[var(--color-primary)] transition-all"
                    style={{ height: `${(d.value / 10) * 100}%`, opacity: d.value === 0 ? 0.2 : 1 }}
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">{d.day}</span>
                </div>
              ))}
            </div>
            <CardContent className="mt-3 text-xs">Bu Hafta: 37 Çalışma Seansı</CardContent>
          </Card>
        </div>
      </div>

      <Card variant="bordered" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-secondary)]/5" />
        <div className="relative flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Lightbulb size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wide mb-2">Uzman İpucu</p>
            <p className="text-[var(--color-text-primary)] text-base leading-relaxed">
              "Akut göğüs ağrısında <span className="text-[var(--color-primary)] font-semibold">HEART skoru</span>nu unutma:
              <span className="font-medium"> History</span> (anamnez),
              <span className="font-medium"> ECG</span> (elektrokardiyogram),
              <span className="font-medium"> Age</span> (yaş),
              <span className="font-medium"> Risk factors</span> (risk faktörleri),
              <span className="font-medium"> Troponin</span>.
              Bu 5 faktör acil servis kararlarını önemli ölçüde kolaylaştırır."
            </p>
            <p className="text-[var(--color-text-secondary)] text-sm mt-2">— MEDASI Eğitim Sistemi</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
