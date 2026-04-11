"use client";

import { FileUp, Mic, Send, Waves } from "lucide-react";

interface ChatInputProps {
  input: string;
  loading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onVoiceInfo: () => void;
  onFilePicker: () => void;
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ChatInput({
  input,
  loading,
  inputRef,
  fileInputRef,
  onInputChange,
  onSend,
  onVoiceInfo,
  onFilePicker,
  onFileSelected,
}: ChatInputProps) {
  return (
    <div
      className="px-5 py-4 shrink-0"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 72%, transparent)",
        borderTop: "1px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
        backdropFilter: "blur(18px)",
      }}
    >
      <input
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        type="file"
        className="hidden"
        onChange={onFileSelected}
      />

      <div
        className="rounded-[22px] p-2 transition-all medasi-input-shell"
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
              onClick={onVoiceInfo}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
              title="Sesli dikte"
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              onClick={onFilePicker}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
              title="Dosya yükle"
            >
              <FileUp size={16} />
            </button>
          </div>

          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Sorunu yaz... Örn: 'Bu ABG sonucunu tabloyla yorumla' veya 'Bu mekanizmayı basitleştir'"
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
            onClick={onSend}
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
  );
}
