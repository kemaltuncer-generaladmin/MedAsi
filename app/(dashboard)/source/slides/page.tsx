'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Presentation, Plus, Search, X, Download, Eye, Calendar, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

type Slide = {
  id: string
  title: string
  subject: string
  pages: number
  date: string
  tags: string[]
  color: string
}

const SUBJECTS = ['Dahiliye', 'Kardiyoloji', 'Nöroloji', 'Pediatri', 'Cerrahi', 'Radyoloji', 'Patoloji', 'Farmakoloji', 'Diğer']
const COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-destructive)']

const DEMO_SLIDES: Slide[] = [
  { id: '1', title: 'Akut Koroner Sendrom Yönetimi', subject: 'Kardiyoloji', pages: 42, date: '2024-01-15', tags: ['AKS', 'STEMI', 'Acil'], color: 'var(--color-destructive)' },
  { id: '2', title: 'Diyabet Tedavi Protokolleri 2024', subject: 'Dahiliye', pages: 58, date: '2024-02-03', tags: ['DM', 'İnsülin', 'Oral Antidiabetik'], color: 'var(--color-primary)' },
  { id: '3', title: 'İnme: Tanı ve Tedavi', subject: 'Nöroloji', pages: 35, date: '2024-02-20', tags: ['İnme', 'tPA', 'Trombektomi'], color: 'var(--color-warning)' },
]

export default function SlidesPage() {
  const [slides, setSlides] = useState<Slide[]>(DEMO_SLIDES)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [activeSubject, setActiveSubject] = useState('Tümü')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Dahiliye')
  const [pages, setPages] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  function addSlide() {
    if (!title.trim()) { toast.error('Başlık zorunludur'); return }
    const newSlide: Slide = {
      id: Date.now().toString(),
      title,
      subject,
      pages: parseInt(pages) || 0,
      date: new Date().toISOString().split('T')[0],
      tags,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
    setSlides(prev => [newSlide, ...prev])
    setTitle(''); setSubject('Dahiliye'); setPages(''); setTags([]); setTagInput('')
    setShowForm(false)
    toast.success('Slayt eklendi')
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput('') }
  }

  const allSubjects = ['Tümü', ...Array.from(new Set(slides.map(s => s.subject)))]
  const filtered = slides.filter(s =>
    (activeSubject === 'Tümü' || s.subject === activeSubject) &&
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Presentation size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Slaytlar</h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">Ders ve klinik slaytlarınızı organize edin</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={15} />Slayt Ekle
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Slayt ara..." className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allSubjects.map(s => (
            <button key={s} onClick={() => setActiveSubject(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSubject === s ? 'bg-[var(--color-primary)] text-black' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Presentation size={32} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-primary)] font-medium">Slayt bulunamadı</p>
          <p className="text-[var(--color-text-secondary)] text-sm">Slaytlarınızı ekleyerek kütüphanenizi oluşturun</p>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}><Plus size={14} />İlk Slaytı Ekle</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(slide => (
            <Card key={slide.id} variant="bordered" className="p-0 overflow-hidden hover:border-[var(--color-primary)]/30 transition-colors group">
              <div className="h-1.5 w-full" style={{ backgroundColor: slide.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2">{slide.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{slide.subject}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-xs">{slide.pages} sayfa</Badge>
                </div>
                {slide.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {slide.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                        <Tag size={9} />{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <Calendar size={11} />{new Date(slide.date).toLocaleDateString('tr-TR')}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                      <Eye size={13} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                      <Download size={13} />
                    </button>
                    <button onClick={() => setSlides(prev => prev.filter(s => s.id !== slide.id))} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Slayt Ekle</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Başlık</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Slayt başlığı" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Ders / Konu</label>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]">
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Sayfa Sayısı</label>
                <input type="number" value={pages} onChange={e => setPages(e.target.value)} placeholder="Ör: 40" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Etiketler</label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Etiket ekle (Enter)" className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]" />
                  <Button variant="ghost" size="sm" onClick={addTag}>Ekle</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                        {t}<button onClick={() => setTags(prev => prev.filter(x => x !== t))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">İptal</Button>
                <Button variant="primary" onClick={addSlide} className="flex-1">Ekle</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
