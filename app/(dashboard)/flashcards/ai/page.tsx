"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Loader2, RotateCcw, Brain, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface AIFlashcard {
  id: string;
  front: string;
  back: string;
}

export default function AIFlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<AIFlashcard[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateCards() {
    if (!topic.trim()) {
      toast.error("Lütfen bir konu girin.");
      return;
    }
    setLoading(true);
    setCards([]);
    setFlippedIds(new Set());
    const loadingId = toast.loading("AI flashcard'lar üretiliyor...");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `"${topic}" konusundan 6 adet medikal flashcard üret. Format: KART 1 - Ön: [Soru] - Arka: [Cevap]. Sadece kartları dön, başka açıklama ekleme.`,
          model: "EFFICIENT",
          module: "flashcards-ai",
        }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Günlük AI limitinize ulaştınız");
        throw new Error("AI yanıt vermedi");
      }
      const data = await res.json();
      const aiText: string = data.response?.text || "";

      const cardBlocks = aiText.split(/KART\s*\d+/i).filter((b: string) => b.trim().length > 5);
      const parsed: AIFlashcard[] = cardBlocks.map((block: string, idx: number) => {
        const lines = block.split("\n").filter((l: string) => l.trim());
        const front =
          lines.find((l: string) => l.toLowerCase().includes("ön:"))?.replace(/ön:/i, "").trim() ||
          lines[0]?.trim() ||
          "Kavram";
        const back =
          lines.find((l: string) => l.toLowerCase().includes("arka:"))?.replace(/arka:/i, "").trim() ||
          lines[1]?.trim() ||
          "Cevap";
        return { id: `ai_${Date.now()}_${idx}`, front, back };
      });

      if (parsed.length === 0) throw new Error("Kartlar ayrıştırılamadı, tekrar deneyin.");
      setCards(parsed);
      toast.success(`${parsed.length} kart üretildi!`, { id: loadingId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Flashcard Üretici</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Konu gir, AI anında flashcard oluştursun</p>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Üretilen kartlar eğitim amaçlıdır. Klinik karar için güncel kaynaklara başvurun.</span>
      </div>

      <Card variant="elevated" className="p-6">
        <div className="flex gap-3">
          <input
            className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="Konu veya alan girin (örn: Kalp yetmezliği, Antibiyotikler, Diyabet)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateCards()}
            disabled={loading}
          />
          <Button onClick={generateCards} disabled={loading} className="px-6">
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
            AI Kart Üret
          </Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {["Dahiliye", "Tıbbi Farmakoloji", "Tıbbi Mikrobiyoloji", "Tıbbi Patoloji", "Küçük Stajlar"].map((s) => (
            <button
              key={s}
              onClick={() => setTopic(s)}
              className="text-xs px-3 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-[var(--color-primary)]" />
              <span className="text-sm font-semibold">{cards.length} kart üretildi</span>
              <Badge variant="outline" className="text-xs">{topic}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setCards([]); setTopic(""); }}>
              <RotateCcw size={14} className="mr-1" /> Temizle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const isFlipped = flippedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className="cursor-pointer"
                  style={{ perspective: "1000px", height: "200px" }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      transformStyle: "preserve-3d",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    <div
                      style={{ backfaceVisibility: "hidden", position: "absolute", inset: 0 }}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex flex-col items-center justify-center p-5 text-center"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-3">
                        <Brain size={14} className="text-[var(--color-primary)]" />
                      </div>
                      <p className="text-sm font-semibold leading-snug text-[var(--color-text-primary)]">{card.front}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)] mt-3 opacity-60">Çevirmek için tıkla</p>
                    </div>

                    <div
                      style={{
                        backfaceVisibility: "hidden",
                        position: "absolute",
                        inset: 0,
                        transform: "rotateY(180deg)",
                      }}
                      className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex flex-col items-center justify-center p-5 text-center"
                    >
                      <p className="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap">{card.back}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
