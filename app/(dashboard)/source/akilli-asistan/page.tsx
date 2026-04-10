"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  Send,
  Bot,
  User,
  Copy,
  Trash2,
  Plus,
  Check,
  Zap,
  MessageSquare,
  Sparkles,
  BookOpen,
  Database,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};
type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};
type Material = {
  id: string;
  name: string;
  branch: string;
  chunkCount: number;
  status: string;
};

const QUICK_PROMPTS = [
  "Bu materyali özetle ve ana kavramları çıkar",
  "Bu konudan flashcard üret",
  "Anlaşılmayan kısımları açıkla",
  "Klinik önemi nedir?",
  "Sınav sorusu formatına çevir",
  "Bu bölümden soru üret",
];

export default function SourceAIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Materyal seçici state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());
  const [materialPanelOpen, setMaterialPanelOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error("Materyaller yüklenemedi");
      const data = await res.json();
      // Sadece ready durumundakileri göster
      const ready = (data.materials ?? data ?? []).filter(
        (m: Material) => m.status === "ready",
      );
      setMaterials(ready);
    } catch {
      toast.error("Materyaller yüklenemedi");
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  function toggleMaterial(id: string) {
    setSelectedMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startNewConversation() {
    setMessages([]);
    setActiveConvId(null);
    setInput("");
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages([...newMessages, aiMsg]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/akilli-asistan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          materialIds: Array.from(selectedMaterialIds),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Hata oluştu");
      }

      const responseText: string = data.text ?? "";
      const finalMessages = [...newMessages, { ...aiMsg, content: responseText }];
      setMessages(finalMessages);

      if (!activeConvId) {
        const convId = Date.now().toString();
        const newConv: Conversation = {
          id: convId,
          title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
          messages: finalMessages,
          createdAt: new Date(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(convId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantId));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Kopyalandı");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(d: Date) {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return "Bugün";
    if (diff < 172800000) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  }

  const selectedCount = selectedMaterialIds.size;

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-100px)]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--color-primary)/20, var(--color-primary)/5)",
              border: "1px solid var(--color-primary)/30",
            }}
          >
            <BookOpen size={22} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
              Akıllı Asistan
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Materyallerinizi seçin, AI onlara dayanarak sorularınızı yanıtlasın
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Gemini Flash</span>
          </div>
        </div>
      </div>

      {/* Materyal Seçici Panel */}
      <div
        className="shrink-0 rounded-xl mb-3 overflow-hidden"
        style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
      >
        <button
          onClick={() => setMaterialPanelOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
          style={{ color: "var(--color-text-primary)" }}
        >
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[var(--color-primary)]" />
            <span>Materyallerim</span>
            {selectedCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "var(--color-primary)", color: "#000" }}
              >
                {selectedCount} seçili
              </span>
            )}
          </div>
          {materialPanelOpen ? (
            <ChevronUp size={15} className="text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronDown size={15} className="text-[var(--color-text-secondary)]" />
          )}
        </button>

        {materialPanelOpen && (
          <div style={{ borderTop: "1px solid var(--color-border)" }}>
            {materialsLoading ? (
              <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">
                Yükleniyor...
              </div>
            ) : materials.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">
                Henüz işlenmiş materyal yok. Kaynaklarım sayfasından materyal yükleyin.
              </div>
            ) : (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {materials.map((mat) => {
                  const selected = selectedMaterialIds.has(mat.id);
                  return (
                    <button
                      key={mat.id}
                      onClick={() => toggleMaterial(mat.id)}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150"
                      style={
                        selected
                          ? {
                              background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                              border: "1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)",
                            }
                          : {
                              background: "var(--color-surface-elevated)",
                              border: "1px solid var(--color-border)",
                            }
                      }
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
                        style={
                          selected
                            ? { background: "var(--color-primary)" }
                            : { border: "1.5px solid var(--color-border)", background: "transparent" }
                        }
                      >
                        {selected && <Check size={10} color="#000" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FileText
                            size={11}
                            className={selected ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"}
                          />
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: selected ? "var(--color-primary)" : "var(--color-text-primary)" }}
                          >
                            {mat.name}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">
                          {mat.branch} · {mat.chunkCount} parça
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedCount > 0 && (
              <div
                className="px-4 py-2 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {selectedCount} materyal RAG bağlamına eklenecek
                </p>
                <button
                  onClick={() => setSelectedMaterialIds(new Set())}
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"
                >
                  Seçimi temizle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div
        className="flex flex-1 gap-4 min-h-0 rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {/* Sidebar */}
        <div
          className="w-64 shrink-0 flex flex-col"
          style={{ background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
        >
          <div className="p-4 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: "var(--color-primary)", color: "#000" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-primary)")}
            >
              <Plus size={15} />
              Yeni Sohbet
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <p className="px-2 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest opacity-60">
              Geçmiş
            </p>
            {conversations.length === 0 && (
              <p className="px-3 py-2 text-xs text-[var(--color-text-secondary)] opacity-50">
                Henüz sohbet yok
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMessages(conv.messages);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm group"
                style={
                  activeConvId === conv.id
                    ? {
                        background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                        borderLeft: "2px solid var(--color-primary)",
                        color: "var(--color-primary)",
                      }
                    : {
                        color: "var(--color-text-secondary)",
                        borderLeft: "2px solid transparent",
                      }
                }
              >
                <div className="flex items-start gap-2">
                  <MessageSquare size={13} className="shrink-0 mt-0.5 opacity-60" />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs leading-snug">{conv.title}</p>
                    <p className="text-xs opacity-50 mt-0.5">{formatDate(conv.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={12} className="text-[var(--color-primary)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Gemini 2.5 Flash</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] opacity-50 pl-4">akilli-asistan</p>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--color-background)" }}>
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-6 py-3.5 shrink-0"
            style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                }}
              >
                <BookOpen size={16} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Akıllı Asistan</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {selectedCount > 0
                      ? `${selectedCount} materyal bağlamda`
                      : "Aktif · Genel bilgi modunda"}
                  </p>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={startNewConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
              >
                <Trash2 size={13} />
                Temizle
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-7">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, transparent), color-mix(in srgb, var(--color-primary) 5%, transparent))",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                    boxShadow: "0 0 32px color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  }}
                >
                  <Sparkles size={32} className="text-[var(--color-primary)]" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {selectedCount > 0 ? `${selectedCount} Materyal Seçildi` : "Akıllı Asistanınız Hazır"}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm max-w-sm">
                    {selectedCount > 0
                      ? "Seçtiğiniz materyallere dayanarak sorularınızı yanıtlayacağım."
                      : "Yukarıdan materyallerinizi seçin veya doğrudan soru sorun."}
                  </p>
                </div>

                <div className="w-full max-w-2xl">
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3 text-center opacity-70">
                    Hızlı Komutlar
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setInput(p);
                          inputRef.current?.focus();
                        }}
                        className="px-4 py-3 rounded-xl text-xs text-left font-medium transition-all duration-150"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-primary)";
                          e.currentTarget.style.color = "var(--color-primary)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--color-primary) 8%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                          e.currentTarget.style.color = "var(--color-text-secondary)";
                          e.currentTarget.style.background = "var(--color-surface)";
                        }}
                      >
                        <span className="opacity-40 mr-1.5 font-bold">/</span>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{
                      background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                    }}
                  >
                    <Bot size={14} className="text-[var(--color-primary)]" />
                  </div>
                )}

                <div className={`max-w-[75%] group flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "var(--color-primary)", color: "#000", borderBottomRightRadius: "4px" }
                        : { background: "var(--color-surface-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderBottomLeftRadius: "4px" }
                    }
                  >
                    <p className="whitespace-pre-wrap">{msg.content || (loading ? "..." : "")}</p>
                  </div>

                  <div className={`flex items-center gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-60">{formatTime(msg.timestamp)}</span>
                    {msg.role === "assistant" && msg.content && (
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[var(--color-surface)]"
                        title="Kopyala"
                      >
                        {copiedId === msg.id ? (
                          <Check size={12} className="text-[var(--color-success)]" />
                        ) : (
                          <Copy size={12} className="text-[var(--color-text-secondary)]" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                  >
                    <User size={14} className="text-[var(--color-text-secondary)]" />
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 justify-start">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
                  }}
                >
                  <Bot size={14} className="text-[var(--color-primary)]" />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                  style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderBottomLeftRadius: "4px" }}
                >
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "var(--color-primary)", animationDelay: `${d}ms`, opacity: 0.7 }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            className="px-6 py-4 shrink-0"
            style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
          >
            <div
              className="flex gap-3 items-end rounded-xl p-2 transition-all"
              style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
              onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-primary)"; }}
              onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)"; }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedCount > 0
                    ? `${selectedCount} materyal bağlamında soru sor... (Enter göndermek için)`
                    : "Soru sor veya materyal seç... (Enter göndermek için, Shift+Enter yeni satır)"
                }
                rows={1}
                style={{ resize: "none", maxHeight: "120px", background: "transparent", border: "none", outline: "none", color: "var(--color-text-primary)" }}
                className="flex-1 px-2 py-2 text-sm placeholder:text-[var(--color-text-secondary)] overflow-auto"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !loading ? "var(--color-primary)" : "var(--color-surface)",
                  color: input.trim() && !loading ? "#000" : "var(--color-text-secondary)",
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
              {selectedCount > 0
                ? `Gemini Flash · ${selectedCount} materyal RAG bağlamında`
                : "Gemini Flash · Genel tıp bilgisiyle yanıtlar"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
