'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import {
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_admin_logs_v1'

type LogLevel = 'info' | 'warn' | 'error' | 'success'
type LogCategory = 'auth' | 'user' | 'ai' | 'system' | 'payment'
type DateRange = 'today' | '7d' | '30d' | 'all'

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  details?: string
  userId?: string
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function now(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString()
}

const SEED_LOGS: LogEntry[] = [
  { id: uid(), timestamp: now(2), level: 'success', category: 'auth', message: 'Yeni kullanıcı kaydı: elif.kaya@istanbul.edu.tr', details: 'IP: 78.186.45.23 — Paket: Öğrenci', userId: 'u_elif01' },
  { id: uid(), timestamp: now(5), level: 'warn', category: 'ai', message: 'AI sorgu limiti aşıldı: kullanıcı mehmet.demir@gmail.com', details: 'Günlük limit: 100 sorgu. Mevcut: 102. Otomatik kota artırımı uygulandı.', userId: 'u_mehmet02' },
  { id: uid(), timestamp: now(8), level: 'success', category: 'payment', message: 'Ödeme başarılı: ahmet.yilmaz@gmail.com — Pro Plan 299₺', details: 'İşlem ID: pay_3QzK9xR2mH. Ödeme yöntemi: Kredi kartı.', userId: 'u_ahmet03' },
  { id: uid(), timestamp: now(12), level: 'info', category: 'auth', message: 'Oturum zaman aşımı: fatma.sahin@hacettepe.edu.tr', details: '60 dakika hareketsizlik. Oturum güvenli şekilde sonlandırıldı.', userId: 'u_fatma04' },
  { id: uid(), timestamp: now(15), level: 'info', category: 'system', message: 'Veritabanı bağlantısı yenilendi', details: 'Supabase bağlantı havuzu yenilendi. Aktif bağlantı sayısı: 12/50.' },
  { id: uid(), timestamp: now(20), level: 'error', category: 'ai', message: 'AI yanıt zaman aşımı: GPT-4o isteği başarısız', details: 'Hata kodu: TIMEOUT_30S. Kullanıcı: zeynep.koc@medasi.com.tr. Otomatik yeniden deneniyor.', userId: 'u_zeynep05' },
  { id: uid(), timestamp: now(25), level: 'success', category: 'user', message: 'Kullanıcı profili güncellendi: ali.celik@ankara.edu.tr', userId: 'u_ali06' },
  { id: uid(), timestamp: now(30), level: 'info', category: 'system', message: 'Otomatik yedekleme tamamlandı', details: 'Yedekleme boyutu: 2.3 GB. Süre: 4 dakika 12 saniye. Hedef: AWS S3 eu-central-1.' },
  { id: uid(), timestamp: now(45), level: 'warn', category: 'payment', message: 'Ödeme başarısız: selin.ozturk@gmail.com — İptal', details: 'Hata: Kart bakiyesi yetersiz. Kullanıcıya e-posta bildirim gönderildi.', userId: 'u_selin07' },
  { id: uid(), timestamp: now(60), level: 'success', category: 'auth', message: 'Admin girişi: admin@medasi.com.tr', details: 'IP: 192.168.1.1. Tarayıcı: Chrome 123. 2FA başarılı.' },
  { id: uid(), timestamp: now(90), level: 'error', category: 'system', message: 'E-posta gönderim hatası: SMTP bağlantısı reddedildi', details: 'Alıcı: 3 kullanıcı. Hata: Connection refused (port 587). Yeniden deneme kuyruğuna eklendi.' },
  { id: uid(), timestamp: now(120), level: 'info', category: 'user', message: 'Toplu kullanıcı içe aktarımı başlatıldı: 47 kayıt', details: 'Kaynak: CSV yükleme. Admin: admin@medasi.com.tr. İşlem ID: bulk_9XkL2.' },
  { id: uid(), timestamp: now(150), level: 'success', category: 'payment', message: 'Paket yükseltmesi: can.arslan@gmail.com — Öğrenci → Pro', details: 'Fark ödemesi: 210₺. İşlem başarıyla tamamlandı.', userId: 'u_can08' },
  { id: uid(), timestamp: now(180), level: 'warn', category: 'user', message: 'Şüpheli giriş denemesi: 5 başarısız giriş — nur.kaya@hotmail.com', details: 'IP: 185.220.101.45. Hesap geçici olarak kilitlendi (15 dk).', userId: 'u_nur09' },
  { id: uid(), timestamp: now(240), level: 'info', category: 'ai', message: 'AI model güncellemesi: GPT-4o-mini → GPT-4o geçişi', details: 'Pro ve Kurumsal paket kullanıcılarına uygulandı. Etkilenen kullanıcı: 342.' },
  { id: uid(), timestamp: now(300), level: 'success', category: 'system', message: 'SSL sertifikası yenilendi: medasi.com.tr', details: 'Geçerlilik: 2026-04-07 → 2027-04-07. Sağlayıcı: Let\'s Encrypt.' },
  { id: uid(), timestamp: now(360), level: 'info', category: 'auth', message: '12 kullanıcı için şifre sıfırlama e-postası gönderildi', details: 'Toplu işlem admin panelinden başlatıldı.' },
  { id: uid(), timestamp: now(480), level: 'error', category: 'payment', message: 'Stripe webhook doğrulama hatası', details: 'Olay: payment.succeeded. İmza uyuşmazlığı. İşlem manuel incelemeye alındı.' },
  { id: uid(), timestamp: now(600), level: 'success', category: 'user', message: 'Kullanıcı hesabı silindi: test.user@example.com (KVKK talebi)', details: 'Silme talebi: #1847. Tüm kişisel veriler temizlendi. Onay e-postası gönderildi.' },
  { id: uid(), timestamp: now(720), level: 'info', category: 'system', message: 'Platform v1.0.0 dağıtımı tamamlandı', details: 'Dağıtım süresi: 2 dakika 34 saniye. Sıfır kesinti. Vercel Edge Network üzerinden.' },
]

function generateMockLog(): LogEntry {
  const levels: LogLevel[] = ['info', 'success', 'warn', 'error']
  const categories: LogCategory[] = ['auth', 'user', 'ai', 'system', 'payment']
  const messages: Record<LogCategory, string[]> = {
    auth: [
      'Yeni kullanıcı oturumu açıldı',
      'Oturum sonlandırıldı (zaman aşımı)',
      'Şifre sıfırlama isteği alındı',
      '2FA doğrulaması başarılı',
    ],
    user: [
      'Profil bilgileri güncellendi',
      'Avatar yükleme tamamlandı',
      'Bildirim tercihleri değiştirildi',
      'Abonelik iptal edildi',
    ],
    ai: [
      'Yeni AI oturumu başlatıldı',
      'Vaka simülasyonu tamamlandı',
      'AI sorgu kotası %80 doldu',
      'Tanı asistanı kullanıldı',
    ],
    system: [
      'Önbellek temizlendi',
      'Cron görevi tamamlandı',
      'Yük dengeleme yeniden yapılandırıldı',
      'Log rotasyonu gerçekleştirildi',
    ],
    payment: [
      'Ödeme işlemi başlatıldı',
      'Fatura oluşturuldu',
      'Abonelik yenilendi',
      'Para iadesi talep edildi',
    ],
  }

  const level = levels[Math.floor(Math.random() * levels.length)]
  const category = categories[Math.floor(Math.random() * categories.length)]
  const msgs = messages[category]
  const message = msgs[Math.floor(Math.random() * msgs.length)]

  return {
    id: uid(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
  }
}

const LEVEL_COLORS: Record<LogLevel, { bg: string; text: string; label: string }> = {
  info: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', label: 'Info' },
  warn: { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', label: 'Warn' },
  error: { bg: 'rgba(239,68,68,0.15)', text: '#F87171', label: 'Error' },
  success: { bg: 'rgba(16,185,129,0.15)', text: '#34D399', label: 'Başarı' },
}

const CATEGORY_LABELS: Record<LogCategory, string> = {
  auth: 'Auth',
  user: 'Kullanıcı',
  ai: 'AI',
  system: 'Sistem',
  payment: 'Ödeme',
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function inDateRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true
  const d = new Date(iso).getTime()
  const now = Date.now()
  if (range === 'today') return d > now - 86_400_000
  if (range === '7d') return d > now - 7 * 86_400_000
  if (range === '30d') return d > now - 30 * 86_400_000
  return true
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [mounted, setMounted] = useState(false)
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as LogEntry[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed)
          return
        }
      }
    } catch {
      // ignore
    }
    setLogs(SEED_LOGS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LOGS))
  }, [])

  const persistLogs = useCallback((updated: LogEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        setLogs((prev) => {
          const entry = generateMockLog()
          const updated = [entry, ...prev].slice(0, 500)
          persistLogs(updated)
          return updated
        })
      }, 5000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, mounted, persistLogs])

  function handleClear() {
    const confirmed = window.confirm('Tüm günlük kayıtları silinecek. Emin misiniz?')
    if (!confirmed) return
    setLogs([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    toast('Günlük temizlendi.', { icon: '🗑️' })
  }

  function handleExport() {
    const lines = filteredLogs.map(
      (l) =>
        `[${l.timestamp}] [${l.level.toUpperCase().padEnd(7)}] [${l.category.padEnd(7)}] ${l.message}${l.details ? '\n  → ' + l.details : ''}`
    )
    const content = lines.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `medasi-logs-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filteredLogs.length} kayıt dışa aktarıldı.`)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredLogs = logs.filter((l) => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false
    if (categoryFilter !== 'all' && l.category !== categoryFilter) return false
    if (!inDateRange(l.timestamp, dateRange)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.message.toLowerCase().includes(q) && !(l.details?.toLowerCase().includes(q)) && !(l.userId?.toLowerCase().includes(q))) return false
    }
    return true
  })

  const stats: Record<LogLevel, number> = { info: 0, warn: 0, error: 0, success: 0 }
  for (const l of logs) stats[l.level]++

  if (!mounted) return null

  return (
    <div className="space-y-5 max-w-screen-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Aktivite Günlüğü
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {logs.length.toLocaleString('tr-TR')} toplam kayıt
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} />
            Dışa Aktar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 size={14} />
            Günlüğü Temizle
          </Button>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.entries(stats) as [LogLevel, number][]).map(([level, count]) => {
          const col = LEVEL_COLORS[level]
          return (
            <button
              key={level}
              onClick={() => setLevelFilter((prev) => (prev === level ? 'all' : level))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: levelFilter === level ? col.bg : 'var(--color-surface-elevated)',
                color: col.text,
                border: `1px solid ${levelFilter === level ? col.text + '60' : 'var(--color-border)'}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: col.text }}
              />
              {col.label}
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: col.bg,
                  color: col.text,
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
        <div
          className="ml-auto flex items-center gap-2 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw
            size={12}
            className={autoRefresh ? 'animate-spin' : ''}
            style={{ color: autoRefresh ? 'var(--color-primary)' : undefined }}
          />
          <span>Otomatik Yenileme</span>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
            style={{
              backgroundColor: autoRefresh
                ? 'var(--color-primary)'
                : 'var(--color-border)',
            }}
          >
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              style={{ transform: autoRefresh ? 'translateX(18px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {/* Level filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'info', 'warn', 'error', 'success'] as const).map((lv) => (
              <button
                key={lv}
                onClick={() => setLevelFilter(lv)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150"
                style={{
                  backgroundColor:
                    levelFilter === lv
                      ? lv === 'all'
                        ? 'var(--color-primary)'
                        : LEVEL_COLORS[lv].bg
                      : 'var(--color-surface-elevated)',
                  color:
                    levelFilter === lv
                      ? lv === 'all'
                        ? '#000'
                        : LEVEL_COLORS[lv].text
                      : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {lv === 'all' ? 'Tümü' : LEVEL_COLORS[lv].label}
              </button>
            ))}
          </div>

          <div
            className="w-px h-5 shrink-0"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'auth', 'user', 'ai', 'system', 'payment'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor:
                    categoryFilter === cat
                      ? 'var(--color-surface-elevated)'
                      : 'transparent',
                  color:
                    categoryFilter === cat
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                  border:
                    categoryFilter === cat
                      ? '1px solid var(--color-primary)'
                      : '1px solid transparent',
                }}
              >
                {cat === 'all' ? 'Tümü' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div
            className="w-px h-5 shrink-0"
            style={{ backgroundColor: 'var(--color-border)' }}
          />

          {/* Date range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { value: 'today', label: 'Bugün' },
              { value: '7d', label: 'Son 7 Gün' },
              { value: '30d', label: 'Son 30 Gün' },
              { value: 'all', label: 'Tümü' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor:
                    dateRange === value ? 'var(--color-surface-elevated)' : 'transparent',
                  color:
                    dateRange === value
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                  border:
                    dateRange === value
                      ? '1px solid var(--color-primary)'
                      : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="max-w-sm">
          <Input
            placeholder="Mesaj veya kullanıcı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs px-1" style={{ color: 'var(--color-text-disabled)' }}>
        {filteredLogs.length.toLocaleString('tr-TR')} kayıt gösteriliyor
      </p>

      {/* Log feed */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            className="py-16 text-center text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Filtreye uyan kayıt bulunamadı.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filteredLogs.map((log) => {
              const col = LEVEL_COLORS[log.level]
              const isExpanded = expanded.has(log.id)
              return (
                <div
                  key={log.id}
                  className="px-4 py-3 transition-colors duration-100"
                  style={{ borderColor: 'var(--color-border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-surface-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Timestamp */}
                    <span
                      className="text-[11px] font-mono shrink-0 pt-0.5 tabular-nums"
                      style={{ color: 'var(--color-text-disabled)', minWidth: '120px' }}
                    >
                      {formatTimestamp(log.timestamp)}
                    </span>

                    {/* Level badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
                      style={{
                        backgroundColor: col.bg,
                        color: col.text,
                        minWidth: '50px',
                        textAlign: 'center',
                      }}
                    >
                      {col.label}
                    </span>

                    {/* Category badge */}
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium shrink-0"
                      style={{
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        minWidth: '56px',
                        textAlign: 'center',
                      }}
                    >
                      {CATEGORY_LABELS[log.category]}
                    </span>

                    {/* Message + expand */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm leading-snug"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {log.message}
                          {log.userId && (
                            <span
                              className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--color-background)',
                                color: 'var(--color-text-disabled)',
                              }}
                            >
                              {log.userId}
                            </span>
                          )}
                        </p>
                        {log.details && (
                          <button
                            onClick={() => toggleExpanded(log.id)}
                            className="shrink-0 p-0.5 rounded transition-colors"
                            style={{ color: 'var(--color-text-disabled)' }}
                            title={isExpanded ? 'Gizle' : 'Detayları göster'}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </div>
                      {isExpanded && log.details && (
                        <div
                          className="mt-2 px-3 py-2 rounded-md text-xs font-mono leading-relaxed"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-secondary)',
                            borderLeft: `2px solid ${col.text}`,
                          }}
                        >
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
