'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { History, Search, Trash2, ChevronDown, ChevronRight, Zap, Clock, Filter, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const HISTORY_KEY = 'medasi_ai_history_v1'

interface AIEntry {
  id: string
  query: string
  response: string
  model: 'FAST' | 'EFFICIENT'
  timestamp: string
  tokens: number
  context: string
}

const SAMPLE_ENTRIES: AIEntry[] = [
  {
    id: 'demo_1',
    query: 'Akut miyokard enfarktüsünde ST elevasyonunun önemi ve ayırıcı tanı kriterleri nelerdir?',
    response: 'ST elevasyonu, miyokard hasarının erken göstergesidir. STEMI tanısı için iki veya daha fazla ardışık derivasyonda ≥1 mm ST elevasyonu gereklidir. V1-V4 derivasyonlarında elevasyon anterior MI, II, III, aVF derivasyonlarında ise inferior MI düşündürür. Ayırıcı tanıda perikarditis, Brugada sendromu ve sol ventrikül anevrizması göz önünde bulundurulmalıdır.',
    model: 'FAST',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    tokens: 342,
    context: 'EKG Değerlendirme',
  },
  {
    id: 'demo_2',
    query: 'Sepsis tanı kriterleri ve SOFA skoru hesaplama',
    response: 'Sepsis, enfeksiyona karşı disregüle konakçı yanıtından kaynaklanan hayatı tehdit eden organ disfonksiyonudur. SOFA skoru; solunum (PaO2/FiO2), koagülasyon (trombosit), karaciğer (bilirubin), kardiyovasküler, SSS (GCS) ve renal (kreatinin) parametrelerini değerlendirir.',
    model: 'EFFICIENT',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    tokens: 198,
    context: 'Klinik Karar',
  },
]

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} dakika önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  return `${days} gün önce`
}

export default function AIHistoryPage() {
  const [entries, setEntries] = useState<AIEntry[]>([])
  const [search, setSearch] = useState('')
  const [modelFilter, setModelFilter] = useState<'all' | 'FAST' | 'EFFICIENT'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AIEntry[]
        setEntries(parsed)
      } else {
        // Seed demo entries
        localStorage.setItem(HISTORY_KEY, JSON.stringify(SAMPLE_ENTRIES))
        setEntries(SAMPLE_ENTRIES)
      }
    } catch {
      setEntries(SAMPLE_ENTRIES)
    }
  }, [])

  function handleClear() {
    const confirmed = window.confirm('Tüm AI sorgu geçmişi silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?')
    if (!confirmed) return
    localStorage.removeItem(HISTORY_KEY)
    setEntries([])
    toast.success('Geçmiş temizlendi')
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  const filtered = entries.filter(e => {
    const matchModel = modelFilter === 'all' || e.model === modelFilter
    const matchSearch = e.query.toLowerCase().includes(search.toLowerCase()) || e.context.toLowerCase().includes(search.toLowerCase())
    return matchModel && matchSearch
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <History size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AI Sorgu Geçmişi</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">Önceki yapay zeka sorgularınızı görüntüleyin ve yönetin</p>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" className="border border-[var(--color-border)] shrink-0" onClick={handleClear}>
            <Trash2 size={14} />
            Geçmişi Temizle
          </Button>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sorgu veya bağlam ara..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-1">
          <Filter size={12} className="text-[var(--color-text-secondary)] ml-1" />
          {(['all', 'FAST', 'EFFICIENT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setModelFilter(f)}
              className={[
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                modelFilter === f
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {f === 'all' ? 'Tümü' : f}
            </button>
          ))}
        </div>
      </div>

      {/* İstatistikler */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card variant="bordered" className="p-3">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Toplam Sorgu</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{entries.length}</p>
          </Card>
          <Card variant="bordered" className="p-3">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">FAST Sorgu</p>
            <p className="text-xl font-bold text-[var(--color-primary)]">{entries.filter(e => e.model === 'FAST').length}</p>
          </Card>
          <Card variant="bordered" className="p-3">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">EFFICIENT Sorgu</p>
            <p className="text-xl font-bold" style={{ color: 'var(--color-warning)' }}>{entries.filter(e => e.model === 'EFFICIENT').length}</p>
          </Card>
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
            <MessageSquare size={24} className="text-[var(--color-text-secondary)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {entries.length === 0 ? 'Henüz AI sorgusu yapılmadı' : 'Sonuç bulunamadı'}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {entries.length === 0 ? 'AI özelliğini kullandıktan sonra sorgu geçmişiniz burada görünecek' : 'Farklı bir arama terimi deneyin'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <Card key={entry.id} variant="bordered" className="p-0 overflow-hidden hover:border-[var(--color-primary)]/30 transition-colors">
              <button
                className="w-full text-left p-4"
                onClick={() => toggleExpand(entry.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: entry.model === 'FAST' ? 'var(--color-primary)' : 'var(--color-warning)', opacity: 0.15 }}
                  />
                  <div className="absolute mt-0.5 ml-0.5 w-8 h-8 flex items-center justify-center">
                    <Zap size={14} style={{ color: entry.model === 'FAST' ? 'var(--color-primary)' : 'var(--color-warning)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate pr-8">
                      {entry.query.length > 80 ? entry.query.slice(0, 80) + '...' : entry.query}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <Badge
                        variant={entry.model === 'FAST' ? 'default' : 'warning'}
                        className="text-xs"
                      >
                        {entry.model}
                      </Badge>
                      <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Clock size={10} />
                        {formatRelative(entry.timestamp)}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{entry.tokens} token</span>
                      {entry.context && (
                        <Badge variant="secondary" className="text-xs">{entry.context}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {expanded === entry.id
                      ? <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
                      : <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
                    }
                  </div>
                </div>
              </button>

              {expanded === entry.id && (
                <div className="border-t border-[var(--color-border)] p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">Sorgu</p>
                    <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-surface-elevated)] rounded-lg p-3">{entry.query}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">Yanıt</p>
                    <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] rounded-lg p-3 leading-relaxed">{entry.response}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span>{new Date(entry.timestamp).toLocaleString('tr-TR')}</span>
                    <span>·</span>
                    <span>{entry.tokens} token kullanıldı</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
