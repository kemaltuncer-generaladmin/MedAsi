"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Stethoscope,
  Zap,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { streamChatResponse } from "@/lib/ai/stream-client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const QUICK = [
  "Bu hasta için DDx nedir?",
  "Tedavi protokolü öner",
  "Anormal lab bulgusunu yorumla",
  "İlaç etkileşimlerini kontrol et",
  "Taburcu kriterleri nelerdir?",
];

export default function ClinicAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const context = messages
        .slice(-4)
        .map((m) => `${m.role === "user" ? "Hekim" : "AI"}: ${m.content}`)
        .join("\n");
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      await streamChatResponse({
        message: `Sen deneyimli bir klinisyen AI asistanısın. Hekime klinik karar desteği sağlıyorsun.\n${context ? `Önceki konuşma:\n${context}\n\n` : ""}Hekim sorusu: ${text}`,
        model: "FAST",
        module: "clinic-assistant",
        onToken: (_chunk, fullText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m,
            ),
          );
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function copy(id: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Kopyalandı");
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-100px)]">
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 15%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
            }}
          >
            <Stethoscope size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
              Klinik AI Asistanım
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Klinik karar desteği ve hasta yönetimi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Zap size={11} className="text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              FAST Model
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
            >
              <Trash2 size={11} />
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)] shrink-0">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Yasal Uyarı: Bu araç eğitim amaçlı bir simülasyondur ve profesyonel tıbbi tavsiye yerine geçmez.</span>
      </div>

      {/* Chat container */}
      <div
        className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Chat header bar */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 15%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
            }}
          >
            <Bot size={15} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Klinik AI Asistan
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">
                Aktif · Klinik karar desteği hazır
              </p>
            </div>
          </div>
        </div>

        {/* Messages scroll area */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5"
          style={{ background: "var(--color-background)" }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              {/* Empty state icon */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, transparent), color-mix(in srgb, var(--color-primary) 5%, transparent))",
                  border:
                    "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  boxShadow:
                    "0 0 32px color-mix(in srgb, var(--color-primary) 10%, transparent)",
                }}
              >
                <Stethoscope
                  size={32}
                  className="text-[var(--color-primary)]"
                />
              </div>

              {/* Empty state text */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Klinik Karar Desteği
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm max-w-sm">
                  Hastanıza özel klinik sorular sorun, DDx ve tedavi
                  protokolleri alın.
                </p>
              </div>

              {/* Quick prompts */}
              <div className="w-full max-w-xl">
                <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3 text-center opacity-70">
                  Hızlı Sorular
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        inputRef.current?.focus();
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-primary)";
                        e.currentTarget.style.color = "var(--color-primary)";
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--color-primary) 8%, transparent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-border)";
                        e.currentTarget.style.color =
                          "var(--color-text-secondary)";
                        e.currentTarget.style.background =
                          "var(--color-surface)";
                      }}
                    >
                      <span className="opacity-40 mr-1 font-bold">/</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* AI avatar */}
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                  }}
                >
                  <Bot size={13} className="text-[var(--color-primary)]" />
                </div>
              )}

              <div
                className={`max-w-[78%] group flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Bubble */}
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--color-primary)",
                          color: "#000",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "var(--color-surface-elevated)",
                          color: "var(--color-text-primary)",
                          border: "1px solid var(--color-border)",
                          borderBottomLeftRadius: "4px",
                        }
                  }
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Meta row */}
                <div
                  className={`flex items-center gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <span className="text-xs text-[var(--color-text-secondary)] opacity-60">
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[var(--color-surface)]"
                      title="Kopyala"
                    >
                      {copiedId === msg.id ? (
                        <Check
                          size={11}
                          className="text-[var(--color-success)]"
                        />
                      ) : (
                        <Copy
                          size={11}
                          className="text-[var(--color-text-secondary)]"
                        />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* User avatar */}
              {msg.role === "user" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <User
                    size={13}
                    className="text-[var(--color-text-secondary)]"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                }}
              >
                <Bot size={13} className="text-[var(--color-primary)]" />
              </div>
              <div
                className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                style={{
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderBottomLeftRadius: "4px",
                }}
              >
                {[0, 150, 300].map((d) => (
                  <div
                    key={d}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: "var(--color-primary)",
                      animationDelay: `${d}ms`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="px-5 py-4 shrink-0"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div
            className="flex gap-3 items-end rounded-xl p-2 transition-all"
            style={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--color-primary)";
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                "var(--color-border)";
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Klinik sorunuzu yazın... (Enter ile gönderin, Shift+Enter yeni satır)"
              rows={1}
              style={{
                resize: "none",
                maxHeight: "100px",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--color-text-primary)",
              }}
              className="flex-1 px-2 py-2 text-sm placeholder:text-[var(--color-text-secondary)] overflow-auto"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  input.trim() && !loading
                    ? "var(--color-primary)"
                    : "var(--color-surface)",
                color:
                  input.trim() && !loading
                    ? "#000"
                    : "var(--color-text-secondary)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center opacity-50">
            FAST Model · Klinik karar desteği için optimize edilmiştir
          </p>
        </div>
      </div>
    </div>
  );
}
