'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Save, RotateCcw, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_admin_content_v1'

interface SiteContent {
  heroTitle: string
  heroSubtitle: string
  heroDesc: string
  stat1Value: string
  stat1Label: string
  stat2Value: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
  ctaButtonText: string
  footerText: string
  contactEmail: string
  supportText: string
}

const DEFAULTS: SiteContent = {
  heroTitle: 'Tıbbi Eğitimde Yapay Zeka:',
  heroSubtitle: 'Sıfır Risk. Sonsuz Pratik.',
  heroDesc: "400.000'den fazla vaka ile gerçek klinik senaryolar üzerinde sınırsız pratik yapın.",
  stat1Value: '400000',
  stat1Label: 'Klinik Vaka',
  stat2Value: '2000',
  stat2Label: 'Aktif Kullanıcı',
  stat3Value: '94',
  stat3Label: 'Başarı Oranı (%)',
  ctaButtonText: '30 Dakikalık Demo Al',
  footerText: '© 2026. Tüm hakları saklıdır.',
  contactEmail: 'destek@medasi.com.tr',
  supportText: 'Herhangi bir sorunuz veya teknik destek talebiniz için destek@medasi.com.tr adresine yazabilirsiniz.',
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export default function ContentPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULTS)
  const [saved, setSaved] = useState<SiteContent>(DEFAULTS)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const isDirty = JSON.stringify(content) !== JSON.stringify(saved)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { content: SiteContent; savedAt: string }
        setContent(parsed.content)
        setSaved(parsed.content)
        setLastSavedAt(new Date(parsed.savedAt))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const handleSave = useCallback(() => {
    const now = new Date()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ content, savedAt: now.toISOString() }))
    setSaved(content)
    setLastSavedAt(now)
    toast.success('İçerik kaydedildi.')
  }, [content])

  const handleReset = () => {
    const confirmed = window.confirm(
      'Tüm değişiklikler varsayılan değerlere sıfırlanacak. Emin misiniz?'
    )
    if (!confirmed) return
    setContent(DEFAULTS)
    toast('İçerik varsayılanlara sıfırlandı.', { icon: '↩️' })
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  function set<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }))
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            İçerik Yönetimi
          </h1>
          {isDirty && (
            <Badge variant="warning">Kaydedilmemiş değişiklikler</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-disabled)' }}>
            Cmd+S ile kayıt
          </span>
          {lastSavedAt && (
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Clock size={12} />
              Son kaydedildi: {formatTime(lastSavedAt)}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw size={14} />
            Sıfırla
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save size={14} />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Hero Bölümü</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-4">
              <Input
                label="Ana Başlık"
                value={content.heroTitle}
                onChange={(e) => set('heroTitle', e.target.value)}
                placeholder="Ana başlık metni"
              />
              <Input
                label="Alt Başlık"
                value={content.heroSubtitle}
                onChange={(e) => set('heroSubtitle', e.target.value)}
                placeholder="Alt başlık metni"
              />
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Açıklama
                </label>
                <textarea
                  rows={4}
                  value={content.heroDesc}
                  onChange={(e) => set('heroDesc', e.target.value)}
                  placeholder="Hero açıklama metni..."
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    caretColor: 'var(--color-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}
                />
              </div>
            </div>

            {/* Live preview */}
            <div
              className="rounded-xl p-6 flex flex-col justify-center"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, transparent), color-mix(in srgb, var(--color-secondary) 8%, transparent))',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--color-text-disabled)' }}
              >
                Canlı Önizleme
              </p>
              <h2
                className="text-xl font-bold leading-tight mb-1"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {content.heroTitle || (
                  <span style={{ color: 'var(--color-text-disabled)' }}>Ana Başlık...</span>
                )}
              </h2>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: 'var(--color-primary)' }}
              >
                {content.heroSubtitle || (
                  <span style={{ color: 'var(--color-text-disabled)' }}>Alt Başlık...</span>
                )}
              </h3>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {content.heroDesc || (
                  <span style={{ color: 'var(--color-text-disabled)' }}>Açıklama...</span>
                )}
              </p>
              <button
                className="self-start text-xs font-semibold px-4 py-2 rounded-md"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#000',
                }}
              >
                {content.ctaButtonText || 'CTA Butonu'}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>İstatistikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(
              [
                { valueKey: 'stat1Value', labelKey: 'stat1Label', title: 'İstatistik 1' },
                { valueKey: 'stat2Value', labelKey: 'stat2Label', title: 'İstatistik 2' },
                { valueKey: 'stat3Value', labelKey: 'stat3Label', title: 'İstatistik 3' },
              ] as const
            ).map(({ valueKey, labelKey, title }) => (
              <div
                key={valueKey}
                className="rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  {title}
                </p>
                <Input
                  label="Değer"
                  value={content[valueKey]}
                  onChange={(e) => set(valueKey, e.target.value)}
                  placeholder="örn. 400000"
                />
                <Input
                  label="Etiket"
                  value={content[labelKey]}
                  onChange={(e) => set(labelKey, e.target.value)}
                  placeholder="örn. Klinik Vaka"
                />
                <div
                  className="rounded-md p-3 text-center"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {content[valueKey] || '—'}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {content[labelKey] || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA & Buttons */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>CTA & Butonlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CTA Buton Metni"
              value={content.ctaButtonText}
              onChange={(e) => set('ctaButtonText', e.target.value)}
              placeholder="örn. 30 Dakikalık Demo Al"
            />
            <Input
              label="İletişim E-Postası"
              type="email"
              value={content.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
              placeholder="destek@medasi.com.tr"
            />
          </div>
        </CardContent>
      </Card>

      {/* General */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Genel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Footer Metni"
              value={content.footerText}
              onChange={(e) => set('footerText', e.target.value)}
              placeholder="© 2026. Tüm hakları saklıdır."
            />
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Destek Metni
              </label>
              <textarea
                rows={3}
                value={content.supportText}
                onChange={(e) => set('supportText', e.target.value)}
                placeholder="Kullanıcılara gösterilen destek metni..."
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
