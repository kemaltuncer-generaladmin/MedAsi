'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Layers, Plus, Play, X, ChevronRight, RotateCcw,
  BookOpen, Calendar, Pencil, Trash2, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'medasi_flashcards_v1'

interface Flashcard {
  id: string
  front: string
  back: string
  rating?: 'unknown' | 'hard' | 'known'
  lastStudied?: string
}

interface Deck {
  id: string
  name: string
  subject: string
  color: string
  cards: Flashcard[]
  createdAt: string
  lastStudied?: string
}

const DECK_COLORS = [
  '#06b6d4', '#6366f1', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
]

const SAMPLE_DECK: Deck = {
  id: 'sample_kardiyoloji',
  name: 'Kardiyoloji Terimler',
  subject: 'Kardiyoloji',
  color: '#ef4444',
  createdAt: new Date().toISOString(),
  cards: [
    {
      id: 'c1',
      front: 'Ejeksiyon Fraksiyonu (EF)',
      back: 'Her atımda ventriküldeki kanın pompalanan yüzdesi. Normal: %55-70. HFrEF: <%40'
    },
    {
      id: 'c2',
      front: 'Troponin T yükselme zamanı (MI\'da)',
      back: 'MI başlangıcından 3-4 saat sonra yükselir, 10-14 günde normale döner. Yüksek özgüllük ve duyarlılık.'
    },
    {
      id: 'c3',
      front: 'Killip Sınıflandırması',
      back: 'AMI\'de kalp yetmezliği sınıflaması:\nI: Raller yok\nII: Bazal raller\nIII: Akciğer ödemi\nIV: Kardiyojenik şok'
    },
    {
      id: 'c4',
      front: 'QT düzeltmesi (QTc) formülü',
      back: 'Bazett formülü: QTc = QT / √RR\nNormal: Erkek <440ms, Kadın <460ms\n>500ms → Torsades riski'
    },
    {
      id: 'c5',
      front: 'GRACE skoru',
      back: 'AKS\'de hastane içi ve 6 aylık mortalite riskini tahmin eden skor. 8 değişken: yaş, nabız, SKB, kreatinin, Killip, kardiyak arrest, ST deviasyonu, kardiyak enzimler.'
    }
  ]
}

export default function FlashcardPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [mode, setMode] = useState<'list' | 'deck' | 'study' | 'addDeck'>('list')
  const [showAddCard, setShowAddCard] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [studyIndex, setStudyIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([])
  const [sessionStats, setSessionStats] = useState({ known: 0, hard: 0, unknown: 0 })

  // Add deck form
  const [deckForm, setDeckForm] = useState({ name: '', subject: '', color: DECK_COLORS[0] })
  // Add card form
  const [cardForm, setCardForm] = useState({ front: '', back: '' })

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      setDecks(JSON.parse(raw))
    } else {
      setDecks([SAMPLE_DECK])
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_DECK]))
    }
  }, [])

  const saveDecks = useCallback((ds: Deck[]) => {
    setDecks(ds)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ds))
  }, [])

  function openDeck(deck: Deck) {
    setSelectedDeck(deck)
    setMode('deck')
  }

  function startStudy(deck: Deck) {
    if (deck.cards.length === 0) {
      toast.error('Bu deste boş. Önce kart ekleyin.')
      return
    }
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5)
    setStudyQueue(shuffled)
    setStudyIndex(0)
    setFlipped(false)
    setSessionStats({ known: 0, hard: 0, unknown: 0 })
    setSelectedDeck(deck)
    setMode('study')
  }

  function rateCard(rating: 'unknown' | 'hard' | 'known') {
    setSessionStats(s => ({ ...s, [rating]: s[rating] + 1 }))
    // Update card rating in deck
    const updatedDecks = decks.map(d => {
      if (d.id !== selectedDeck?.id) return d
      return {
        ...d,
        lastStudied: new Date().toISOString(),
        cards: d.cards.map(c =>
          c.id === studyQueue[studyIndex].id
            ? { ...c, rating, lastStudied: new Date().toISOString() }
            : c
        )
      }
    })
    saveDecks(updatedDecks)

    if (studyIndex >= studyQueue.length - 1) {
      const total = sessionStats.known + sessionStats.hard + sessionStats.unknown + 1
      const known = sessionStats.known + (rating === 'known' ? 1 : 0)
      toast.success(`Çalışma tamamlandı! ${known}/${total} kart bilindi.`)
      setMode('deck')
      return
    }
    setStudyIndex(i => i + 1)
    setFlipped(false)
  }

  function addDeck() {
    if (!deckForm.name.trim()) {
      toast.error('Deste adı gerekli.')
      return
    }
    const newDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: deckForm.name.trim(),
      subject: deckForm.subject.trim() || 'Genel',
      color: deckForm.color,
      cards: [],
      createdAt: new Date().toISOString()
    }
    saveDecks([...decks, newDeck])
    setDeckForm({ name: '', subject: '', color: DECK_COLORS[0] })
    setMode('list')
    toast.success('Deste oluşturuldu!')
  }

  function addCard() {
    if (!cardForm.front.trim() || !cardForm.back.trim()) {
      toast.error('Ön ve arka yüz zorunludur.')
      return
    }
    if (!selectedDeck) return
    const newCard: Flashcard = {
      id: `card_${Date.now()}`,
      front: cardForm.front.trim(),
      back: cardForm.back.trim()
    }
    const updatedDecks = decks.map(d =>
      d.id === selectedDeck.id
        ? { ...d, cards: [...d.cards, newCard] }
        : d
    )
    saveDecks(updatedDecks)
    setSelectedDeck({ ...selectedDeck, cards: [...selectedDeck.cards, newCard] })
    setCardForm({ front: '', back: '' })
    setShowAddCard(false)
    toast.success('Kart eklendi!')
  }

  function deleteDeck(id: string) {
    saveDecks(decks.filter(d => d.id !== id))
    setMode('list')
    toast.success('Deste silindi.')
  }

  function deleteCard(deckId: string, cardId: string) {
    const updatedDecks = decks.map(d =>
      d.id === deckId ? { ...d, cards: d.cards.filter(c => c.id !== cardId) } : d
    )
    saveDecks(updatedDecks)
    if (selectedDeck?.id === deckId) {
      setSelectedDeck({ ...selectedDeck, cards: selectedDeck.cards.filter(c => c.id !== cardId) })
    }
    toast.success('Kart silindi.')
  }

  const currentCard = studyQueue[studyIndex]

  // STUDY MODE
  if (mode === 'study' && currentCard && selectedDeck) {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: selectedDeck.color + '20' }}
            >
              <Layers size={20} style={{ color: selectedDeck.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{selectedDeck.name}</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Kart {studyIndex + 1} / {studyQueue.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('deck')}>
            <X size={15} /> Çıkış
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          {[
            { label: 'Bildim', count: sessionStats.known, color: 'var(--color-success)' },
            { label: 'Zorlandım', count: sessionStats.hard, color: 'var(--color-warning)' },
            { label: 'Bilmedim', count: sessionStats.unknown, color: 'var(--color-destructive)' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="w-full h-1.5 bg-[var(--color-surface-elevated)] rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((studyIndex + 1) / studyQueue.length) * 100}%`,
              background: selectedDeck.color
            }}
          />
        </div>

        {/* Flashcard */}
        <div
          className="cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped(f => !f)}
        >
          <div
            style={{
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.5s',
              transformStyle: 'preserve-3d',
              position: 'relative',
              minHeight: '220px'
            }}
          >
            {/* Front */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] p-8 flex flex-col items-center justify-center text-center"
            >
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-4">Ön Yüz — Tıkla ve çevir</p>
              <p className="text-xl font-bold text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">{currentCard.front}</p>
              <div
                className="mt-4 w-8 h-0.5 rounded"
                style={{ background: selectedDeck.color }}
              />
            </div>

            {/* Back */}
            <div
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: selectedDeck.color + '08',
                borderColor: selectedDeck.color + '40'
              }}
              className="absolute inset-0 rounded-xl border p-8 flex flex-col items-center justify-center text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: selectedDeck.color }}>Arka Yüz</p>
              <p className="text-base text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">{currentCard.back}</p>
            </div>
          </div>
        </div>

        {!flipped ? (
          <Button variant="secondary" onClick={() => setFlipped(true)} className="w-full">
            <RotateCcw size={15} /> Kartı Çevir
          </Button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => rateCard('unknown')}
              className="flex-1 py-3 rounded-lg border-2 border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)] text-sm font-semibold hover:bg-[var(--color-destructive)]/10 transition-all"
            >
              Bilmedim
            </button>
            <button
              onClick={() => rateCard('hard')}
              className="flex-1 py-3 rounded-lg border-2 border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-[var(--color-warning)] text-sm font-semibold hover:bg-[var(--color-warning)]/10 transition-all"
            >
              Zorlandım
            </button>
            <button
              onClick={() => rateCard('known')}
              className="flex-1 py-3 rounded-lg border-2 border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)] text-sm font-semibold hover:bg-[var(--color-success)]/10 transition-all"
            >
              Bildim
            </button>
          </div>
        )}
      </div>
    )
  }

  // ADD DECK MODE
  if (mode === 'addDeck') {
    return (
      <div className="flex flex-col gap-5 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Plus size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Yeni Deste</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X size={15} /> İptal
          </Button>
        </div>

        <Card variant="elevated" className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Deste Adı</label>
            <input
              type="text"
              value={deckForm.name}
              onChange={e => setDeckForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Örn. Kardiyoloji Terimler"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Konu</label>
            <input
              type="text"
              value={deckForm.subject}
              onChange={e => setDeckForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Örn. Kardiyoloji"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Renk</label>
            <div className="flex gap-2 flex-wrap">
              {DECK_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setDeckForm(f => ({ ...f, color }))}
                  className="w-8 h-8 rounded-full transition-all border-2"
                  style={{
                    background: color,
                    borderColor: deckForm.color === color ? 'white' : 'transparent',
                    transform: deckForm.color === color ? 'scale(1.15)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={addDeck} className="w-full">
            <Plus size={15} /> Deste Oluştur
          </Button>
        </Card>
      </div>
    )
  }

  // DECK DETAIL MODE
  if (mode === 'deck' && selectedDeck) {
    const deck = decks.find(d => d.id === selectedDeck.id) || selectedDeck
    const knownCount = deck.cards.filter(c => c.rating === 'known').length
    const hardCount = deck.cards.filter(c => c.rating === 'hard').length
    const unknownCount = deck.cards.filter(c => c.rating === 'unknown').length

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: deck.color + '20' }}
            >
              <Layers size={20} style={{ color: deck.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{deck.name}</h1>
              <p className="text-[var(--color-text-secondary)] text-sm">{deck.cards.length} kart · {deck.subject}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setMode('list'); setShowAddCard(false) }}>
              ← Geri
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAddCard(true)}>
              <Plus size={14} /> Kart Ekle
            </Button>
            <Button variant="primary" size="sm" onClick={() => startStudy(deck)}>
              <Play size={14} /> Çalış
            </Button>
          </div>
        </div>

        {deck.cards.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-[var(--color-success)]">{knownCount}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Bildim</p>
            </div>
            <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-[var(--color-warning)]">{hardCount}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Zorlandım</p>
            </div>
            <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-[var(--color-destructive)]">{unknownCount}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Bilmedim</p>
            </div>
            <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-[var(--color-text-secondary)]">
                {deck.cards.length - knownCount - hardCount - unknownCount}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Yeni</p>
            </div>
          </div>
        )}

        {/* Add card inline */}
        {showAddCard && (
          <Card variant="elevated" className="p-5">
            <CardTitle className="mb-4">Kart Ekle</CardTitle>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Ön Yüz (Terim / Soru)</label>
                <textarea
                  value={cardForm.front}
                  onChange={e => setCardForm(f => ({ ...f, front: e.target.value }))}
                  rows={2}
                  placeholder="Kart ön yüzü..."
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Arka Yüz (Tanım / Cevap)</label>
                <textarea
                  value={cardForm.back}
                  onChange={e => setCardForm(f => ({ ...f, back: e.target.value }))}
                  rows={2}
                  placeholder="Kart arka yüzü..."
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={addCard}>
                  <Check size={14} /> Ekle
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddCard(false); setCardForm({ front: '', back: '' }) }}>
                  İptal
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {deck.cards.length === 0 && (
            <Card variant="bordered" className="p-8 text-center">
              <Layers size={32} className="text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40" />
              <p className="text-[var(--color-text-secondary)]">Bu destede henüz kart yok.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowAddCard(true)}>
                <Plus size={14} /> Kart Ekle
              </Button>
            </Card>
          )}
          {deck.cards.map(card => (
            <div
              key={card.id}
              className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{card.front}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 whitespace-pre-line">{card.back}</p>
                {card.rating && (
                  <span className={[
                    'inline-block mt-1.5 text-xs px-2 py-0.5 rounded',
                    card.rating === 'known' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' :
                      card.rating === 'hard' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
                        'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                  ].join(' ')}>
                    {card.rating === 'known' ? 'Bildim' : card.rating === 'hard' ? 'Zorlandım' : 'Bilmedim'}
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteCard(deck.id, card.id)}
                className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            if (confirm('Bu desteyi silmek istediğinizden emin misiniz?')) deleteDeck(deck.id)
          }}
          className="text-xs text-[var(--color-destructive)] opacity-60 hover:opacity-100 transition-opacity text-center"
        >
          Desteyi Sil
        </button>
      </div>
    )
  }

  // LIST MODE
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Layers size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Flashcard Desteleri</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">{decks.length} deste · {decks.reduce((s, d) => s + d.cards.length, 0)} kart</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setMode('addDeck')}>
          <Plus size={14} /> Yeni Deste
        </Button>
      </div>

      {decks.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <Layers size={32} className="text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--color-text-secondary)]">Henüz deste oluşturulmadı.</p>
          <Button variant="primary" size="sm" className="mt-3" onClick={() => setMode('addDeck')}>
            <Plus size={14} /> İlk Desteyi Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map(deck => {
            const knownPct = deck.cards.length > 0
              ? Math.round((deck.cards.filter(c => c.rating === 'known').length / deck.cards.length) * 100)
              : 0
            return (
              <div
                key={deck.id}
                className="bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border)] p-5 cursor-pointer hover:border-[var(--color-primary)]/40 transition-all group"
                onClick={() => openDeck(deck)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: deck.color + '20' }}
                  >
                    <Layers size={18} style={{ color: deck.color }} />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); startStudy(deck) }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: deck.color + '20', color: deck.color }}
                  >
                    <Play size={14} />
                  </button>
                </div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-0.5">{deck.name}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">{deck.subject}</p>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                  <span>{deck.cards.length} kart</span>
                  <span style={{ color: deck.color }}>{knownPct}% bilinyor</span>
                </div>
                <div className="mt-2 h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${knownPct}%`, background: deck.color }}
                  />
                </div>
                {deck.lastStudied && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-2 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(deck.lastStudied).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
