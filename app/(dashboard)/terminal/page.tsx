'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

type LineType = 'input' | 'output' | 'error' | 'info' | 'system'
type TerminalLine = { type: LineType; text: string; id: number }

const HELP_TEXT = `
Kullanılabilir Komutlar:
  diagnose [semptomlar]   — Ayırıcı tanı analizi
  drugs [ilaç adı]        — İlaç bilgisi ve etkileşimler
  labs [tetkik adı]       — Referans aralıkları ve yorum
  icd [hastalık adı]      — ICD-10 kod arama
  vitals [yaş] [cinsiyet] — Normal vital bulgular
  about                   — MEDASI hakkında
  clear                   — Ekranı temizle
  help                    — Bu yardım listesini göster
`

const ABOUT_TEXT = `
MEDASI Terminal v1.0.0
Tıbbi AI Asistan Sistemi
Powered by Anthropic Claude API

Geliştirici: MEDASI Ekibi
Platform: medasi.com.tr
`

let lineCounter = 0
const newLine = (type: LineType, text: string): TerminalLine => ({ type, text, id: lineCounter++ })

const BOOT_SEQUENCE: TerminalLine[] = [
  newLine('system', '╔══════════════════════════════════════╗'),
  newLine('system', '║     MEDASI Terminal v1.0.0           ║'),
  newLine('system', '║     Tıbbi AI Asistan Sistemi         ║'),
  newLine('system', '╚══════════════════════════════════════╝'),
  newLine('info', "Sistem hazır. Yardım için 'help' yazın."),
  newLine('system', '──────────────────────────────────────'),
]

export default function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>(BOOT_SEQUENCE)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function addLine(type: LineType, text: string) {
    setLines(prev => [...prev, newLine(type, text)])
  }

  function addLines(newLines: TerminalLine[]) {
    setLines(prev => [...prev, ...newLines])
  }

  async function callAI(prompt: string): Promise<string> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, model: 'EFFICIENT' }),
    })
    if (!res.ok) {
      if (res.status === 429) throw new Error('Günlük AI limitine ulaşıldı')
      throw new Error('AI yanıt hatası')
    }
    const data = await res.json()
    return data.response?.[0]?.text || data.response?.find?.((b: { type: string }) => b.type === 'text')?.text || 'Yanıt alınamadı'
  }

  async function processCommand(cmd: string) {
    const trimmed = cmd.trim()
    if (!trimmed) return

    addLine('input', `medasi@terminal:~$ ${trimmed}`)
    setHistory(prev => [trimmed, ...prev.slice(0, 49)])
    setHistoryIdx(-1)

    const [command, ...args] = trimmed.toLowerCase().split(' ')
    const argStr = args.join(' ')

    if (command === 'clear') {
      setLines([...BOOT_SEQUENCE])
      return
    }
    if (command === 'help') {
      HELP_TEXT.trim().split('\n').forEach(line => addLine('info', line))
      return
    }
    if (command === 'about') {
      ABOUT_TEXT.trim().split('\n').forEach(line => addLine('system', line))
      return
    }

    const aiCommands: Record<string, string> = {
      diagnose: `Sen deneyimli bir klinisyensin. "${argStr}" semptomları için terminal formatında kısa ayırıcı tanı listesi sun. Her satırda: [olasılık%] Tanı — kısa açıklama. Maksimum 5 tanı.`,
      drugs: `Tıbbi terminal için "${argStr}" ilacı hakkında bilgi ver. Format: İlaç sınıfı, Etki mekanizması, Doz (kısa), Önemli etkileşimler, Yan etkiler. Çok kısa, terminal formatında.`,
      labs: `"${argStr}" tetkiki için referans aralıklarını ve klinik yorumu terminal formatında ver. Normal değerler, yüksek/düşük klinik anlamı. Kısa ve öz.`,
      icd: `"${argStr}" hastalığı için ICD-10 kodunu ve tam adını ver. Format: KOD - Tam Ad - Kısa açıklama. Terminal formatında.`,
      vitals: `${argStr ? `${args[0]} yaş, ${args[1] === 'female' || args[1] === 'kadın' ? 'kadın' : 'erkek'} için` : 'Yetişkin için'} normal vital bulgular nelerdir? Terminal formatında çok kısa listele.`,
    }

    if (aiCommands[command]) {
      if (!argStr && command !== 'vitals') {
        addLine('error', `Hata: '${command}' komutu için argüman gerekli. Örn: ${command} [argüman]`)
        return
      }
      setLoading(true)
      addLine('info', 'İşleniyor...')
      try {
        const response = await callAI(aiCommands[command])
        setLines(prev => {
          const withoutProcessing = prev.filter(l => l.text !== 'İşleniyor...')
          const responseLines = response.split('\n').map(line => newLine('output', line))
          return [...withoutProcessing, ...responseLines]
        })
      } catch (err) {
        setLines(prev => {
          const withoutProcessing = prev.filter(l => l.text !== 'İşleniyor...')
          return [...withoutProcessing, newLine('error', err instanceof Error ? err.message : 'AI hatası')]
        })
      } finally {
        setLoading(false)
      }
      return
    }

    addLine('error', `'${command}': komut bulunamadı. 'help' yazarak mevcut komutları görün.`)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const cmd = input
      setInput('')
      processCommand(cmd)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(newIdx)
      setInput(history[newIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(newIdx)
      setInput(newIdx === -1 ? '' : history[newIdx] ?? '')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const commands = ['diagnose', 'drugs', 'labs', 'icd', 'vitals', 'about', 'clear', 'help']
      const match = commands.find(c => c.startsWith(input))
      if (match) setInput(match + ' ')
    }
  }

  const lineColor: Record<LineType, string> = {
    input: 'text-[var(--color-primary)]',
    output: 'text-white',
    error: 'text-[var(--color-destructive)]',
    info: 'text-[var(--color-text-secondary)]',
    system: 'text-[var(--color-primary)]',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Medikal Terminal</h1>
        <div className="flex gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-mono">EFFICIENT Model</span>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-black flex flex-col"
        style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[var(--color-destructive)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--color-warning)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--color-success)]" />
          </div>
          <span className="flex-1 text-center text-xs text-[var(--color-text-secondary)] font-mono">
            MEDASI Terminal — tıbbi AI sorgu sistemi
          </span>
          {loading && (
            <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] animate-pulse" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-0.5">
          {lines.map(line => (
            <div key={line.id} className={`leading-relaxed whitespace-pre-wrap ${lineColor[line.type]}`}>
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-border)]/50">
          <span className="font-mono text-sm text-[var(--color-primary)] shrink-0">medasi@terminal:~$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={loading ? 'İşleniyor...' : ''}
            className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-[var(--color-text-secondary)] caret-[var(--color-primary)] disabled:opacity-50"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['diagnose ateş baş ağrısı', 'drugs aspirin', 'labs troponin', 'icd miyokard enfarktüsü', 'vitals 35 female'].map(cmd => (
          <button
            key={cmd}
            onClick={() => { setInput(cmd); inputRef.current?.focus() }}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors bg-[var(--color-surface)]"
          >
            $ {cmd}
          </button>
        ))}
      </div>
    </div>
  )
}
