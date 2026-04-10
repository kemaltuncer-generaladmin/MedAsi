"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Brain, Send, Loader2, RefreshCw, Sparkles, User,
  Heart, Flame, Target, TrendingUp, Star, Zap,
  MessageSquare, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Merhaba! Ben senin kişisel **Mentor AI**'ın. 🎓\n\nBurada seninle birlikte çalışmak, seni motive etmek ve tıp yolculuğunda rehberlik etmek için varım.\n\nNasılsın? Bugün ne üzerinde çalışmak istiyorsun?`,
};

const QUICK_STARTERS = [
  "Bugün motivasyonum düşük, ne yapmalıyım?",
  "Zayıf alanlarımı güçlendirmeme yardım et",
  "TUS için çalışma planı oluşturalım",
  "Bu hafta ne kadar çalışmalıyım?",
  "Sınavdan önce panikledim, ne yapacağım?",
  "Hangi konuya öncelik vermeliyim?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

export default function MentorPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [motivationScore, setMotivationScore] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const history = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "limit_exceeded") {
          toast.error("AI limitin doldu. Token cüzdanını kontrol et.");
        } else {
          toast.error("Mentor yanıt veremedi.");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text ?? "...",
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Motivasyon skorunu stats'tan güncelle
      fetch("/api/dashboard/stats").then(r => r.json()).then(d => {
        if (d.motivationScore != null) setMotivationScore(d.motivationScore);
      }).catch(() => {});
    } catch {
      toast.error("Bağlantı hatası.");
    }

    setLoading(false);
  }, [messages, loading]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function reset() {
    setMessages([WELCOME_MESSAGE]);
    setInput("");
  }

  // Motivasyon skoru başlangıçta çek
  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => {
      if (d.motivationScore != null) setMotivationScore(d.motivationScore);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto gap-0">
      {/* ── BAŞLIK ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-t-3xl px-6 py-5 shrink-0"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, var(--color-primary) 60%, #06b6d4 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-20 w-24 h-24 rounded-full bg-white/5 translate-y-8" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Brain size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Mentor AI</h1>
              <p className="text-white/70 text-sm">Kişisel hoca, rehber ve motivasyon ortağın</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {motivationScore != null && (
              <div className="flex flex-col items-end gap-1 bg-white/10 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-orange-300" />
                  <span className="text-white text-sm font-bold">{motivationScore}/100</span>
                </div>
                <div className="w-24 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-400 transition-all duration-1000"
                    style={{ width: `${motivationScore}%` }}
                  />
                </div>
                <span className="text-white/50 text-[10px]">motivasyon</span>
              </div>
            )}

            <button
              onClick={reset}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Yeni sohbet"
            >
              <RefreshCw size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Özellik rozeti */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-4">
          {[
            { icon: Heart, label: "Empati" },
            { icon: Target, label: "Hedefe Yönelik" },
            { icon: TrendingUp, label: "İlerleme Takibi" },
            { icon: Star, label: "Kişiselleştirilmiş" },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <f.icon size={11} className="text-white/80" />
              <span className="text-[11px] text-white/80 font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MESAJLAR ──────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                msg.role === "user"
                  ? "bg-[var(--color-primary)]/20"
                  : "bg-purple-500/20"
              }`}
            >
              {msg.role === "user"
                ? <User size={14} className="text-[var(--color-primary)]" />
                : <Brain size={14} className="text-purple-400" />
              }
            </div>

            {/* Balon */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-tr-sm text-white"
                  : "rounded-tl-sm"
              }`}
              style={msg.role === "user"
                ? { background: "linear-gradient(135deg, var(--color-primary), #8b5cf6)" }
                : { backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }
              }
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
            />
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 mt-1">
              <Brain size={14} className="text-purple-400" />
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
            >
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── HIZLI BAŞLANGIÇLAR ─────────────────────────────────────────────── */}
      {messages.length === 1 && (
        <div
          className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-elevated)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
            Hızlı Başlangıç
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_STARTERS.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── GİRİŞ ALANI ───────────────────────────────────────────────────── */}
      <div
        className="px-4 py-4 border-t shrink-0 rounded-b-3xl"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-elevated)" }}
      >
        <div
          className="flex items-end gap-3 rounded-2xl border px-4 py-3 focus-within:border-[var(--color-primary)]/50 transition-colors"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Mentörüne bir şey sor… (Enter ile gönder)"
            disabled={loading}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] max-h-32"
            style={{ lineHeight: 1.5 }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--color-primary), #8b5cf6)" }}
          >
            {loading
              ? <Loader2 size={16} className="animate-spin text-white" />
              : <Send size={16} className="text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--color-text-secondary)] mt-2">
          Mentor AI sohbetlerin profiline kaydedilir ve Ana Panel önerilerinde kullanılır
        </p>
      </div>
    </div>
  );
}
