'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CreditCard, Zap, Star, Building2, CheckCircle2, FileText, Plus, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const FREE_FEATURES = [
  'Günde 10 AI sorgusu',
  'Lab değerlendirme aracı',
  'OSCE pratik modu (3 istasyon)',
  'Temel not tutma',
  'Topluluk erişimi',
]

const PRO_FEATURES = [
  'Günde 50 AI sorgusu',
  'Tüm OSCE istasyonları',
  'Gelişmiş lab analizi',
  'PDF rapor aktarımı',
  'Öncelikli destek',
]

const CLINIC_FEATURES = [
  'Sınırsız AI sorgusu',
  'Ekip yönetimi (5 kullanıcı)',
  'Kurumsal entegrasyon',
  'Özel eğitim materyali',
  'Dedicated destek hattı',
]

export default function WalletPage() {
  const currentPlan = 'free'
  const aiUsed = 0
  const aiLimit = 50

  function handleUpgrade() {
    toast('Ücretli planlar yakında aktif olacak', { icon: '⏳' })
  }

  function handleAddCard() {
    toast('Kart ekleme özelliği yakında aktif olacak', { icon: '⏳' })
  }

  const usagePercent = Math.round((aiUsed / aiLimit) * 100)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Abonelik & Faturalama</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Plan bilgilerinizi ve fatura geçmişinizi görüntüleyin</p>
      </div>

      {/* Mevcut Plan */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--color-primary)]" />
            Mevcut Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center">
                <Star size={22} className="text-[var(--color-text-secondary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-[var(--color-text-primary)] text-lg">Ücretsiz Plan</span>
                  <Badge variant="secondary">Ücretsiz</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">Temel özellikler ile başlayın</p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={handleUpgrade}>
              <TrendingUp size={14} />
              Yükselt
            </Button>
          </div>

          <div className="space-y-2">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <CheckCircle2 size={14} className="text-[var(--color-success)] shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Kredi Kullanımı */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--color-primary)]" />
            AI Kredi Kullanımı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Bu ay kullanım</span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {aiUsed} / {aiLimit} sorgu
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usagePercent}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2">
            Her ay 1'inde sıfırlanır. Daha fazla kullanım için Pro plana geçin.
          </p>
        </CardContent>
      </Card>

      {/* Plan Karşılaştırması */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Plan Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Free */}
            <div className="rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-[var(--color-primary)]" />
                <span className="font-semibold text-[var(--color-text-primary)] text-sm">Ücretsiz</span>
                <Badge variant="default" className="ml-auto text-xs">Aktif</Badge>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">₺0<span className="text-sm font-normal text-[var(--color-text-secondary)]">/ay</span></p>
              <div className="space-y-1.5 mt-3">
                {FREE_FEATURES.map((f, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-1.5 items-start">
                    <CheckCircle2 size={12} className="text-[var(--color-success)] mt-0.5 shrink-0" />{f}
                  </p>
                ))}
              </div>
            </div>

            {/* Pro */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-[var(--color-warning)]" />
                <span className="font-semibold text-[var(--color-text-primary)] text-sm">Pro</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">₺199<span className="text-sm font-normal text-[var(--color-text-secondary)]">/ay</span></p>
              <div className="space-y-1.5 mt-3">
                {PRO_FEATURES.map((f, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-1.5 items-start">
                    <CheckCircle2 size={12} className="text-[var(--color-success)] mt-0.5 shrink-0" />{f}
                  </p>
                ))}
              </div>
              <Button variant="primary" size="sm" className="w-full mt-4" onClick={handleUpgrade}>Geç</Button>
            </div>

            {/* Klinik */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-[var(--color-secondary)]" />
                <span className="font-semibold text-[var(--color-text-primary)] text-sm">Klinik</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">₺599<span className="text-sm font-normal text-[var(--color-text-secondary)]">/ay</span></p>
              <div className="space-y-1.5 mt-3">
                {CLINIC_FEATURES.map((f, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] flex gap-1.5 items-start">
                    <CheckCircle2 size={12} className="text-[var(--color-success)] mt-0.5 shrink-0" />{f}
                  </p>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4 border border-[var(--color-border)]" onClick={handleUpgrade}>İletişime Geç</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ödeme Yöntemi */}
      <Card variant="bordered">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={18} className="text-[var(--color-primary)]" />
              Ödeme Yöntemi
            </CardTitle>
            <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={handleAddCard}>
              <Plus size={14} />
              Kart Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
              <CreditCard size={20} className="text-[var(--color-text-secondary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Kayıtlı ödeme yöntemi yok</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Ücretli planlara geçmek için kart ekleyin</p>
            <Button variant="primary" size="sm" onClick={handleAddCard}>
              <Plus size={14} />
              Kart Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fatura Geçmişi */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--color-primary)]" />
            Fatura Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
              <FileText size={20} className="text-[var(--color-text-secondary)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Henüz fatura bulunmuyor</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Ücretli plana geçtikten sonra faturalarınız burada görünecek</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
