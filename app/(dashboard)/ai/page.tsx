import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Bot, Wallet, History, SlidersHorizontal, ChevronRight } from 'lucide-react'

const items = [
  { href: '/ai/wallet', icon: Wallet, title: 'AI Cüzdan', desc: 'AI kredi yönetimi ve satın alma', color: 'var(--color-primary)' },
  { href: '/ai/history', icon: History, title: 'AI Geçmişi', desc: 'Tüm AI sorgularınızın geçmişi', color: 'var(--color-success)' },
  { href: '/ai/control', icon: SlidersHorizontal, title: 'AI Kontrol', desc: 'AI model ve davranış ayarları', color: 'var(--color-warning)' },
]

export default function AIPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Bot size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">AI Yönetim</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Yapay zeka modül ayarları ve kredi yönetimi</p>
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
