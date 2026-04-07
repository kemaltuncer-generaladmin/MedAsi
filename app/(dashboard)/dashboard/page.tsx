import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Users, FlaskConical, Stethoscope, Bot, Calculator, Activity,
  Library, Brain, Gamepad2, Terminal, Clock, ChevronRight,
  Sparkles, FileText, LayoutDashboard
} from 'lucide-react'

const quickLinks = [
  {
    href: '/my-patients',
    icon: Users,
    title: 'Hastalarım',
    desc: 'Hasta listesi ve kayıt yönetimi',
    color: 'var(--color-primary)',
  },
  {
    href: '/clinic',
    icon: Stethoscope,
    title: 'Klinik',
    desc: 'Servis, taburcu, klinik notlar',
    color: 'var(--color-success)',
  },
  {
    href: '/lab-viewing',
    icon: FlaskConical,
    title: 'Lab Takip',
    desc: 'Laboratuvar sonuçları ve referans değerler',
    color: 'var(--color-warning)',
  },
  {
    href: '/tools',
    icon: Calculator,
    title: 'Araçlar',
    desc: 'Klinik formüller ve skor hesaplayıcılar',
    color: 'var(--color-primary)',
  },
  {
    href: '/source',
    icon: Library,
    title: 'Kaynaklar',
    desc: 'Slaytlar, notlar, kitaplar',
    color: 'var(--color-success)',
  },
  {
    href: '/clinic/ai-assistan',
    icon: Bot,
    title: 'Klinik AI Asistan',
    desc: 'Klinik karar desteği için AI',
    color: 'var(--color-primary)',
  },
  {
    href: '/ai-diagnosis',
    icon: Brain,
    title: 'AI Tanı Asistanı',
    desc: 'Belirtilerden olası tanılar',
    color: 'var(--color-warning)',
  },
  {
    href: '/case-rpg',
    icon: Gamepad2,
    title: 'Vaka Simülasyonu',
    desc: 'Sanal hasta eğitimi',
    color: 'var(--color-success)',
  },
]

const comingSoon = [
  { title: 'Soru Bankası', href: '/questions/bank' },
  { title: 'Flashcard', href: '/flashcards/flashcard' },
  { title: 'TUS Planlayıcı', href: '/planners/tus' },
  { title: 'OSCE Sınavı', href: '/exams/osce' },
  { title: 'AI Flashcard', href: '/flashcards/ai' },
  { title: 'Spot Notlar', href: '/flashcards/spot-notlar' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <LayoutDashboard size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Genel Bakış</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Hoş geldiniz — tüm modüllere buradan erişebilirsiniz</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aktif Hastalar', value: '—', color: 'var(--color-primary)', icon: Users },
          { label: 'Lab Sonuçları', value: '—', color: 'var(--color-success)', icon: FlaskConical },
          { label: 'Klinik Notlar', value: '—', color: 'var(--color-warning)', icon: FileText },
          { label: 'AI Sorguları', value: '—', color: 'var(--color-primary)', icon: Sparkles },
        ].map(stat => (
          <Card key={stat.label} variant="bordered" className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} style={{ color: stat.color }} />
              <span className="text-xs text-[var(--color-text-secondary)]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Hızlı Erişim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href}>
              <Card variant="bordered" className="p-4 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group h-full">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${link.color}15` }}>
                    <link.icon size={18} style={{ color: link.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm group-hover:text-[var(--color-primary)] transition-colors">{link.title}</p>
                      <ChevronRight size={12} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">{link.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Yakında Geliyor</h2>
          <Badge variant="warning" className="text-xs">Geliştirme Aşamasında</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {comingSoon.map(item => (
            <Link key={item.href} href={item.href}>
              <div className="px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-warning)]/40 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">{item.title}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)] animate-pulse shrink-0 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
