'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Monitor, Sun, Moon, Globe, Trash2, Download, AlertTriangle, Info, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const SYSTEM_KEY = 'medasi_system_prefs_v1'

type ThemeOption = 'dark' | 'light' | 'system'

interface SystemPrefs {
  theme: ThemeOption
  language: string
}

const defaultPrefs: SystemPrefs = {
  theme: 'dark',
  language: 'tr',
}

export default function SystemPage() {
  const [prefs, setPrefs] = useState<SystemPrefs>(defaultPrefs)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYSTEM_KEY)
      if (raw) setPrefs(JSON.parse(raw))
    } catch {}
  }, [])

  function savePrefs(updated: SystemPrefs) {
    setPrefs(updated)
    try {
      localStorage.setItem(SYSTEM_KEY, JSON.stringify(updated))
      toast.success('Tercihler kaydedildi')
    } catch {
      toast.error('Kayıt hatası')
    }
  }

  function setTheme(theme: ThemeOption) {
    savePrefs({ ...prefs, theme })
  }

  function handleClearCache() {
    const confirmed = window.confirm('Tüm medasi_* önbellek verileri silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?')
    if (!confirmed) return
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('medasi_')) keysToRemove.push(key)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    toast.success(`${keysToRemove.length} önbellek verisi temizlendi`)
  }

  function handleDownloadData() {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('medasi_')) {
        try { data[key] = JSON.parse(localStorage.getItem(key) ?? '') }
        catch { data[key] = localStorage.getItem(key) }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medasi_veriler_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Veriler indirildi')
  }

  function handleDeleteAccount() {
    toast.error('Hesap silme özelliği şu an kullanılamıyor. Destek ekibiyle iletişime geçin.', { duration: 5000 })
  }

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Karanlık', icon: <Moon size={15} /> },
    { value: 'light', label: 'Açık', icon: <Sun size={15} /> },
    { value: 'system', label: 'Sistem', icon: <Monitor size={15} /> },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Sistem Ayarları</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Görünüm, dil ve veri tercihlerinizi yönetin</p>
      </div>

      {/* Görünüm */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor size={18} className="text-[var(--color-primary)]" />
            Görünüm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-text-secondary)] mb-3">Tema tercihini seçin</p>
          <div className="flex gap-2">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={[
                  'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-lg border transition-all text-sm font-medium',
                  prefs.theme === opt.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]',
                ].join(' ')}
              >
                {opt.icon}
                {opt.label}
                {prefs.theme === opt.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-3">
            Not: Açık tema ve sistem teması görsel tercih olarak kaydedilir. Uygulama şu an karanlık modda çalışmaktadır.
          </p>
        </CardContent>
      </Card>

      {/* Dil */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} className="text-[var(--color-primary)]" />
            Dil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)]/5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🇹🇷</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Türkçe</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            </div>
            <div
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🇬🇧</span>
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">İngilizce</span>
              </div>
              <Badge variant="secondary" className="text-xs">Yakında</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Veri Yönetimi */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 size={18} className="text-[var(--color-primary)]" />
            Veri Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Önbelleği Temizle</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Tüm yerel uygulama verilerini ve önbelleği siler</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="border border-[var(--color-border)] shrink-0"
                onClick={handleClearCache}
              >
                <Trash2 size={14} />
                Temizle
              </Button>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Tüm Verilerimi İndir</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Yerel verilerinizi JSON formatında dışa aktarın</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="border border-[var(--color-border)] shrink-0"
                onClick={handleDownloadData}
              >
                <Download size={14} />
                İndir
              </Button>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-destructive)' }}>Hesabımı Sil</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinir.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="border shrink-0"
                style={{ borderColor: 'var(--color-destructive)', color: 'var(--color-destructive)' }}
                onClick={handleDeleteAccount}
              >
                <AlertTriangle size={14} />
                Sil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hakkında */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={18} className="text-[var(--color-primary)]" />
            Hakkında
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">Uygulama Versiyonu</span>
              <Badge variant="default">v1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">Yapı Tarihi</span>
              <span className="text-sm text-[var(--color-text-primary)]">07 Nisan 2026</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">Platform</span>
              <span className="text-sm text-[var(--color-text-primary)]">Next.js 15 / React 19</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Kaynak Kod</span>
              <button
                className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
                onClick={() => toast('GitHub linki yakında eklenecek', { icon: '🔗' })}
              >
                <ExternalLink size={14} />
                GitHub
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-4 pt-3 border-t border-[var(--color-border)]">
            MEDASI — Türk tıp öğrencileri ve hekimler için yapay zeka destekli eğitim platformu. © 2026 Tüm hakları saklıdır.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
