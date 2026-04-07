'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import jsPDF from 'jspdf'
import { FileText, Search, Filter, Plus, Edit, Trash2, Loader2, Download, Printer } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { toast } from 'react-hot-toast'
import { noteSchema, type NoteInput } from '@/lib/schemas/clinic/shared'

interface NoteItem {
  id: string
  patientId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface NoteEditorProps {
  patientId: string
}

export function NoteEditor({ patientId }: NoteEditorProps) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NoteItem[]>([])
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema) as any,
    defaultValues: {
      patientId,
      title: '',
      content: '',
      tags: [],
    },
  })
  const [tagsText, setTagsText] = useState('')
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clinic/notes')
      const j = await res.json()
      setItems((j?.data || []).filter((n: NoteItem) => n.patientId === patientId))
    } catch {
      setError('Bağlantı hatası'); toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    reset({ patientId, title: '', content: '', tags: [] })
    setTagsText('')
    setEditId(null)
  }

  const submit = async (values: NoteInput) => {
    setError('')
    const payload = {
      ...values,
      id: editId || undefined,
      tags: tagsText.split(',').map((x) => x.trim()).filter(Boolean),
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clinic/notes', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error || 'Kayıt başarısız'); toast.error(j?.error || 'Kayıt başarısız')
        return
      }
      toast.success(editId ? 'Not güncellendi' : 'Not kaydedildi')
      resetForm()
      await load()
    } catch {
      setError('Bağlantı hatası'); toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    const ok = window.confirm('Notu silmek istediğine emin misin?')
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clinic/notes?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error || 'Silme başarısız'); toast.error(j?.error || 'Silme başarısız')
        return
      }
      await load()
    } catch {
      setError('Bağlantı hatası'); toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  const doExport = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notes-${patientId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => {
    return items.filter((n) => {
      const q = search.toLowerCase()
      const searchOk = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.join(' ').toLowerCase().includes(q)
      const tagOk = !filterTag || n.tags.includes(filterTag)
      return searchOk && tagOk
    })
  }, [items, search, filterTag])

  const allTags = useMemo(() => Array.from(new Set(items.flatMap((n) => n.tags))), [items])

  return (
    <Card variant="bordered" className="rounded-xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[var(--color-primary)]" />
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Not Editörü</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-11" onClick={() => void load()}><Plus size={16} />Yenile</Button>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => {
              const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `notes-${patientId}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
          ><Download size={16} />JSON</Button>
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => {
              const doc = new jsPDF()
              doc.setFontSize(14)
              doc.text('Hasta Notları', 14, 16)
              let y = 26
              items.forEach((n, i) => {
                doc.setFontSize(11)
                doc.text(`${i + 1}. ${n.title}`, 14, y)
                y += 7
                doc.text(n.content.slice(0, 180), 16, y, { maxWidth: 170 })
                y += 12
              })
              doc.save(`notes-${patientId}.pdf`)
            }}
          ><Printer size={16} />PDF</Button>
        </div>
      </div>

      <form className="grid grid-cols-1 gap-4" onSubmit={handleSubmit(submit)}>
        <Input label="Başlık" className="h-11" error={errors.title?.message} {...register('title')} />
        <textarea
          className="min-h-[140px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Not içeriği"
          {...register('content')}
        />
        {errors.content?.message ? <p className="text-xs text-[var(--color-destructive)]">{errors.content.message}</p> : null}
        <Input
          label="Etiketler (virgülle)"
          value={tagsText}
          onChange={(e) => {
            setTagsText(e.target.value)
            setValue('tags', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))
          }}
          className="h-11"
        />

        {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          {editId ? <Button type="button" variant="ghost" className="h-11" onClick={resetForm}>İptal</Button> : null}
          <Button type="submit" className="h-11 rounded-xl" disabled={loading || isSubmitting}>
            {(loading || isSubmitting) ? <Loader2 size={16} className="animate-spin" /> : null}
            {editId ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </form>


      <div className="mt-8 border-t border-[var(--color-border)] pt-6">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-10" />
          </div>
          <div className="relative">
            <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <select
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-3 text-[var(--color-text-primary)]"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">Tüm etiketler</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {!filtered.length ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
            Kayıt bulunamadı.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div key={n.id} className="rounded-xl border border-[var(--color-border)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--color-text-primary)]">{n.title}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="h-9"
                      onClick={() => {
                        setEditId(n.id)
                        setValue('title', n.title)
                        setValue('content', n.content)
                        setValue('tags', n.tags)
                        setTagsText(n.tags.join(', '))
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button variant="ghost" className="h-9" onClick={() => void remove(n.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{n.content}</p>
                {n.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {n.tags.map((t) => (
                      <span key={t} className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
