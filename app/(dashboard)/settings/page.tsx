'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 relative shrink-0 ${enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform duration-200 absolute top-0 ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </div>
  )
}

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [dailyBriefing, setDailyBriefing] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Ayarlar</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Hesap ve tercihlerinizi yönetin</p>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Profil Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              D
            </div>
            <Button variant="ghost" size="sm">Fotoğraf Değiştir</Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Ad Soyad
              </label>
              <input
                type="text"
                defaultValue="Dr. Doktor"
                className="w-full px-3 py-2 rounded-md text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                E-Posta
              </label>
              <input
                type="email"
                defaultValue="prof@medasi.com"
                disabled
                className="w-full px-3 py-2 rounded-md text-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed opacity-60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Unvan / Uzmanlık
              </label>
              <select
                defaultValue="assistant_doctor"
                className="w-full px-3 py-2 rounded-md text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="student">Tıp Öğrencisi</option>
                <option value="assistant_doctor">Asistan Doktor</option>
                <option value="specialist_doctor">Uzman Doktor</option>
                <option value="professor">Profesör</option>
              </select>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md">Değişiklikleri Kaydet</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Bildirim Tercihleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">E-posta bildirimleri</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Önemli hesap güncellemeleri ve duyurular</p>
              </div>
              <Toggle enabled={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Günlük brifing e-postası</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Her sabah medikal gündem özeti</p>
              </div>
              <Toggle enabled={dailyBriefing} onToggle={() => setDailyBriefing(!dailyBriefing)} />
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Haftalık ilerleme raporu</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">AI kullanım istatistikleri ve gelişim özeti</p>
              </div>
              <Toggle enabled={weeklyReport} onToggle={() => setWeeklyReport(!weeklyReport)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Hesap Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">Mevcut Plan</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Öğrenci</Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">Ücretsiz</span>
                </div>
              </div>
              <Link href="/upgrade">
                <Button variant="primary" size="sm">Paketi Yükselt</Button>
              </Link>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Şifre Değiştir
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-[var(--color-destructive)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10">
                Hesabı Sil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Görünüm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">Tema</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Karanlık Mod</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">Dil</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Türkçe</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] pt-1">
              Daha fazla kişiselleştirme seçeneği yakında
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
