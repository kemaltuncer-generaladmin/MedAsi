import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { HelpCircle, BookMarked, AlertCircle, Sparkles, Factory, ChevronRight } from 'lucide-react'

const items = [
  { href: '/questions/bank', icon: BookMarked, title: 'Soru Bankası', desc: 'Konu bazlı soru havuzu', color: 'var(--color-primary)' },
  { href: '/questions/hatali', icon: AlertCircle, title: 'Hatalı Sorular', desc: 'Yanlış cevapladığın sorular', color: 'var(--color-destructive)' },
  { href: '/questions/ai', icon: Sparkles, title: 'AI Soru Üretici', desc: 'Yapay zeka destekli soru oluşturma', color: 'var(--color-primary)' },
  { href: '/questions/fabrika', icon: Factory, title: 'Soru Fabrikası', desc: 'Toplu soru üretimi ve yönetimi', color: 'var(--color-warning)' },
]

export default function QuestionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <HelpCircle size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Soru Modülü</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Soru bankası ve pratik modülleri</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <Link key={item.href} href={item.href}>
            <Card variant="bordered" className="p-5 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base group-hover:text-[var(--color-primary)] transition-colors">{item.title}</CardTitle>
                    <ChevronRight size={14} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" />
                  </div>
                  <CardContent className="text-sm mt-0.5">{item.desc}</CardContent>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
