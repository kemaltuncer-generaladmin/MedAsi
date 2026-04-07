import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { BookOpen, Presentation, FileText, Video, Mic, Sparkles, Bot, ChevronRight, Library } from 'lucide-react'

const sources = [
  {
    href: '/source/slides',
    icon: Presentation,
    title: 'Slaytlar',
    description: 'Ders ve klinik slaytlarını görüntüle, organize et',
    badge: 'Aktif',
    badgeColor: 'var(--color-success)',
    works: true,
  },
  {
    href: '/source/ders-notlari',
    icon: FileText,
    title: 'Ders Notları',
    description: 'Kişisel ders notlarınız ve özet dökümanlar',
    badge: 'Yakında',
    badgeColor: 'var(--color-warning)',
    works: false,
  },
  {
    href: '/source/textbooks',
    icon: BookOpen,
    title: 'Ders Kitapları',
    description: 'Dijital kitap kütüphanesi ve referans kaynaklar',
    badge: 'Yakında',
    badgeColor: 'var(--color-warning)',
    works: false,
  },
  {
    href: '/source/videos',
    icon: Video,
    title: 'Videolar',
    description: 'Eğitim videoları ve prosedür anlatımları',
    badge: 'Yakında',
    badgeColor: 'var(--color-warning)',
    works: false,
  },
  {
    href: '/source/ses-kaydi',
    icon: Mic,
    title: 'Ses Kayıtları',
    description: 'Ders kayıtları ve klinik simülasyon sesler',
    badge: 'Yakında',
    badgeColor: 'var(--color-warning)',
    works: false,
  },
  {
    href: '/source/ai-notlar',
    icon: Sparkles,
    title: 'AI Notlar',
    description: 'Yapay zeka destekli otomatik not oluşturma',
    badge: 'Geliştiriliyor',
    badgeColor: 'var(--color-primary)',
    works: false,
  },
  {
    href: '/source/akilli-asistan',
    icon: Bot,
    title: 'Akıllı Asistan',
    description: 'Kaynaklarınızı anlayan AI asistan',
    badge: 'Geliştiriliyor',
    badgeColor: 'var(--color-primary)',
    works: false,
  },
]

export default function SourcePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Library size={20} className="text-[var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Kaynaklar</h1>
        </div>
        <p className="text-[var(--color-text-secondary)]">Tüm eğitim materyalleriniz tek bir yerden</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sources.map(s => (
          <Link key={s.href} href={s.href}>
            <Card variant="bordered" className="hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group p-5 h-full">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.badgeColor}15` }}>
                  <s.icon size={20} style={{ color: s.badgeColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="group-hover:text-[var(--color-primary)] transition-colors text-base">{s.title}</CardTitle>
                    <ChevronRight size={14} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors shrink-0 ml-2" />
                  </div>
                  <CardContent className="text-sm leading-relaxed">{s.description}</CardContent>
                  <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded-full border" style={{ color: s.badgeColor, borderColor: `${s.badgeColor}40`, backgroundColor: `${s.badgeColor}10` }}>
                    {s.badge}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
