"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  BookPlus,
  Bot,
  Check,
  Copy,
  FileUp,
  MessageSquare,
  Mic,
  Pin,
  Plus,
  Send,
  Sparkles,
  Table2,
  User,
  Waves,
} from "lucide-react";
import toast from "react-hot-toast";
import { streamChatResponse } from "@/lib/ai/stream-client";
import ChatSidebar from "./_components/ChatSidebar";
import ChatMessage from "./_components/ChatMessage";
import ChatInput from "./_components/ChatInput";

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

type UserNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  rating?: "unknown" | "hard" | "known";
  lastStudied?: string;
};

type Deck = {
  id: string;
  name: string;
  subject: string;
  color: string;
  cards: Flashcard[];
  createdAt: string;
  lastStudied?: string;
};

const QUICK_PROMPTS = [
  "Metformin'in etki mekanizmasını tablo halinde açıkla",
  "Akut koroner sendromu ilk 5 dakikada nasıl yönetirim?",
  "Hiponatremi ayırıcı tanısını basitleştir",
  "Pediatrik ateş yaklaşımını madde madde ver",
  "Diyabetik ketoasidoz için mini algoritma çıkar",
  "Antibiyotik seçimini özetleyen bir karar ağacı kur",
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    title: "KBY ve ilaç dozlaması",
    messages: [],
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "c2",
    title: "Pnömoni ayırıcı tanısı",
    messages: [],
    createdAt: new Date(Date.now() - 172800000),
  },
];

const NOTES_STORAGE_KEY = "medasi_user_notes";
const FLASHCARDS_STORAGE_KEY = "medasi_flashcards_v1";

function buildAssistantPrompt(text: string, history: Message[]) {
  const systemContext =
    history.length > 0
      ? `Önceki konuşma bağlamı: ${history
          .slice(-4)
          .map((m) => `${m.role === "user" ? "Kullanıcı" : "Sen"}: ${m.content}`)
          .join("\n")}\n\n`
      : "";

  return `Sen bir medikal AI asistanısın. Tıp öğrencileri ve hekimlere doğru, güncel ve anlaşılır medikal bilgi sunuyorsun.\n\n${systemContext}Kullanıcı sorusu: ${text}`;
}

function loadNotes(): UserNote[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: UserNote[]) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function loadDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FLASHCARDS_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDecks(decks: Deck[]) {
  localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(decks));
}

function extractFlashcards(content: string) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const bulletLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•]|\d+\./.test(line));

  const source = bulletLines.length >= 2 ? bulletLines : paragraphs;
  const cards = source.slice(0, 6).map((item, index) => {
    const cleaned = item.replace(/^[-*•]\s*|\d+\.\s*/, "").trim();
    const [frontCandidate, ...rest] = cleaned.split(/[:\-]\s+/);
    const front = frontCandidate.slice(0, 80) || `AI Kart ${index + 1}`;
    const back = (rest.join(" - ") || cleaned).slice(0, 400);

    return {
      id: `${Date.now()}_${index}`,
      front,
      back,
      rating: "unknown" as const,
    };
  });

  if (cards.length > 0) return cards;

  return [
    {
      id: `${Date.now()}_fallback`,
      front: "AI Asistan Notu",
      back: content.slice(0, 500),
      rating: "unknown" as const,
    },
  ];
}

function parseSmartBlocks(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const isBulletBlock =
        lines.length >= 2 &&
        lines.every((line) => /^[-*•]|\d+\./.test(line));

      const isQuoteBlock =
        section.startsWith(">") ||
        /^(önemli|klinik ipucu|uyarı|not)\s*:/i.test(section);

      const isLabBlock =
        lines.length >= 2 &&
        lines.every(
          (line) =>
            /:/.test(line) &&
            (/\d/.test(line) ||
              /(yüksek|düşük|normal|kritik|high|low|critical)/i.test(line)),
        );

      if (isLabBlock) {
        return { type: "lab" as const, lines };
      }

      if (isBulletBlock) {
        return { type: "bullet" as const, lines };
      }

      if (isQuoteBlock) {
        return { type: "quote" as const, text: section.replace(/^>\s*/gm, "") };
      }

      if (section.length > 420) {
        return {
          type: "accordion" as const,
          summary: lines[0]?.slice(0, 88) || "Detaylı Açıklama",
          text: section,
        };
      }

      return { type: "paragraph" as const, text: section };
    });
}

function renderLabRow(line: string) {
  const [label, rawValue] = line.split(/:\s*/, 2);
  const lower = rawValue?.toLowerCase() ?? "";
  const status = lower.includes("kritik")
    ? "critical"
    : lower.includes("yüksek") || lower.includes("high")
      ? "high"
      : lower.includes("düşük") || lower.includes("low")
        ? "low"
        : "normal";

  const accent =
    status === "critical"
      ? "var(--color-destructive)"
      : status === "high"
        ? "var(--color-warning)"
        : status === "low"
          ? "var(--color-primary)"
          : "var(--color-success)";

  return (
    <div
      key={line}
      className="grid grid-cols-[140px_1fr] gap-3 items-start rounded-xl px-3 py-2"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 82%, transparent)",
        border: `1px solid color-mix(in srgb, ${accent} 22%, var(--color-border))`,
      }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: accent }}>
        {rawValue}
      </span>
    </div>
  );
}

function SmartAssistantContent({ content }: { content: string }) {
  const blocks = parseSmartBlocks(content);

  if (!content.trim()) {
    return (
      <div className="space-y-2 py-1">
        <div className="medasi-shimmer-line w-4/5" />
        <div className="medasi-shimmer-line w-full" />
        <div className="medasi-shimmer-line w-3/5" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "bullet") {
          return (
            <div
              key={`${block.type}-${index}`}
              className="rounded-2xl p-3"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 6%, transparent), transparent)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 12%, var(--color-border))",
              }}
            >
              <div className="space-y-2">
                {block.lines.map((line) => (
                  <div key={line} className="flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                    <p className="whitespace-pre-wrap leading-7 text-[15px]">{line.replace(/^[-*•]\s*|\d+\.\s*/, "")}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "lab") {
          return (
            <div
              key={`${block.type}-${index}`}
              className="rounded-2xl p-3"
              style={{
                background: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                <Waves size={13} className="text-[var(--color-primary)]" />
                Klinik Veri Özeti
              </div>
              <div className="space-y-2">{block.lines.map(renderLabRow)}</div>
            </div>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="rounded-r-2xl border-l-4 pl-4 py-2 pr-3 italic text-[15px] leading-7"
              style={{
                borderLeftColor: "var(--color-primary)",
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
                color: "var(--color-text-primary)",
              }}
            >
              {block.text}
            </blockquote>
          );
        }

        if (block.type === "accordion") {
          return (
            <details
              key={`${block.type}-${index}`}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-3"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-text-primary)]">
                {block.summary}
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[var(--color-text-secondary)]">
                {block.text}
              </p>
            </details>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--color-text-primary)]"
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function PulseLoader() {
  return (
    <div
      className="rounded-2xl px-5 py-3.5"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 78%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-border) 75%, transparent)",
        borderBottomLeftRadius: "6px",
        backdropFilter: "blur(16px)",
        minWidth: 220,
      }}
    >
      <div className="flex items-center gap-3">
        <AudioLines size={14} className="text-[var(--color-primary)] animate-pulse shrink-0" />
        {/* SVG EKG heartbeat trace */}
        <div style={{ width: 72, height: 22, overflow: "hidden", position: "relative", flexShrink: 0 }}>
          <svg viewBox="0 0 72 22" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%", display: "block" }}>
            <path
              className="medasi-ekg-svg"
              d="M0,11 L10,11 L13,9 L15,13 L17,11 L19,11 L22,2 L24,20 L26,11 L29,11 L31,8 L33,14 L35,11 L48,11 L50,9 L52,13 L54,11 L72,11"
              stroke="var(--color-primary)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-xs text-[var(--color-text-secondary)]">
          Klinik yanıt hazırlanıyor
        </span>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const [conversations, setConversations] =
    useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startNewConversation() {
    setMessages([]);
    setActiveConvId(null);
    setInput("");
    inputRef.current?.focus();
  }

  async function sendCustomPrompt(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const historyBeforeSend = [...messages];
    const newMessages = [...historyBeforeSend, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const assistantId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages([...newMessages, aiMsg]);

      const responseText = await streamChatResponse({
        message: buildAssistantPrompt(text.trim(), historyBeforeSend),
        model: "EFFICIENT",
        module: "ai-assistant",
        onToken: (_chunk, fullText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m,
            ),
          );
        },
      });

      const finalMessages = [...newMessages, { ...aiMsg, content: responseText }];
      setMessages(finalMessages);

      if (!activeConvId) {
        const convId = Date.now().toString();
        const newConv: Conversation = {
          id: convId,
          title: text.slice(0, 42) + (text.length > 42 ? "..." : ""),
          messages: finalMessages,
          createdAt: new Date(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(convId);
      } else {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConvId ? { ...conv, messages: finalMessages } : conv,
          ),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
      setMessages(historyBeforeSend);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function sendMessage() {
    await sendCustomPrompt(input);
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Kopyalandı");
  }

  function pinToNotes(content: string) {
    const notes = loadNotes();
    const now = new Date().toISOString();
    const note: UserNote = {
      id: Date.now().toString(),
      title: "AI Asistan Klinik Notu",
      content,
      createdAt: now,
      updatedAt: now,
    };
    saveNotes([note, ...notes]);
    toast.success("Klinik notlara eklendi");
  }

  function convertToFlashcards(content: string) {
    const decks = loadDecks();
    const cards = extractFlashcards(content);
    const existing = decks.find((deck) => deck.id === "ai_asistan_donusumleri");

    if (existing) {
      existing.cards = [...cards, ...existing.cards];
      saveDecks([...decks]);
    } else {
      const deck: Deck = {
        id: "ai_asistan_donusumleri",
        name: "AI Dönüşümler",
        subject: "Genel Tıp",
        color: "#14b8a6",
        createdAt: new Date().toISOString(),
        cards,
      };
      saveDecks([deck, ...decks]);
    }

    toast.success(`${cards.length} flashcard eklendi`);
  }

  function openVoiceInfo() {
    toast("Sesli dikte arayüzü bir sonraki iterasyonda bağlanacak.");
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setInput((prev) =>
      `${prev ? `${prev}\n\n` : ""}[Dosya eklendi: ${file.name}] Bu dosyayı referans alarak soruma yardımcı ol.`,
    );
    toast.success(`${file.name} giriş alanına eklendi`);
    event.target.value = "";
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(d: Date) {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return "Bugün";
    if (diff < 172800000) return "Dün";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 24%, transparent), color-mix(in srgb, var(--color-primary) 6%, transparent))",
              border: "1px solid color-mix(in srgb, var(--color-primary) 24%, transparent)",
              boxShadow: "0 0 26px color-mix(in srgb, var(--color-primary) 12%, transparent)",
            }}
          >
            <Bot size={22} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
              Medikal AI Asistan
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Hızlı cevap, akıllı bloklar ve tek tık iş akışı
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex flex-1 gap-4 min-h-0 rounded-2xl overflow-hidden"
        style={{
          border: "1px solid color-mix(in srgb, var(--color-border) 80%, transparent)",
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 42%), var(--color-background)",
        }}
      >
        <ChatSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          onNewConversation={startNewConversation}
          onSelectConversation={(conv) => {
            setActiveConvId(conv.id);
            setMessages(conv.messages as Message[]);
          }}
          formatDate={formatDate}
        />

        <div
          className="flex-1 flex flex-col min-w-0"
          style={{
            background: "color-mix(in srgb, var(--color-background) 74%, transparent)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{
              background: "color-mix(in srgb, var(--color-surface) 68%, transparent)",
              borderBottom: "1px solid color-mix(in srgb, var(--color-border) 75%, transparent)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                }}
              >
                <Bot size={16} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Medikal AI Asistan
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Aktif · Klinik iş akışına entegre
                  </p>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={startNewConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]"
              >
                <Pin size={13} />
                Yeni Başlat
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-7">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-primary) 24%, transparent), transparent 60%), color-mix(in srgb, var(--color-surface) 74%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                    boxShadow: "0 0 48px color-mix(in srgb, var(--color-primary) 14%, transparent)",
                  }}
                >
                  <Sparkles size={34} className="text-[var(--color-primary)]" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
                    Klinik bilginizi akışa sokalım
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm max-w-md leading-7">
                    Cevaplar artık sadece metin değil; pinlenebilir, nota dönüşebilir,
                    flashcard üretir ve okunması kolay bloklarla gelir.
                  </p>
                </div>

                <div className="w-full max-w-3xl">
                  <p className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.24em] mb-3 text-center opacity-70">
                    Hızlı Sorular
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setInput(p);
                          inputRef.current?.focus();
                        }}
                        className="px-4 py-3 rounded-2xl text-xs text-left font-medium transition-all duration-150"
                        style={{
                          background: "color-mix(in srgb, var(--color-surface) 80%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--color-border) 80%, transparent)",
                          color: "var(--color-text-secondary)",
                          backdropFilter: "blur(14px)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--color-primary) 40%, transparent)";
                          e.currentTarget.style.color = "var(--color-primary)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--color-primary) 8%, transparent)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 8px 20px color-mix(in srgb, var(--color-primary) 12%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--color-border) 80%, transparent)";
                          e.currentTarget.style.color = "var(--color-text-secondary)";
                          e.currentTarget.style.background = "color-mix(in srgb, var(--color-surface) 80%, transparent)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
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
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-1"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent)",
                      border: "1px solid color-mix(in srgb, var(--color-primary) 24%, transparent)",
                    }}
                  >
                    <Bot size={14} className="text-[var(--color-primary)]" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] group flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className="rounded-2xl px-4 py-4 text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 72%, white))",
                            color: "#000",
                            borderBottomRightRadius: "6px",
                            boxShadow:
                              "0 14px 34px color-mix(in srgb, var(--color-primary) 18%, transparent)",
                          }
                        : {
                            background: "color-mix(in srgb, var(--color-surface) 78%, transparent)",
                            color: "var(--color-text-primary)",
                            border: "1px solid color-mix(in srgb, var(--color-border) 75%, transparent)",
                            borderBottomLeftRadius: "6px",
                            backdropFilter: "blur(16px)",
                          }
                    }
                  >
                    {msg.role === "assistant" ? (
                      <SmartAssistantContent content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-7">{msg.content}</p>
                    )}
                  </div>

                  <div
                    className={`flex items-center gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <span className="text-xs text-[var(--color-text-secondary)] opacity-60">
                      {formatTime(msg.timestamp)}
                    </span>

                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                        <button
                          onClick={() => pinToNotes(msg.content)}
                          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Pin size={11} />
                            Klinik Notlarıma Ekle
                          </span>
                        </button>
                        <button
                          onClick={() => convertToFlashcards(msg.content)}
                          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
                        >
                          <span className="inline-flex items-center gap-1">
                            <BookPlus size={11} />
                            Flashcard'a Dönüştür
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            sendCustomPrompt(
                              `Aşağıdaki tıbbi cevabı intern düzeyinde daha basit, daha kısa ve 5 madde halinde yeniden yaz:\n\n${msg.content}`,
                            )
                          }
                          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Sparkles size={11} />
                            Basitleştir
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            sendCustomPrompt(
                              `Aşağıdaki yanıtı kısa bir klinik tablo formatında yeniden düzenle:\n\n${msg.content}`,
                            )
                          }
                          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Table2 size={11} />
                            Tablo Olarak Ver
                          </span>
                        </button>
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="rounded-lg p-1.5 hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
                          title="Kopyala"
                        >
                          {copiedId === msg.id ? (
                            <Check size={12} className="text-[var(--color-success)]" />
                          ) : (
                            <Copy size={12} className="text-[var(--color-text-secondary)]" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-1"
                    style={{
                      background: "color-mix(in srgb, var(--color-surface-elevated) 88%, transparent)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <User size={14} className="text-[var(--color-text-secondary)]" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 24%, transparent)",
                  }}
                >
                  <Bot size={14} className="text-[var(--color-primary)]" />
                </div>
                <PulseLoader />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className="px-5 py-4 shrink-0"
            style={{
              background: "color-mix(in srgb, var(--color-surface) 72%, transparent)",
              borderTop: "1px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
              backdropFilter: "blur(18px)",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={onFileSelected}
            />

            <div
              className="rounded-2xl p-2 transition-all medasi-input-shell"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-surface-elevated) 88%, transparent), color-mix(in srgb, var(--color-surface) 78%, transparent))",
                border: "1px solid color-mix(in srgb, var(--color-border) 82%, transparent)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-2 pb-1">
                  <button
                    type="button"
                    onClick={openVoiceInfo}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
                    title="Sesli dikte"
                  >
                    <Mic size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
                    title="Dosya yükle"
                  >
                    <FileUp size={16} />
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Sorunu yaz... Örn: ‘Bu ABG sonucunu tabloyla yorumla’ veya ‘Bu mekanizmayı basitleştir’"
                  rows={1}
                  style={{
                    resize: "none",
                    maxHeight: "120px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--color-text-primary)",
                  }}
                  className="flex-1 px-2 py-2.5 text-sm placeholder:text-[var(--color-text-secondary)] overflow-auto"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                  }}
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      input.trim() && !loading
                        ? "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, white))"
                        : "var(--color-surface)",
                    color:
                      input.trim() && !loading
                        ? "#000"
                        : "var(--color-text-secondary)",
                    boxShadow:
                      input.trim() && !loading
                        ? "0 12px 24px color-mix(in srgb, var(--color-primary) 24%, transparent)"
                        : "none",
                  }}
                >
                  {loading ? <Waves size={16} className="animate-pulse" /> : <Send size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center opacity-60">
              Sesli dikte ve dosya yükleme girişi hazır · Streaming klinik yanıt açık
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
