const fs = require('fs');
const path = 'app/(dashboard)/questions/fabrika/page.tsx';

const finalFactoryCode = `"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Factory, Sparkles, Brain, Loader2, 
  ChevronRight, CheckCircle2, XCircle, RefreshCw, Info
} from "lucide-react";
import toast from "react-hot-toast";

export default function SoruFabrikasiPage() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  async function generateQuestions() {
    setLoading(true);
    setQuestions([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    const loadingId = toast.loading("Profiline özel sorular JSON formatında hazırlanıyor...");
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Zayıf konularımdan 5 adet TUS sorusu üret. Çıktı formatı: { 'questions': [ { 'text': '...', 'options': ['...', '...', '...', '...', '...'], 'correctIndex': 0, 'explanation': '...', 'subject': '...' } ] }", 
          model: "FAST", 
          module: "questions-fabrika" 
        }),
      });

      if (!res.ok) throw new Error("Üretim hatası.");
      
      const data = await res.json();
      // JSON Parse (Merkezi Beyin artık JSON dönüyor)
      const parsed = JSON.parse(data.response.text);
      setQuestions(parsed.questions || []);
      setCurrentIndex(0);
      toast.success("Sorular başarıyla üretildi!", { id: loadingId });
    } catch (e) {
      toast.error("Format hatası veya bağlantı sorunu.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  const handleAnswer = async (idx: number) => {
    if (selectedAnswer !== null) return;
    
    const q = questions[currentIndex];
    const correct = idx === q.correctIndex;
    setSelectedAnswer(idx);
    setIsCorrect(correct);

    // DÖNGÜYÜ KAPATALIM: Sonucu Merkezi Beyne (Hafızaya) gönder
    try {
      await fetch('/api/questions/submit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: [{
            subject: q.subject || "Genel Tip",
            difficulty: "AI-Generated",
            questionText: q.text,
            isCorrect: correct
          }]
        })
      });
    } catch (e) {
      console.error("Hafıza güncellenemedi");
    }
  };

  const nextQuestion = () => {
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-warning)]/10 flex items-center justify-center border border-[var(--color-warning)]/20 text-[var(--color-warning)]">
            <Factory size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Soru Fabrikası</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">Zayıf yanlarını güçlendiren akıllı üretim hattı</p>
          </div>
        </div>
        <Button onClick={generateQuestions} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
          Üretime Başla
        </Button>
      </div>

      {currentQ ? (
        <div className="space-y-6">
          <Card variant="bordered" className="p-0 overflow-hidden shadow-2xl transition-all">
            <div className="px-6 py-4 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--color-warning)] uppercase">Soru {currentIndex + 1} / {questions.length}</span>
              <Badge variant="outline" className="text-[10px]">{currentQ.subject}</Badge>
            </div>
            
            <div className="p-8">
              <p className="text-lg font-medium leading-relaxed mb-8">{currentQ.text}</p>
              
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((opt: string, i: number) => {
                  let variant = "outline";
                  if (selectedAnswer === i) {
                    variant = isCorrect ? "success" : "destructive";
                  } else if (selectedAnswer !== null && i === currentQ.correctIndex) {
                    variant = "success";
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={selectedAnswer !== null}
                      className={\`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left text-sm \${
                        selectedAnswer === null ? "border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5" :
                        i === currentQ.correctIndex ? "border-[var(--color-success)] bg-[var(--color-success)]/10" :
                        selectedAnswer === i ? "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10" : "border-[var(--color-border)] opacity-50"
                      }\`}
                    >
                      <span>{['A', 'B', 'C', 'D', 'E'][i]}) {opt}</span>
                      {selectedAnswer !== null && i === currentQ.correctIndex && <CheckCircle2 size={16} className="text-[var(--color-success)]" />}
                      {selectedAnswer === i && !isCorrect && <XCircle size={16} className="text-[var(--color-destructive)]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedAnswer !== null && (
              <div className="p-8 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-3 text-[var(--color-primary)]">
                  <Brain size={18} />
                  <h4 className="font-bold text-sm uppercase">Klinik Açıklama</h4>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{currentQ.explanation}</p>
                
                {currentIndex < questions.length - 1 && (
                  <Button onClick={nextQuestion} className="mt-6 w-full">
                    Sonraki Soruya Geç <ChevronRight size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      ) : !loading && (
        <Card variant="elevated" className="p-20 text-center flex flex-col items-center border-dashed border-2">
           <div className="bg-[var(--color-primary)]/10 p-4 rounded-full mb-4">
             <Factory size={48} className="text-[var(--color-primary)]" />
           </div>
           <h2 className="text-xl font-bold">Üretim Hattı Beklemede</h2>
           <p className="text-[var(--color-text-secondary)] mt-2 max-w-sm">Zayıf olduğun konulardan taze sorular üretmek için yukarıdaki butonu kullan.</p>
        </Card>
      )}
    </div>
  );
}
";

try {
  fs.writeFileSync(path, finalFactoryCode);
  console.log("✅ Soru Fabrikası: JSON Modu, İnteraktif Seçenekler ve Hafıza Bağlantısı Tamamlandı!");
} catch (e) {
  console.log("❌ Hata:", e.message);
}
