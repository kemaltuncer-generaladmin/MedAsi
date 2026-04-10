const fs = require('fs');
const path = 'app/(dashboard)/questions/fabrika/page.tsx';

const factoryCode = `"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Factory, Sparkles, Brain, Loader2, 
  ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Save
} from "lucide-react";
import toast from "react-hot-toast";

export default function SoruFabrikasiPage() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  async function generateQuestions() {
    setLoading(true);
    setShowAnswer(false);
    const loadingId = toast.loading("Zayıf alanlarına yönelik TUS formatında sorular üretiliyor...");
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Lütfen öğrenme profilimdeki zayıf konuları analiz et ve bu alanlardaki bilgi açıklarımı kapatacak 5 adet TUS formatında (5 seçenekli) soru üret. Her soru için detaylı klinik açıklama ekle.", 
          model: "FAST", // Gemini 2.5 Pro
          module: "questions-fabrika" 
        }),
      });

      if (!res.ok) throw new Error("Soru üretimi başarısız.");
      
      const data = await res.json();
      // Basit bir parse mantığı (Gelen metni sorulara böler)
      const aiText = data.response.text;
      const questionBlocks = aiText.split(/SORU \d/i).filter(b => b.trim().length > 20);
      
      setQuestions(questionBlocks);
      setCurrentIndex(0);
      toast.success("Kişiselleştirilmiş soruların hazır!", { id: loadingId });
    } catch (e) {
      toast.error("Şu an soru üretilemedi. Lütfen tekrar deneyin.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-warning)]/10 flex items-center justify-center border border-[var(--color-warning)]/20">
            <Factory size={24} className="text-[var(--color-warning)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Soru Fabrikası</h1>
            <p className="text-[var(--color-text-secondary)] text-sm italic">Zayıf olduğun konularda seni test eden dinamik motor</p>
          </div>
        </div>
        <Button variant="primary" onClick={generateQuestions} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
          Yeni Sorular Üret
        </Button>
      </div>

      {!currentQuestion && !loading ? (
        <Card variant="elevated" className="p-16 text-center flex flex-col items-center gap-6 border-dashed border-2 border-[var(--color-border)]">
          <div className="w-20 h-20 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
            <Brain size={40} className="text-[var(--color-text-disabled)]" />
          </div>
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Fabrika Henüz Çalışmadı</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Soru Bankası'ndaki yanlışlarını analiz ederek sana özel TUS formatında sorular üretmek için yukarıdaki butona tıkla.
            </p>
          </div>
          <Button onClick={generateQuestions} size="lg">Üretime Başla</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card variant="bordered" className="p-0 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-widest text-[var(--color-warning)]">
                Soru {currentIndex + 1} / {questions.length}
              </span>
              <Badge variant="warning">Gemini 2.5 Pro — FAST</Badge>
            </div>
            <div className="p-8 bg-[var(--color-background)]">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-[var(--color-surface)] rounded w-3/4"></div>
                  <div className="h-4 bg-[var(--color-surface)] rounded w-full"></div>
                </div>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)] font-medium">
                  {currentQuestion}
                </div>
              )}
            </div>
            {showAnswer && !loading && (
              <div className="p-6 bg-[var(--color-success)]/5 border-t border-[var(--color-success)]/20">
                <div className="flex items-center gap-2 mb-2 text-[var(--color-success)]">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold uppercase">AI Analizi ve Çözüm</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] italic leading-relaxed">
                  Cevap ve açıklama metni yukarıdaki blok içerisinde yer almaktadır.
                </p>
              </div>
            )}
          </Card>

          <div className="flex justify-between items-center px-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowAnswer(!showAnswer)}
              className="text-xs"
            >
              {showAnswer ? "Çözümü Gizle" : "Çözümü Göster"}
            </Button>
            <div className="flex gap-2">
               <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
               >
                 Sonraki Soru <ChevronRight size={14} className="ml-1" />
               </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex gap-4 items-start">
        <AlertCircle size={20} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Adaptif Öğrenme Döngüsü</p>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Bu sorular statik bir veritabanından gelmez. Soru Bankası'nda en çok hata yaptığınız konular Gemini 2.5 Pro tarafından anlık olarak analiz edilir ve eksiklerinizi kapatmaya yönelik "terzi dikimi" sorular üretilir.
          </p>
        </div>
      </div>
    </div>
  );
}
";

try {
  fs.writeFileSync(path, factoryCode);
  console.log("✅ Soru Fabrikası Modülü (v1.0) Merkezi Beyne Bağlandı!");
} catch (e) {
  console.log("❌ Hata: Dosya güncellenemedi.");
}
