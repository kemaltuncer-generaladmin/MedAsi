'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Zap, ShoppingCart, Clock, BarChart2, Cpu, TrendingUp, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const MODELS = [
  {
    id: 'fast',
    name: 'FAST Model',
    desc: 'claude-3-5-sonnet',
    label: 'Hızlı & Güçlü',
    used: 0,
    limit: 30,
    color: 'var(--color-primary)',
  },
  {
    id: 'efficient',
    name: 'EFFICIENT Model',
    desc: 'claude-3-5-haiku',
    label: 'Ekonomik',
    used: 0,
    limit: 20,
    color: 'var(--color-warning)',
  },
]

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const MONTH_DATA: number[] = Array(12).fill(0)

export default function AIWalletPage() {
  const totalCredits = 0
  const dailyLimit = 10

  function handleBuy() {
    toast('Kredi satın alma yakında aktif olacak', { icon: '⏳' })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AI Kredileri</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Yapay zeka kullanım istatistiklerinizi ve kredi bakiyenizi görüntüleyin</p>
      </div>

      {/* Bakiye Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="bordered" className="sm:col-span-2">
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-[var(--color-primary)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Mevcut Bakiye</span>
                </div>
                <p className="text-5xl font-bold text-[var(--color-text-primary)] mb-1">{totalCredits}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">kredi</p>
              </div>
              <Button variant="primary" size="sm" onClick={handleBuy}>
                <ShoppingCart size={14} />
                Kredi Satın Al
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-[var(--color-warning)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">Günlük Limit</span>
            </div>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">{dailyLimit}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">sorgu / gün</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">Bugün: 0 kullanıldı</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Kullanımı */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu size={18} className="text-[var(--color-primary)]" />
            Model Bazlı Kullanım
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {MODELS.map(model => {
              const pct = model.limit > 0 ? Math.round((model.used / model.limit) * 100) : 0
              return (
                <div key={model.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: model.color }}
                      />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{model.name}</span>
                      <Badge variant="secondary" className="text-xs">{model.label}</Badge>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">{model.used} / {model.limit} sorgu</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: model.color }}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{model.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex gap-2">
            <Info size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-text-secondary)]">
              FAST model daha kapsamlı yanıtlar için, EFFICIENT model hızlı ve ekonomik sorgular için optimize edilmiştir. Kredi satın alarak limitlerinizi artırabilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aylık Kullanım Grafiği */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 size={18} className="text-[var(--color-primary)]" />
            Aylık Kullanım
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-24 pb-1">
            {MONTHS.map((m, i) => {
              const val = MONTH_DATA[i] ?? 0
              const isCurrentMonth = i === new Date().getMonth()
              const barPct = val > 0 ? Math.max(8, (val / Math.max(...MONTH_DATA, 1)) * 100) : 0
              return (
                <div key={m} className="flex-1 flex flex-col items-end gap-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: val > 0 ? `${barPct}%` : '4px',
                      background: isCurrentMonth ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                      border: `1px solid ${isCurrentMonth ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      opacity: isCurrentMonth ? 1 : 0.6,
                    }}
                  />
                  <span className="text-[var(--color-text-secondary)] hidden sm:block" style={{ fontSize: '9px' }}>{m}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 py-4">
            <TrendingUp size={16} className="text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">Henüz AI sorgusu yapılmadı</p>
          </div>
        </CardContent>
      </Card>

      {/* Son Kullanım */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-primary)]" />
            Son Kullanım
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
              <Zap size={20} className="text-[var(--color-text-secondary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Henüz AI sorgusu yapılmadı</p>
            <p className="text-xs text-[var(--color-text-secondary)]">İlk AI sorgunuzu yaptıktan sonra kullanım geçmişiniz burada görünecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
