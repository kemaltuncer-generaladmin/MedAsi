'use client'

import { useState } from 'react'
import { Beaker, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button, Card, Input } from '@/components/ui'
import { labRequestSchema } from '@/lib/schemas/clinic/shared'

interface LabRequestFormProps {
  patientId: string
  onSaved?: () => void
}

export function LabRequestForm({ patientId, onSaved }: LabRequestFormProps) {
  const [tests, setTests] = useState<string[]>([''])
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateTest = (index: number, value: string) => {
    setTests((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  const submit = async () => {
    setError('')
    const payload = { patientId, tests: tests.filter(Boolean), note, priority }
    const parsed = labRequestSchema.safeParse(payload)
    if (!parsed.success) {
      const m = parsed.error.flatten().formErrors[0] || 'Form hatası'
      setError(m)
      toast.error(m)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clinic/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const m = j?.error || 'Kayıt hatası'
        setError(m)
        toast.error(m)
        return
      }
      toast.success('Lab kaydı oluşturuldu')
      setTests([''])
      setNote('')
      setPriority('normal')
      onSaved?.()
    } catch {
      setError('Bağlantı hatası')
      toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Beaker size={18} className="text-[var(--color-primary)]" />
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Laboratuvar İsteği</h3>
      </div>

      <div className="space-y-3">
        {tests.map((test, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Test adı"
              value={test}
              onChange={(e) => updateTest(i, e.target.value)}
              className="h-11"
            />
            <Button variant="ghost" className="h-11" onClick={() => setTests((prev) => prev.filter((_, idx) => idx !== i))} disabled={tests.length === 1}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button variant="ghost" className="h-11" onClick={() => setTests((prev) => [...prev, ''])}>
          <Plus size={16} />
          Test Ekle
        </Button>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">Öncelik</label>
        <select
          className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[var(--color-text-primary)]"
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
        >
          <option value="low">Düşük</option>
          <option value="normal">Normal</option>
          <option value="high">Yüksek</option>
        </select>
      </div>

      <div className="mt-4">
        <Input placeholder="Not" value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--color-destructive)]">{error}</p> : null}

      <div className="mt-6 flex justify-end">
        <Button className="h-11 rounded-xl" onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Kaydet
        </Button>
      </div>
    </Card>
  )
}
