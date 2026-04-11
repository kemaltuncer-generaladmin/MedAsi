const fs = require('fs');
const path = 'app/(dashboard)/planners/akilli/page.tsx';

const smartPlannerCode = `"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Calendar, Clock, Brain, Loader2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function AkilliPlanlayiciPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  async function generateSmartPlan() {
    setLoading(true);
    const loadingId = toast.loading("Merkezi beyin profilini ve hedeflerini analiz ediyor...");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Lütfen öğrenme profilimi analiz et ve zayıf konularıma `, güçlü konularıma   ağırlık vererek haftalık bir çalışma planı oluştur. Pomodoro bloklarını dahil et.", 
          model: "EFFICIENT", 
          module: "planners-akilli" 
        }),
      });

      if (!res.ok) throw new Error("Plan oluşturulamadı.");

      const data = await res.json();
      setPlan(data.response.text);
      toast.success("Haftalık akıllı planın hazır!", { id: loadingId });
    } catch (e) {
      toast.error("Şu an plan oluşturulamıyor, lütfen tekrar deneyin.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Sparkles size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Akıllı Planlayıcı</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">Profiline ve hedeflerine göre optimize edilmiş çalışma takvimi</p>
          </div>
        </div>
        <Button variant="primary" onClick={generateSmartPlan} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Brain size={16} className="mr-2" />}
          Planı Yeniden Oluştur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold mb-1">Strateji</p>
          <p className="text-sm text-[var(--color-text-primary)] font-medium">Zayıf Alan Odaklı (`)</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold mb-1">Metot</p>
          <p className="text-sm text-[var(--color-text-primary)] font-medium">Pomodoro Döngüleri</p>
        </Card>
        <Card variant="bordered" className="p-4">
          <p className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold mb-1">Kaynak</p>
          <p className="text-sm text-[var(--color-text-primary)] font-medium">Öğrenme Profili Entegre</p>
        </Card>
      </div>

      {!plan && !loading ? (
        <Card variant="elevated" className="p-12 text-center flex flex-col items-center gap-4 border-dashed border-2 border-[var(--color-border)]">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
            <Calendar size={32} className="text-[var(--color-text-secondary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Henüz Bir Plan Yok</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Butona basarak zayıf olduğun konuları kapatacak bir program oluşturabilirsin.</p>
          </div>
          <Button onClick={generateSmartPlan} size="lg">Haftalık Planımı Hazırla</Button>
        </Card>
      ) : (
        <Card variant="bordered" className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[var(--color-primary)]" />
              <span className="font-semibold text-sm">Haftalık Kişisel Programın</span>
            </div>
            <Badge variant="success">Aktif Plan</Badge>
          </div>
          <div className="p-6">
             {loading ? (
               <div className="space-y-4 animate-pulse">
                 <div className="h-4 bg-[var(--color-surface)] rounded w-3/4"></div>
                 <div className="h-4 bg-[var(--color-surface)] rounded w-full"></div>
                 <div className="h-4 bg-[var(--color-surface)] rounded w-5/6"></div>
               </div>
             ) : (
               <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-secondary)]">
                 {plan}
               </div>
             )}
          </div>
        </Card>
      )}

      <div className="rounded-xl border-l-4 border-[var(--color-warning)] bg-[var(--color-warning)]/5 p-4 flex gap-3">
        <Brain size={20} className="text-[var(--color-warning)] shrink-0" />
        <p className="text-xs text-[var(--color-text-secondary)]">
          <strong>AI Notu:</strong> Bu plan, Soru Bankası performansına göre dinamik olarak güncellenir. 
          Zayıf olduğun konuları çalıştıkça programın otomatik olarak yeni eksiklerine odaklanacaktır.
        </p>
      </div>
    </div>
  );
}
";

try {
  fs.writeFileSync(path, smartPlannerCode);
  console.log("✅ Akıllı Planlayıcı Modülü Merkezi Beyne Bağlandı!");
} catch (e) {
  console.log("❌ Hata: Dosya güncellenemedi.");
}
