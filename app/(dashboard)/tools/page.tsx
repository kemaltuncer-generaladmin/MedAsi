import Link from 'next/link'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Calculator, Activity, Wrench, ChevronRight } from 'lucide-react'

const tools = [
  {
    href: '/tools/clinical-formule',
    icon: Calculator,
    title: 'Klinik Formül Hesaplayıcıları',
    description: 'BMI, GFR, BSA, Dozaj hesaplama, İdeal kilo ve daha fazlası',
    count: '12 Formül',
    color: 'var(--color-primary)',
  },
  {
    href: '/tools/scores',
    icon: Activity,
    title: 'Skor Hesaplayıcılar',
    description: 'HEART, CHADS2, Wells, Glasgow, APACHE II ve klinik skorlar',
    count: '8 Skor',
    color: 'var(--color-success)',
  },
]

export default function ToolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Wrench size={20} className="text-[var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Araçlar</h1>
        </div>
        <p className="text-[var(--color-text-secondary)]">Klinik karar desteği için hesaplayıcılar ve skorlama sistemleri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map(tool => (
          <Link key={tool.href} href={tool.href}>
            <Card variant="bordered" className="hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tool.color}15` }}>
                  <tool.icon size={22} style={{ color: tool.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="group-hover:text-[var(--color-primary)] transition-colors">{tool.title}</CardTitle>
                    <ChevronRight size={16} className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors" />
                  </div>
                  <CardContent className="mt-1 text-sm">{tool.description}</CardContent>
                  <span className="inline-block mt-3 text-xs px-2 py-1 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)]" style={{ color: tool.color }}>
                    {tool.count}
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
