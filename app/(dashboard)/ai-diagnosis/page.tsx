"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Stethoscope, Sparkles, Brain, Loader2, 
  AlertTriangle, CheckCircle2, ListFilter, Activity
} from "lucide-react";
import toast from "react-hot-toast";

export default function AiTaniPage() {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);

  async function analyzeCase() {
    if (input.length < 10) return toast.error("Lütfen daha fazla klinik detay girin.");
    setLoading(true);
    setResult(null);
    const loadingId = toast.loading("Ayırıcı tanılar (DDx) oluşturuluyor...");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model: "FAST", module: "ai-diagnosis" }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.response.text);
      setResult(parsed);
      toast.success("Analiz tamamlandı.", { id: loadingId });
    } catch (e) {
      toast.error("Format hatası veya bağlantı sorunu.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
          <Stethoscope size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Tanı Asistanı</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Semptom ve bulguları profesyonel ayırıcı tanıya dönüştür</p>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Yasal Uyarı: Bu araç eğitim amaçlı bir simülasyondur ve profesyonel tıbbi tavsiye yerine geçmez.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card variant="bordered" className="p-4">
            <CardTitle className="text-sm mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[var(--color-primary)]" />
              Vaka Girişi
            </CardTitle>
            <textarea 
              className="w-full h-64 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl p-4 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
              placeholder="Örn: 45 yaş kadın hasta, 2 saattir devam eden sol kola yayılan baskı tarzında göğüs ağrısı, terleme..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button onClick={analyzeCase} className="w-full mt-4" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Brain size={16} className="mr-2" />}
              Analiz Et
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!result && !loading ? (
            <Card variant="elevated" className="h-full flex flex-col items-center justify-center p-12 border-dashed border-2 opacity-50">
               <ListFilter size={48} className="mb-4" />
               <p>Klinik veri bekleniyor...</p>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              {result && (
                <>
                  <Card variant="bordered" className="border-t-4 border-t-[var(--color-warning)]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <AlertTriangle size={18} className="text-[var(--color-warning)]" />
                        Ayırıcı Tanılar (DDx)
                      </h3>
                      <Badge variant={result.urgency === 'high' ? 'destructive' : 'warning'}>
                        Aciliyet: {result.urgency?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {result.diagnoses?.map((d: any, i: number) => (
                        <div key={i} className="p-3 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm">{d.name}</span>
                            <span className="text-xs text-[var(--color-primary)] font-bold">%{d.probability}</span>
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)]">{d.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card variant="bordered">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                      Önerilen Tetkikler
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.tests?.map((t: string, i: number) => (
                        <Badge key={i} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}