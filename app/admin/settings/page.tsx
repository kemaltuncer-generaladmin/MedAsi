'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Clock, Server, Database, Globe, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_admin_settings_v1'

interface SystemSettings {
  maintenanceMode: boolean
  registrationEnabled: boolean
  onboardingRequired: boolean
  aiEnabled: boolean
  maxUsersPerDay: number
  sessionTimeoutMinutes: number
  debugMode: boolean
  allowedEmailDomains: string
  maintenanceMessage: string
  appVersion: string
  lastBackupDate: string
}

const DEFAULTS: SystemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  onboardingRequired: true,
  aiEnabled: true,
  maxUsersPerDay: 0,
  sessionTimeoutMinutes: 60,
  debugMode: false,
  allowedEmailDomains: '',
  maintenanceMessage: 'Sistemimiz şu anda bakım modundadır. Lütfen daha sonra tekrar deneyiniz.',
  appVersion: '1.0.0',
  lastBackupDate: '2026-04-07T03:00:00.000Z',
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { settings: SystemSettings; savedAt: string }
        setSettings(parsed.settings)
        setLastSavedAt(new Date(parsed.savedAt))
      }
    } catch {
      // ignore
    }
  }, [])

  function persist(updated: SystemSettings) {
    const now = new Date()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: updated, savedAt: now.toISOString() }))
    setLastSavedAt(now)
  }

  function toggleBoolean(key: keyof Pick<SystemSettings,
    'maintenanceMode' | 'registrationEnabled' | 'onboardingRequired' | 'aiEnabled' | 'debugMode'
  >) {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      persist(updated)
      const label = updated[key] ? 'Açık' : 'Kapalı'
      toast.success(`${key === 'maintenanceMode' ? 'Bakım modu' :
        key === 'registrationEnabled' ? 'Kayıt sistemi' :
        key === 'onboardingRequired' ? 'Onboarding' :
        key === 'aiEnabled' ? 'AI özellikleri' :
        'Debug modu'} ${label}`)
      return updated
    })
  }

  function updateField<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value }
      persist(updated)
      return updated
    })
  }

  if (!mounted) return null

  const isProduction = process.env.NODE_ENV === 'production'

  return (
    <div className="space-y-6 max-w-screen-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sistem Ayarları
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Platform genelindeki ayarları yapılandırın
          </p>
        </div>
        {lastSavedAt && (
          <span
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <Clock size={12} />
            Son kaydedildi: {formatTime(lastSavedAt)}
          </span>
        )}
      </div>

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 rounded-xl px-5 py-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)',
        }}
      >
        <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
          Bu ayarlar tüm kullanıcıları etkiler. Dikkatli olun.
        </p>
      </div>

      {/* Sistem Durumu */}
      <div className="space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-widest px-1"
          style={{ color: 'var(--color-text-disabled)' }}
        >
          Sistem Durumu
        </h2>

        {/* Maintenance Mode */}
        <div>
          <Toggle
            checked={settings.maintenanceMode}
            label="Bakım Modu"
            description="Tüm kullanıcılara bakım sayfası gösterilir. Adminler erişimde olmaya devam eder."
            onClick={() => toggleBoolean('maintenanceMode')}
            className={
              settings.maintenanceMode
                ? 'border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_6%,transparent)]'
                : ''
            }
          />
          {settings.maintenanceMode && (
            <div
              className="mt-2 rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-destructive) 30%, transparent)',
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-destructive)' }}>
                Bakım Modu Aktif — Kullanıcılara gösterilecek mesaj:
              </p>
              <textarea
                rows={3}
                value={settings.maintenanceMessage}
                onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, transparent)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-destructive)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    'color-mix(in srgb, var(--color-destructive) 40%, transparent)'
                }}
              />
            </div>
          )}
        </div>

        <Toggle
          checked={settings.registrationEnabled}
          label="Kayıt Sistemi"
          description="Yeni kullanıcıların platforma kaydolmasına izin ver."
          onClick={() => toggleBoolean('registrationEnabled')}
          className={
            settings.registrationEnabled
              ? 'border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_5%,transparent)]'
              : ''
          }
        />

        <Toggle
          checked={settings.aiEnabled}
          label="AI Özellikleri"
          description="Platform genelinde tüm yapay zeka özelliklerini aç/kapat."
          onClick={() => toggleBoolean('aiEnabled')}
          className={
            settings.aiEnabled
              ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]'
              : ''
          }
        />

        <Toggle
          checked={settings.onboardingRequired}
          label="Onboarding Zorunluluğu"
          description="Yeni kullanıcıların ilk girişte onboarding adımlarını tamamlamasını zorunlu kıl."
          onClick={() => toggleBoolean('onboardingRequired')}
          className={
            settings.onboardingRequired
              ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]'
              : ''
          }
        />

        <Toggle
          checked={settings.debugMode}
          label="Debug Modu"
          description="Adminlere hata ayıklama bilgilerini göster."
          onClick={() => toggleBoolean('debugMode')}
        />
      </div>

      {/* Güvenlik */}
      <div className="space-y-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2"
          style={{ color: 'var(--color-text-disabled)' }}
        >
          <Shield size={13} />
          Güvenlik
        </h2>
        <Card variant="bordered">
          <CardContent className="space-y-5 pt-0">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                İzin Verilen E-posta Domainleri
              </label>
              <textarea
                rows={3}
                value={settings.allowedEmailDomains}
                placeholder={'Boş bırakırsanız tümüne izin verilir.\nörn:\nhastane.gov.tr\nmedasi.com.tr'}
                onChange={(e) => updateField('allowedEmailDomains', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none font-mono"
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
              <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
                Her satıra bir domain yazın. Boş bırakırsanız tüm domainlere izin verilir.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Oturum Zaman Aşımı
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      updateField('sessionTimeoutMinutes', Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    dakika
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
                  Hareketsizlik sonrası otomatik çıkış
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Günlük Maks. Kayıt Limiti
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={settings.maxUsersPerDay}
                    onChange={(e) =>
                      updateField('maxUsersPerDay', Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
                  0 = sınırsız
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sistem Bilgisi */}
      <div className="space-y-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2"
          style={{ color: 'var(--color-text-disabled)' }}
        >
          <Server size={13} />
          Sistem Bilgisi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            {
              icon: Globe,
              label: 'Uygulama Versiyonu',
              value: settings.appVersion,
              accentColor: 'var(--color-primary)',
            },
            {
              icon: Server,
              label: 'Platform',
              value: 'Next.js 15 / React 19',
              accentColor: 'var(--color-secondary)',
            },
            {
              icon: Database,
              label: 'Veritabanı',
              value: 'PostgreSQL (Supabase)',
              accentColor: 'var(--color-success)',
            },
            {
              icon: Clock,
              label: 'Son Yedekleme',
              value: formatDate(settings.lastBackupDate),
              accentColor: 'var(--color-warning)',
            },
            {
              icon: Shield,
              label: 'Ortam',
              value: isProduction ? 'Production' : 'Development',
              accentColor: isProduction ? 'var(--color-success)' : 'var(--color-warning)',
            },
          ].map(({ icon: Icon, label, value, accentColor }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                }}
              >
                <Icon size={15} style={{ color: accentColor }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {label}
                </p>
                <p
                  className="text-sm font-semibold mt-0.5 truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}

          {/* Status indicator */}
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
              }}
            >
              <span
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Sistem Durumu
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-success)' }}>
                {settings.maintenanceMode ? 'Bakım Modu' : 'Tüm sistemler çalışıyor'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
