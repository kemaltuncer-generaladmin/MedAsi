"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen, Sparkles, Brain, Loader2,
  Send, User, Award, AlertTriangle, PlayCircle, RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";

export default function SozluSimulatorePage() {
  const [loading, setLoading] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");

  async function startExam() {
    setLoading(true);
    setExamStarted(true);
    setMessages([]);
    const loadingId = toast.loading("Sözlü sınav hazırlanıyor...");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Yeni bir sözlü sınav başlat. Bana teorik bir tıp sorusu sor ve cevabımı bekle. Soru kısa ve net olsun.",
          model: "FAST",
          module: "exams-sozlu",
        }),
      });

      const data = await res.json();
      setMessages([{ role: "assistant", text: data.response.text }]);
      toast.success("Sözlü sınav başladı. Başarılar!", { id: loadingId });
    } catch {
      toast.error("Sınav sunucusu şu an meşgul.", { id: loadingId });
      setExamStarted(false);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          model: "FAST",
          module: "exams-sozlu",
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.response.text }]);
    } catch {
      toast.error("Yanıt alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sözlü Sınav Simülatörü</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Teorik soru-cevap ve tartışma formatı</p>
          </div>
        </div>
        {examStarted && (
          <Button variant="ghost" size="sm" onClick={startExam} className="text-[var(--color-destructive)]">
            <RotateCcw size={14} className="mr-2" /> Sınavı Sıfırla
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Yasal Uyarı: Bu araç eğitim amaçlı bir simülasyondur ve profesyonel tıbbi tavsiye yerine geçmez.</span>
      </div>

      {!examStarted ? (
        <Card variant="elevated" className="flex-1 flex flex-col items-center justify-center text-center p-12 border-dashed border-2">
          <PlayCircle size={64} className="text-[var(--color-primary)] mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">Sözlü Sınava Gir</h2>
          <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
            AI bir jüri üyesi gibi davranır. Size teorik sorular sorar, cevaplarınızı değerlendirir ve
            eksik noktalarınızı tartışır. Gerçek bir sözlü sınav deneyimi yaşarsınız.
          </p>
          <div className="flex gap-4">
            <Badge variant="outline" className="px-4 py-2">Teorik Sorular</Badge>
            <Badge variant="outline" className="px-4 py-2">Tartışma Formatı</Badge>
            <Badge variant="outline" className="px-4 py-2">Anlık Geri Bildirim</Badge>
          </div>
          <Button size="lg" onClick={startExam} className="mt-10 px-12 h-14 text-lg">
            Sınavı Başlat
          </Button>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <Card variant="bordered" className="flex-1 flex flex-col p-0 overflow-hidden bg-[var(--color-surface)]/30">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">Sınav Devam Ediyor...</span>
              </div>
              <Badge variant="success">Jüri: AI Model</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      m.role === "user"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                      {m.role === "user" ? <User size={12} /> : <Brain size={12} />}
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {m.role === "user" ? "Sen" : "Jüri Üyesi"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-elevated)] p-4 rounded-2xl animate-pulse">
                    <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)]">
              <div className="relative">
                <input
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl py-4 pl-4 pr-12 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Cevabınızı yazın..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)] hover:scale-110 transition-transform"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
