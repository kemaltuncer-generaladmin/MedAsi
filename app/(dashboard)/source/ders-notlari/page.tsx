'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BookOpen, Plus, Search, X, Download, Edit2, Trash2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_ders_notlari_v1'

type Category = 'Anatomi' | 'Fizyoloji' | 'Farmakoloji' | 'Patoloji' | 'Mikrobiyoloji' | 'Dahiliye' | 'Cerrahi' | 'Pediatri' | 'Diğer'

const CATEGORIES: Category[] = ['Anatomi', 'Fizyoloji', 'Farmakoloji', 'Patoloji', 'Mikrobiyoloji', 'Dahiliye', 'Cerrahi', 'Pediatri', 'Diğer']

const CATEGORY_COLORS: Record<Category, string> = {
  Anatomi: 'secondary',
  Fizyoloji: 'success',
  Farmakoloji: 'warning',
  Patoloji: 'destructive',
  Mikrobiyoloji: 'default',
  Dahiliye: 'success',
  Cerrahi: 'warning',
  Pediatri: 'default',
  Diğer: 'secondary',
}

interface Note {
  id: string
  title: string
  content: string
  category: Category
  tags: string[]
  date: string
  updatedAt: string
}

function load(): Note[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function save(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

const emptyForm = (): Omit<Note, 'id' | 'date' | 'updatedAt'> => ({
  title: '',
  content: '',
  category: 'Diğer',
  tags: [],
})

export default function DersNotlariPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewNote, setViewNote] = useState<Note | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [tagInput, setTagInput] = useState('')

  useEffect(() => { setNotes(load()) }, [])

  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || n.category === categoryFilter
    return matchSearch && matchCat
  })

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setTagInput('')
    setShowModal(true)
  }

  function openEdit(note: Note) {
    setEditingId(note.id)
    setForm({ title: note.title, content: note.content, category: note.category, tags: [...note.tags] })
    setTagInput('')
    setShowModal(true)
    setViewNote(null)
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error('Başlık zorunludur'); return }
    if (!form.content.trim()) { toast.error('İçerik zorunludur'); return }

    const now = new Date().toLocaleDateString('tr-TR')
    if (editingId) {
      const updated = notes.map(n => n.id === editingId ? { ...n, ...form, updatedAt: now } : n)
      setNotes(updated)
      save(updated)
      toast.success('Not güncellendi')
    } else {
      const newNote: Note = { id: Date.now().toString(), ...form, date: now, updatedAt: now }
      const updated = [newNote, ...notes]
      setNotes(updated)
      save(updated)
      toast.success('Not eklendi')
    }
    setShowModal(false)
  }

  function handleDelete(id: string) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    save(updated)
    setViewNote(null)
    toast.success('Not silindi')
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    if (!form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  function exportNote(note: Note) {
    const text = `${note.title}\nKategori: ${note.category}\nTarih: ${note.date}\nEtiketler: ${note.tags.join(', ')}\n\n${note.content}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Not dışa aktarıldı')
  }

  const inputCls = 'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors'

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <BookOpen size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Ders Notları</h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">Kişisel ders notlarınızı oluşturun ve yönetin</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={15} />
          Not Ekle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Başlık veya içerikte ara..." className={`${inputCls} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === c ? 'bg-[var(--color-primary)] text-black' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
              {c === 'all' ? 'Tümü' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Not', value: notes.length },
          { label: 'Bu Filtrede', value: filtered.length },
          { label: 'Kategori', value: new Set(notes.map(n => n.category)).size },
          { label: 'Etiket', value: new Set(notes.flatMap(n => n.tags)).size },
        ].map(s => (
          <Card key={s.label} variant="bordered" className="p-4">
            <p className="text-2xl font-bold text-[var(--color-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <BookOpen size={32} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-primary)] font-medium">
            {notes.length === 0 ? 'Henüz not eklenmedi' : 'Sonuç bulunamadı'}
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {notes.length === 0 ? 'İlk notunuzu ekleyerek başlayın' : 'Arama veya filtre kriterlerini değiştirin'}
          </p>
          {notes.length === 0 && (
            <Button variant="primary" size="sm" onClick={openAdd}><Plus size={14} />İlk Notu Ekle</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(note => (
            <div key={note.id} onClick={() => setViewNote(note)} className="cursor-pointer">
            <Card variant="bordered" className="p-4 hover:border-[var(--color-primary)]/30 transition-colors flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--color-text-primary)] leading-tight line-clamp-2 flex-1">{note.title}</p>
                <Badge variant={CATEGORY_COLORS[note.category] as 'default' | 'success' | 'warning' | 'destructive' | 'secondary'} className="text-xs shrink-0">{note.category}</Badge>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">{note.content}</p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs">
                      <Tag size={9} />{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)]">{note.updatedAt}</p>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => exportNote(note)} className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"><Download size={13} /></button>
                  <button onClick={() => openEdit(note)} className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewNote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl w-full max-w-2xl border border-[var(--color-border)] flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between p-6 border-b border-[var(--color-border)]">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={CATEGORY_COLORS[viewNote.category] as 'default' | 'success' | 'warning' | 'destructive' | 'secondary'}>{viewNote.category}</Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">{viewNote.updatedAt}</span>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{viewNote.title}</h2>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => exportNote(viewNote)} className="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"><Download size={16} /></button>
                <button onClick={() => openEdit(viewNote)} className="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(viewNote.id)} className="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"><Trash2 size={16} /></button>
                <button onClick={() => setViewNote(null)} className="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"><X size={16} /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed text-sm">{viewNote.content}</p>
              {viewNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-[var(--color-border)]">
                  {viewNote.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs">
                      <Tag size={9} />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-lg border border-[var(--color-border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{editingId ? 'Notu Düzenle' : 'Yeni Not'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Başlık *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Not başlığı" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Kategori</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">İçerik *</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Not içeriği..." rows={8} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Etiketler</label>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Etiket ekle..." className={`${inputCls} flex-1`} />
                <Button variant="secondary" size="sm" onClick={addTag}>Ekle</Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs cursor-pointer" onClick={() => removeTag(tag)}>
                      <Tag size={9} />{tag}<X size={9} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
              <Button variant="primary" onClick={handleSave} className="flex-1">{editingId ? 'Güncelle' : 'Kaydet'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
