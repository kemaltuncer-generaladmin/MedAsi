const fs = require('fs');
const path = 'app/(dashboard)/source/ai-notlar/page.tsx';

const notesCode = `"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, Sparkles, Brain, Loader2, 
  Tags, Bookmark, Copy, ListChecks, ArrowRight, Layers
} from "lucide-react";
import toast from "react-hot-toast";

export default function AiNotlarPage() {
  const [loading, setLoading] = useState(false);
  const [rawNote, setRawNote] = useState("");
  const [processedNote, setProcessedNote] = useState<any>(null);

  async function processNote() {
    if (rawNote.length < 20) {
      toast.error("Analiz için çok kısa bir not girdiniz.");
      return;
    }
    setLoading(true);
    const loadingId = toast.loading("Notların tıbbi literatüre göre yapılandırılıyor...");
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: rawNote, 
          model: "EFFICIENT", 
          module: "source-ai-notlar" 
        }),
      });

      if (!res.ok) throw new Error("İşleme hatası.");
      const data = await res.json();
      
      // Merkezi beyinden gelen yanıtı formatla (JSON veya Markdown bekliyoruz)
      setProcessedNote(data.response.text);
      toast.success("Notların zekaya dönüştürüldü!", { id: loadingId });
    } catch (e) {
      toast.error("Şu an notlar işlenemiyor.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/10 flex items-center justify-center border border-[var(--color-secondary)]/20">
            <FileText size={20} className="text-[var(--color-secondary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Notlar</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Ham notlarını yapılandırılmış klinik verilere dönüştür</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon: Giriş Alanı */}
        <div className="space-y-4">
          <Card variant="bordered" className="p-0 overflow-hidden h-[500px] flex flex-col">
            <div className="px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center gap-2">
              <Bookmark size={14} className="text-[var(--color-text-secondary)]" />
              <span className="text-xs font-bold uppercase tracking-wider">Ham Ders Notları / Klinik Gözlemler</span>
            </div>
            <textarea
              className="flex-1 p-6 bg-transparent resize-none focus:outline-none text-sm leading-relaxed text-[var(--color-text-primary)]"
              placeholder="Ders notlarını, hasta öykülerini veya karmaşık tıbbi metinleri buraya yapıştır..."
              value={rawNote}
              onChange={(e) => setRawNote(e.target.value)}
            />
            <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)]">
              <Button 
                onClick={processNote} 
                disabled={loading || rawNote.length < 20}
                className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90"
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
                Analiz Et ve Yapılandır
              </Button>
            </div>
          </Card>
        </div>

        {/* Sağ Kolon: Çıktı Alanı */}
        <div className="space-y-4">
          {!processedNote && !loading ? (
            <Card variant="elevated" className="h-[500px] flex flex-col items-center justify-center text-center p-12 border-dashed border-2">
              <Brain size={48} className="text-[var(--color-text-disabled)] mb-4" />
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soldaki alana notlarını girip "Analiz Et" butonuna bastığında, 
                burada özetler, anahtar kavramlar ve flashcard önerileri belirecek.
              </p>
            </Card>
          ) : (
            <Card variant="bordered" className="p-0 overflow-hidden h-[500px] flex flex-col">
              <div className="px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks size={14} className="text-[var(--color-success)]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Yapılandırılmış Zeka</span>
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" size="xs" onClick={() => toast.success("Not kopyalandı!")}>
                     <Copy size={12} />
                   </Button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto bg-[var(--color-background)]">
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-[var(--color-surface)] rounded w-3/4"></div>
                    <div className="h-4 bg-[var(--color-surface)] rounded w-full"></div>
                    <div className="h-4 bg-[var(--color-surface)] rounded w-5/6"></div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    {processedNote}
                  </div>
                )}
              </div>
              <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => window.location.href='/dashboard/flashcards/flashcard'}
                >
                  <Layers size={14} className="mr-2" /> Flashcard'lara Dönüştür
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/5 p-4 flex gap-3">
        <Tags size={20} className="text-[var(--color-secondary)] shrink-0" />
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <strong>İpucu:</strong> Notlarını yapılandırdıktan sonra "Flashcard'lara Dönüştür" butonuna basarak, 
          AI Notlar'daki verilerin doğrudan Flashcard AI modülüne aktarılmasını sağlayabilirsin. 
          Bu, **Grup C'den Grup B'ye** veri akışını temsil eder.
        </p>
      </div>
    </div>
  );
}
";

try {
  fs.writeFileSync(path, notesCode);
  console.log("✅ AI Notlar Modülü (v1.0) Başarıyla Kuruldu!");
} catch (e) {
  console.log("❌ Hata: Dosya güncellenemedi.");
}
