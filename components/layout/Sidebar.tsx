'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Hospital, Users, FlaskConical, Stethoscope,
  Pill, LogOut as Discharge, FileText, Bot, Wrench, Calculator,
  Activity, BookOpen, Presentation, Book, Video, Mic,
  Brain, Lightbulb, GraduationCap, ClipboardCheck, MessageSquare,
  Calendar, Route, Layers, HelpCircle, CreditCard,
  Settings, Star, LogOut, ChevronDown, Sparkles, BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/lib/actions/auth'

type NavItem = { label: string; href: string; icon: LucideIcon; badge?: string }
type Section = { heading: string; key: string; items: NavItem[]; defaultOpen?: boolean }

const sections: Section[] = [
  {
    heading: 'GENEL',
    key: 'general',
    defaultOpen: true,
    items: [
      { label: 'Ana Panel', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'KLİNİK',
    key: 'clinic',
    defaultOpen: true,
    items: [
      { label: 'Klinik Merkezi', href: '/clinic', icon: Hospital },
      { label: 'Hastalarım', href: '/my-patients', icon: Users },
      { label: 'Lab & Görüntüleme', href: '/lab-viewing', icon: FlaskConical },
      { label: 'Servis Takip', href: '/clinic/service', icon: Activity },
      { label: 'Reçetelerim', href: '/clinic/receipt', icon: Pill },
      { label: 'Taburcu İşlemleri', href: '/clinic/discharged', icon: Discharge },
      { label: 'Klinik Notlarım', href: '/clinic/clinical-notes', icon: FileText },
      { label: 'AI Asistanım', href: '/clinic/ai-assistan', icon: Bot },
    ],
  },
  {
    heading: 'ARAÇLAR',
    key: 'tools',
    defaultOpen: false,
    items: [
      { label: 'Araçlar', href: '/tools', icon: Wrench },
      { label: 'Klinik Formüller', href: '/tools/clinical-formule', icon: Calculator },
      { label: 'Skor Hesaplayıcı', href: '/tools/scores', icon: Stethoscope },
    ],
  },
  {
    heading: 'KAYNAKLAR',
    key: 'source',
    defaultOpen: false,
    items: [
      { label: 'Kaynaklar', href: '/source', icon: BookOpen },
      { label: 'Slaytlar', href: '/source/slides', icon: Presentation },
      { label: 'Ders Notlarım', href: '/source/ders-notlari', icon: Book },
      { label: 'Textbooklar', href: '/source/textbooks', icon: Book },
      { label: 'Videolar', href: '/source/videos', icon: Video },
      { label: 'Ses Kayıtları', href: '/source/ses-kaydi', icon: Mic },
      { label: 'AI Notlarım', href: '/source/ai-notlar', icon: Sparkles },
      { label: 'Akıllı Asistan', href: '/source/akilli-asistan', icon: Brain },
    ],
  },
  {
    heading: 'SINAVLAR',
    key: 'exams',
    defaultOpen: false,
    items: [
      { label: 'OSCE Provam', href: '/exams/osce', icon: ClipboardCheck },
      { label: 'Sözlü Sınav', href: '/exams/sozlu', icon: MessageSquare },
      { label: 'Kuramsal Sınav', href: '/exams/kuramsal', icon: GraduationCap },
      { label: 'Zilli Sınavlar', href: '/exams/zilli', icon: Layers },
    ],
  },
  {
    heading: 'PLANLAYICILAR',
    key: 'planners',
    defaultOpen: false,
    items: [
      { label: 'Ders Planlayıcı', href: '/planners/ders', icon: Calendar },
      { label: 'Akıllı Planlayıcı', href: '/planners/akilli', icon: Sparkles },
      { label: 'TUS Planlama', href: '/planners/tus', icon: Route },
      { label: 'İntörn Planlayıcı', href: '/planners/intern', icon: Calendar },
      { label: 'Staj Planlayıcı', href: '/planners/staj', icon: Calendar },
      { label: 'Preklinik', href: '/planners/preklinik', icon: Calendar },
    ],
  },
  {
    heading: 'SORU MODÜLÜ',
    key: 'questions',
    defaultOpen: false,
    items: [
      { label: 'Soru Bankası', href: '/questions/bank', icon: HelpCircle },
      { label: 'Hatalı Sorularım', href: '/questions/hatali', icon: FileText },
      { label: 'AI ile Geliştir', href: '/questions/ai', icon: Brain },
      { label: 'Soru Fabrikası', href: '/questions/fabrika', icon: Sparkles },
    ],
  },
  {
    heading: 'FLASHCARD',
    key: 'flashcards',
    defaultOpen: false,
    items: [
      { label: 'Flashcard Modülü', href: '/flashcards/flashcard', icon: Layers },
      { label: 'Spot Notlar', href: '/flashcards/spot-notlar', icon: Lightbulb },
      { label: 'AI ile Öğren', href: '/flashcards/ai', icon: Sparkles },
    ],
  },
  {
    heading: 'AI YÖNETİM',
    key: 'ai',
    defaultOpen: false,
    items: [
      { label: 'Token Cüzdanı', href: '/ai/wallet', icon: CreditCard },
      { label: 'Token Geçmişim', href: '/ai/history', icon: BarChart3 },
      { label: 'Harcama Kontrolü', href: '/ai/control', icon: Activity },
    ],
  },
  {
    heading: 'HESABIM',
    key: 'account',
    defaultOpen: false,
    items: [
      { label: 'Profil Ayarlarım', href: '/account/profile', icon: Settings },
      { label: 'Cüzdan', href: '/account/wallet', icon: CreditCard },
      { label: 'Sistem Ayarları', href: '/account/system', icon: Settings },
      { label: 'Paket Yükselt', href: '/upgrade', icon: Star },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    sections.forEach(s => { init[s.key] = s.defaultOpen ?? false })
    return init
  })

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function toggle(key: string) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
      <div className="h-16 flex items-center px-5 border-b border-[var(--color-border)] shrink-0">
        <span className="text-xl font-bold text-white tracking-wider">
          MED<span className="text-[var(--color-primary)]">ASİ</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {sections.map(section => {
          const isOpen = open[section.key]
          const hasActive = section.items.some(i => isActive(i.href))
          return (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className={[
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors',
                  hasActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                <span className="text-[10px] font-semibold tracking-widest uppercase">{section.heading}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="space-y-0.5 mb-1">
                  {section.items.map(item => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 group border-l-2',
                          active
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 border-transparent',
                        ].join(' ')}
                      >
                        <item.icon size={14} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)]">{item.badge}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] shrink-0 p-2 space-y-0.5">
        <form action={logout}>
          <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-all border-l-2 border-transparent">
            <LogOut size={14} className="shrink-0" />
            <span>Çıkış Yap</span>
          </button>
        </form>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">Dr. Kullanıcı</p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">Öğrenci Paketi</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
