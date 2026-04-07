'use client'

import { useState } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FlaskConical, Plus, Search, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

type LabCategory = 'hemogram' | 'biyokimya' | 'koagulasyon' | 'goruntuleme'
type Result = { id: string; test: string; value: string; unit: string; normal: string; status: 'normal' | 'high' | 'low' | 'critical'; date: string; category: LabCategory }

const REFERENCE: Record<string, { unit: string; normal: string; low: number; high: number }> = {
  'Hemoglobin': { unit: 'g/dL', normal: '12-16 (K), 13.5-17.5 (E)', low: 12, high: 17.5 },
  'Hematokrit': { unit: '%', normal: '36-48 (K), 41-53 (E)', low: 36, high: 53 },
  'Lökosit': { unit: '10³/µL', normal: '4.5-11.0', low: 4.5, high: 11.0 },
  'Trombosit': { unit: '10³/µL', normal: '150-400', low: 150, high: 400 },
  'Glukoz (AC)': { unit: 'mg/dL', normal: '70-100', low: 70, high: 100 },
  'Kreatinin': { unit: 'mg/dL', normal: '0.6-1.2', low: 0.6, high: 1.2 },
  'Üre': { unit: 'mg/dL', normal: '7-25', low: 7, high: 25 },
  'Na': { unit: 'mEq/L', normal: '136-145', low: 136, high: 145 },
  'K': { unit: 'mEq/L', normal: '3.5-5.0', low: 3.5, high: 5.0 },
  'AST': { unit: 'U/L', normal: '10-40', low: 10, high: 40 },
  'ALT': { unit: 'U/L', normal: '7-56', low: 7, high: 56 },
  'TSH': { unit: 'mIU/L', normal: '0.4-4.0', low: 0.4, high: 4.0 },
  'Troponin I': { unit: 'ng/mL', normal: '<0.04', low: 0, high: 0.04 },
  'CRP': { unit: 'mg/L', normal: '<5', low: 0, high: 5 },
  'PT/INR': { unit: '', normal: '0.8-1.2', low: 0.8, high: 1.2 },
  'aPTT': { unit: 'sn', normal: '25-35', low: 25, high: 35 },
}

const LABS = Object.keys(REFERENCE)

export default function LabViewingPage() {
  const [results, setResults] = useState<Result[]>([])
  const [showForm, setShowForm] = useState(false)
  const [testName, setTestName] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState<LabCategory>('biyokimya')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  function addResult() {
    if (!testName || !value) { toast.error('Test adı ve değer zorunludur'); return }
    const ref = REFERENCE[testName]
    const num = parseFloat(value)
    let status: Result['status'] = 'normal'
    if (ref) {
      if (num < ref.low * 0.8 || num > ref.high * 1.5) status = 'critical'
      else if (num < ref.low) status = 'low'
      else if (num > ref.high) status = 'high'
    }
    const newResult: Result = {
      id: Date.now().toString(),
      test: testName,
      value,
      unit: ref?.unit ?? '',
      normal: ref?.normal ?? '',
      status,
      date: new Date().toLocaleDateString('tr-TR'),
      category,
    }
    setResults(prev => [newResult, ...prev])
    setTestName('')
    setValue('')
    setShowForm(false)
    toast.success('Sonuç eklendi')
  }

  const filtered = results.filter(r =>
    (activeFilter === 'all' || r.status === activeFilter || r.category === activeFilter) &&
    r.test.toLowerCase().includes(search.toLowerCase())
  )

  const statusIcon = { normal: Minus, high: TrendingUp, low: TrendingDown, critical: TrendingUp }
  const statusColor = { normal: 'text-[var(--color-success)]', high: 'text-[var(--color-warning)]', low: 'text-[var(--color-primary)]', critical: 'text-[var(--color-destructive)]' }
  const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = { normal: 'success', high: 'warning', low: 'default', critical: 'destructive' }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <FlaskConical size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Lab & Görüntüleme Takip</h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">Laboratuvar ve görüntüleme sonuçlarını takip edin</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Sonuç Ekle
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Test ara..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
        </div>
        {['all', 'critical', 'high', 'low', 'normal'].map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFilter === f ? 'bg-[var(--color-primary)] text-black' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
            {f === 'all' ? 'Tümü' : f === 'critical' ? 'Kritik' : f === 'high' ? 'Yüksek' : f === 'low' ? 'Düşük' : 'Normal'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FlaskConical size={32} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-primary)] font-medium">Sonuç bulunamadı</p>
          <p className="text-[var(--color-text-secondary)] text-sm">Laboratuvar sonuçlarınızı ekleyerek takibe başlayın</p>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}><Plus size={14} />İlk Sonucu Ekle</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(r => {
            const SIcon = statusIcon[r.status]
            return (
              <Card key={r.id} variant="bordered" className="p-4 hover:border-[var(--color-primary)]/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-[var(--color-text-primary)]">{r.test}</p>
                  <Badge variant={statusVariant[r.status]} className="text-xs shrink-0">{r.status === 'critical' ? 'Kritik' : r.status === 'high' ? 'Yüksek' : r.status === 'low' ? 'Düşük' : 'Normal'}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <SIcon size={16} className={statusColor[r.status]} />
                  <span className={`text-2xl font-bold ${statusColor[r.status]}`}>{r.value}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">{r.unit}</span>
                </div>
                {r.normal && <p className="text-xs text-[var(--color-text-secondary)]">Ref: {r.normal}</p>}
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{r.date}</p>
              </Card>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Sonuç Ekle</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Test Adı</label>
                <select value={testName} onChange={e => setTestName(e.target.value)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]">
                  <option value="">Test seçin veya yazın</option>
                  {LABS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Değer</label>
                <input value={value} onChange={e => setValue(e.target.value)} placeholder="Sayısal değer" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Kategori</label>
                <select value={category} onChange={e => setCategory(e.target.value as LabCategory)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]">
                  <option value="hemogram">Hemogram</option>
                  <option value="biyokimya">Biyokimya</option>
                  <option value="koagulasyon">Koagülasyon</option>
                  <option value="goruntuleme">Görüntüleme</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">İptal</Button>
                <Button variant="primary" onClick={addResult} className="flex-1">Ekle</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
