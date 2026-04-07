import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Layers, CreditCard, StickyNote, Sparkles, ChevronRight } from 'lucide-react'

const items = [
  { href: '/flashcards/flashcard', icon: CreditCard, title: 'Flashcard', desc: 'Klasik kart bazlı çalışma', color: 'var(--color-primary)' },
  { href: '/flashcards/spot-notlar', icon: StickyNote, title: 'Spot Notlar', desc: 'Kısa ve etkili hafıza notları', color: 'var(--color-success)' },
  { href: '/flashcards/ai', icon: Sparkles, title: 'AI Flashcard', desc: 'Yapay zeka ile otomatik kart oluşturma', color: 'var(--color-primary)' },
]

export default function FlashcardsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Layers size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Flashcard</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Hızlı tekrar ve hafıza modülleri</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <Link key={item.href} href={item.href}>
            <Card variant="bordered" className="p-5 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${item.color}15` }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base group-hover:text-[var(--color-primary)] transition-colors">{item.title}</CardTitle>
                <ChevronRight size={14} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)]" />
              </div>
              <CardContent className="text-sm mt-1">{item.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
