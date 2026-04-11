"use client";

import { MessageSquare, Plus, Sparkles } from "lucide-react";

type Conversation = {
  id: string;
  title: string;
  messages: unknown[];
  createdAt: Date;
};

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conv: Conversation) => void;
  formatDate: (d: Date) => string;
}

export default function ChatSidebar({
  conversations,
  activeConvId,
  onNewConversation,
  onSelectConversation,
  formatDate,
}: ChatSidebarProps) {
  return (
    <div
      className="w-72 shrink-0 flex flex-col"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 74%, transparent)",
        borderRight: "1px solid color-mix(in srgb, var(--color-border) 75%, transparent)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="p-4 shrink-0"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-border) 70%, transparent)" }}
      >
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-sm font-semibold transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 65%, white))",
            color: "#000",
            boxShadow: "0 10px 30px color-mix(in srgb, var(--color-primary) 24%, transparent)",
          }}
        >
          <Plus size={15} />
          Yeni Sohbet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-2 py-2 text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.24em] opacity-60">
          Geçmiş
        </p>
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className="w-full text-left px-3 py-3 rounded-2xl transition-all text-sm group"
            style={
              activeConvId === conv.id
                ? {
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent)",
                    color: "var(--color-primary)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  }
                : {
                    color: "var(--color-text-secondary)",
                    border: "1px solid transparent",
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

      <div
        className="p-4 shrink-0"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--color-border) 70%, transparent)" }}
      >
        <div className="rounded-2xl px-3 py-3 bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-[var(--color-primary)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Turbo Klinik Mod
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] opacity-60">
            Glass panel + streaming + akıllı cevap kartları
          </p>
        </div>
      </div>
    </div>
  );
}
