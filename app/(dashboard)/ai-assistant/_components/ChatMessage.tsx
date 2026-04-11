"use client";

import {
  BookPlus,
  Bot,
  Check,
  Copy,
  Pin,
  Sparkles,
  Table2,
  User,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface ChatMessageProps {
  msg: Message;
  copiedId: string | null;
  formatTime: (d: Date) => string;
  onCopy: (id: string, content: string) => void;
  onPinToNotes: (content: string) => void;
  onConvertToFlashcards: (content: string) => void;
  onSimplify: (content: string) => void;
  onTableFormat: (content: string) => void;
  renderSmartContent: (content: string) => React.ReactNode;
}

export default function ChatMessage({
  msg,
  copiedId,
  formatTime,
  onCopy,
  onPinToNotes,
  onConvertToFlashcards,
  onSimplify,
  onTableFormat,
  renderSmartContent,
}: ChatMessageProps) {
  return (
    <div
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
            renderSmartContent(msg.content)
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
                onClick={() => onPinToNotes(msg.content)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
              >
                <span className="inline-flex items-center gap-1">
                  <Pin size={11} />
                  Klinik Notlarıma Ekle
                </span>
              </button>
              <button
                onClick={() => onConvertToFlashcards(msg.content)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
              >
                <span className="inline-flex items-center gap-1">
                  <BookPlus size={11} />
                  Flashcard&apos;a Dönüştür
                </span>
              </button>
              <button
                onClick={() => onSimplify(msg.content)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
              >
                <span className="inline-flex items-center gap-1">
                  <Sparkles size={11} />
                  Basitleştir
                </span>
              </button>
              <button
                onClick={() => onTableFormat(msg.content)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)]"
              >
                <span className="inline-flex items-center gap-1">
                  <Table2 size={11} />
                  Tablo Olarak Ver
                </span>
              </button>
              <button
                onClick={() => onCopy(msg.id, msg.content)}
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
  );
}
