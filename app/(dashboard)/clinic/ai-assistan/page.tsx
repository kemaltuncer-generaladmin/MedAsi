'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Send, Bot, User, Copy, Check, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }

const QUICK = [
  'Bu hasta için DDx nedir?',
  'Tedavi protokolü öner',
  'Anormal lab bulgusunu yorumla',
  'İlaç etkileşimlerini kontrol et',
  'Taburcu kriterleri nelerdir?',
]

export default function ClinicAIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const context = messages.slice(-4).map(m => `${m.role === 'user' ? 'Hekim' : 'AI'}: ${m.content}`).join('\n')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Sen deneyimli bir klinisyen AI asistanısın. Hekime klinik karar desteği sağlıyorsun.\n${context ? `Önceki konuşma:\n${context}\n\n` : ''}Hekim sorusu: ${text}`, model: 'FAST' }),
      })
      if (!res.ok) throw new Error(res.status === 429 ? 'AI limiti aşıldı' : 'AI yanıt vermedi')
      const data = await res.json()
      const responseText = data.response?.[0]?.text || ''
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: new Date() }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata oluştu')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function copy(id: string, content: string) {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Bot size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Klinik AI Asistanım</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Klinik karar desteği için FAST model</p>
          </div>
        </div>
        <Badge variant="secondary"><Sparkles size={12} className="mr-1" />FAST Model</Badge>
      </div>

      <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 240px)', minHeight: '450px' }}>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center">
                <Bot size={24} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-[var(--color-text-primary)]">Klinik AI Asistanınız</p>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">Klinik sorunuzu sorun</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {QUICK.map(q => (
                  <button key={q} onClick={() => setInput(q)} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors bg-[var(--color-surface-elevated)]">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={13} className="text-[var(--color-primary)]" />
                </div>
              )}
              <div className={`max-w-[78%] group flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[var(--color-primary)] text-black rounded-br-sm' : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-bl-sm'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-[var(--color-text-secondary)]">{msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.role === 'assistant' && (
                    <button onClick={() => copy(msg.id, msg.content)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--color-surface)]">
                      {copiedId === msg.id ? <Check size={11} className="text-[var(--color-success)]" /> : <Copy size={11} className="text-[var(--color-text-secondary)]" />}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1">
                  <User size={13} className="text-[var(--color-text-secondary)]" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
                <Bot size={13} className="text-[var(--color-primary)]" />
              </div>
              <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Klinik sorunuzu yazın... (Enter ile gönderin)"
            rows={1}
            style={{ resize: 'none', maxHeight: '100px' }}
            className="flex-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors overflow-auto"
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
          />
          <Button variant="primary" size="sm" loading={loading} onClick={send} disabled={!input.trim()} className="shrink-0 px-3 py-2.5">
            <Send size={15} />
          </Button>
        </div>
      </div>
    </div>
  )
}
