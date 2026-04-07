import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { GraduationCap, MonitorPlay, Mic, BookOpen, Zap, ChevronRight } from 'lucide-react'

const items = [
  { href: '/exams/osce', icon: MonitorPlay, title: 'OSCE Sınavı', desc: 'Objektif yapılandırılmış klinik sınav', color: 'var(--color-primary)' },
  { href: '/exams/sozlu', icon: Mic, title: 'Sözlü Sınav', desc: 'Sözlü sınav simülasyonu', color: 'var(--color-success)' },
  { href: '/exams/kuramsal', icon: BookOpen, title: 'Kuramsal Sınav', desc: 'Çoktan seçmeli sınav modülü', color: 'var(--color-warning)' },
  { href: '/exams/zilli', icon: Zap, title: 'Zilli Sınav', desc: 'Yapay zeka destekli adaptif sınav', color: 'var(--color-primary)' },
]

export default function ExamsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <GraduationCap size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Sınavlar</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Klinik sınav hazırlık modülleri</p>
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
