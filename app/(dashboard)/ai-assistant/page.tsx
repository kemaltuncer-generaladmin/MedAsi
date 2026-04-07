'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Send, Bot, User, Copy, Trash2, Plus, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }
type Conversation = { id: string; title: string; messages: Message[]; createdAt: Date }

const QUICK_PROMPTS = [
  "Metformin'in etki mekanizması nedir?",
  "Akut miyokard enfarktüsü tedavisi",
  "Pediatrik ateş yönetimi protokolü",
  "Antibiyotik direnci mekanizmaları",
  "Hipertansiyon tanı kriterleri",
  "Diyabetik ketoasidoz tedavisi",
]

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'c1', title: 'KBY ve ilaç dozlaması', messages: [], createdAt: new Date(Date.now() - 86400000) },
  { id: 'c2', title: 'Pnömoni ayırıcı tanısı', messages: [], createdAt: new Date(Date.now() - 172800000) },
  { id: 'c3', title: 'Kardiyak enzimler yorum', messages: [], createdAt: new Date(Date.now() - 259200000) },
]

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startNewConversation() {
    setMessages([])
    setActiveConvId(null)
    setInput('')
    inputRef.current?.focus()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const systemContext = messages.length > 0
        ? `Önceki konuşma bağlamı: ${messages.slice(-4).map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Sen'}: ${m.content}`).join('\n')}\n\n`
        : ''

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Sen bir medikal AI asistanısın. Tıp öğrencileri ve hekimlere doğru, güncel ve anlaşılır medikal bilgi sunuyorsun.\n\n${systemContext}Kullanıcı sorusu: ${text}`,
          model: 'EFFICIENT',
        }),
      })

      if (!res.ok) {
        if (res.status === 429) throw new Error('Günlük AI limitinize ulaştınız')
        throw new Error('AI yanıt vermedi')
      }

      const data = await res.json()
      const responseText = data.response?.[0]?.text || data.response?.find?.((b: { type: string }) => b.type === 'text')?.text || 'Yanıt alınamadı'

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: new Date() }
      const finalMessages = [...newMessages, aiMsg]
      setMessages(finalMessages)

      if (!activeConvId) {
        const convId = Date.now().toString()
        const newConv: Conversation = {
          id: convId,
          title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
          messages: finalMessages,
          createdAt: new Date(),
        }
        setConversations(prev => [newConv, ...prev])
        setActiveConvId(convId)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hata oluştu')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Kopyalandı')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(d: Date) {
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return 'Bugün'
    if (diff < 172800000) return 'Dün'
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex h-[calc(100vh-130px)] gap-0 rounded-xl overflow-hidden border border-[var(--color-border)]">
      <div className="w-72 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)]">
          <Button variant="primary" size="sm" onClick={startNewConversation} className="w-full">
            <Plus size={14} />
            Yeni Sohbet
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setActiveConvId(conv.id); setMessages(conv.messages) }}
              className={[
                'w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm',
                activeConvId === conv.id
                  ? 'bg-[var(--color-primary)]/10 border-l-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              <p className="font-medium truncate">{conv.title}</p>
              <p className="text-xs opacity-60 mt-0.5">{formatDate(conv.createdAt)}</p>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">EFFICIENT Model aktif</span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-60">claude-3-5-haiku kullanılıyor</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[var(--color-background)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Bot size={16} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Medikal AI Asistan</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Her zaman yardıma hazır</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={startNewConversation}>
              <Trash2 size={14} />
              Temizle
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                <Bot size={28} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Medikal Asistanınla Sohbet Et</h3>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">Tıbbi sorularını sor, anında yanıt al</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="px-3 py-2.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors text-left bg-[var(--color-surface)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-[var(--color-primary)]" />
                </div>
              )}
              <div className={`max-w-[75%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={[
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[var(--color-primary)] text-black rounded-br-sm'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-bl-sm',
                ].join(' ')}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs text-[var(--color-text-secondary)]">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--color-surface)]"
                    >
                      {copiedId === msg.id
                        ? <Check size={12} className="text-[var(--color-success)]" />
                        : <Copy size={12} className="text-[var(--color-text-secondary)]" />}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-[var(--color-text-secondary)]" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-[var(--color-primary)]" />
              </div>
              <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-secondary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Medikal sorunuzu sorun... (Enter ile gönderin, Shift+Enter yeni satır)"
                rows={1}
                style={{ resize: 'none', maxHeight: '120px' }}
                className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors overflow-auto"
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
                }}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={sendMessage}
              disabled={!input.trim()}
              className="shrink-0 px-4"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center">
            EFFICIENT Model · Genel sorular için optimize edilmiş
          </p>
        </div>
      </div>
    </div>
  )
}
