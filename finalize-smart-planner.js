const fs = require('fs');
const path = 'app/(dashboard)/planners/akilli/page.tsx';

const finalPlannerCode = `"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Clock, Brain, Loader2, Trash2, CalendarCheck, Info } from "lucide-react";
import toast from "react-hot-toast";

const PLAN_STORAGE_KEY = "medasi_active_smart_plan";

export default function AkilliPlanlayiciPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  // Sayfa yüklendiğinde eski planı getir
  useEffect(() => {
    const savedPlan = localStorage.getItem(PLAN_STORAGE_KEY);
    if (savedPlan) setPlan(savedPlan);
  }, []);

  async function generateSmartPlan() {
    setLoading(true);
    const loadingId = toast.loading("Merkezi beyin profilini ve hedeflerini analiz ediyor...");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Lütfen öğrenme profilimi oku. Zayıf konularıma (weakAreas) vaktimin `'ını, güçlü konularıma  'sini ayır. Günde en fazla 3 farklı konu belirle. Her günü Pomodoro blokları (25 dk çalışma, 5 dk mola) şeklinde planla. Pazartesi-Pazar tablosu oluştur.", 
          model: "EFFICIENT", 
          module: "planners-akilli" 
        }),
      });

      if (!res.ok) throw new Error("Plan oluşturulamadı.");

      const data = await res.json();
      const generatedPlan = data.response.text;
      
      setPlan(generatedPlan);
      localStorage.setItem(PLAN_STORAGE_KEY, generatedPlan);
      toast.success("Haftalık akıllı planın hazır ve kaydedildi!", { id: loadingId });
    } catch (e) {
      toast.error("Şu an plan oluşturulamıyor.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  function clearPlan() {
    if (confirm("Mevcut planı silmek istediğine emin misin?")) {
      setPlan(null);
      localStorage.removeItem(PLAN_STORAGE_KEY);
      toast.success("Plan temizlendi.");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20">
            <Sparkles size={24} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Akıllı Planlayıcı</h1>
            <p className="text-[var(--color-text-secondary)] text-sm italic">Soru Bankası başarısına göre dinamik haftalık program</p>
          </div>
        </div>
        <div className="flex gap-2">
          {plan && (
            <Button variant="ghost" size="sm" onClick={clearPlan} className="text-[var(--color-destructive)]">
              <Trash2 size={16} className="mr-2" /> Planı Sil
            </Button>
          )}
          <Button variant="primary" onClick={generateSmartPlan} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Brain size={16} className="mr-2" />}
            {plan ? "Planı Güncelle" : "Haftalık Plan Üret"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Odak", val: "Zayıf Alanlar", color: "var(--color-warning)" },
          { label: "Yöntem", val: "Pomodoro (25+5)", color: "var(--color-primary)" },
          { label: "Kapasite", val: "Maks 3 Konu/Gün", color: "var(--color-success)" },
          { label: "Veri Kaynağı", val: "Merkezi Profil", color: "var(--color-secondary)" },
        ].map((item, i) => (
          <Card key={i} variant="bordered" className="p-4 border-t-2" style={{ borderTopColor: item.color }}>
            <p className="text-[10px] text-[var(--color-text-secondary)] uppercase font-bold tracking-widest mb-1">{item.label}</p>
            <p className="text-sm text-[var(--color-text-primary)] font-semibold">{item.val}</p>
          </Card>
        ))}
      </div>

      {!plan && !loading ? (
        <Card variant="elevated" className="p-16 text-center flex flex-col items-center gap-6 border-dashed border-2 border-[var(--color-border)] bg-[var(--color-surface)]/50">
          <div className="w-20 h-20 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center shadow-inner">
            <CalendarCheck size={40} className="text-[var(--color-text-disabled)]" />
          </div>
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Kişisel Yol Haritan Hazır Değil</h2>
            <p className="text-[var(--color-text-secondary)] mt-2">
              Merkezi beyin, Soru Bankası'ndaki performansını analiz ederek senin için en verimli çalışma takvimini saniyeler içinde oluşturabilir.
            </p>
          </div>
          <Button onClick={generateSmartPlan} size="lg" className="px-10 h-14 text-lg shadow-lg shadow-[var(--color-primary)]/20">
            Planımı Hemen Oluştur
          </Button>
        </Card>
      ) : (
        <Card variant="bordered" className="p-0 overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              <span className="font-bold text-sm uppercase tracking-wider text-[var(--color-text-primary)]">Aktif Çalışma Takvimi</span>
            </div>
            <Badge variant="success" className="px-3 py-1">v1.0 Karar Destek</Badge>
          </div>
          <div className="p-8 bg-[var(--color-background)]">
             {loading ? (
               <div className="space-y-6 animate-pulse">
                 <div className="h-6 bg-[var(--color-surface-elevated)] rounded w-1/4"></div>
                 <div className="space-y-3">
                   <div className="h-4 bg-[var(--color-surface-elevated)] rounded w-full"></div>
                   <div className="h-4 bg-[var(--color-surface-elevated)] rounded w-5/6"></div>
                   <div className="h-4 bg-[var(--color-surface-elevated)] rounded w-full"></div>
                 </div>
               </div>
             ) : (
               <div className="prose prose-invert max-w-none">
                 <div className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-primary)] font-mono bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)]">
                   {plan}
                 </div>
               </div>
             )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-5 flex gap-4">
          <Info size={24} className="text-[var(--color-primary)] shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <strong>Nasıl Çalışır?</strong> Bu plan statik değildir. Soru çözdükçe zayıf alanların değiştikçe, "Planı Güncelle" butonuna bastığında Gemini yeni durumuna göre takvimi revize eder.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 p-5 flex gap-4">
          <Brain size={24} className="text-[var(--color-warning)] shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <strong>Zeka Notu:</strong> Programın `'ı profilindeki <strong>zayıf alanlara</strong>,  'si ise bilgini taze tutmak için <strong>güçlü alanlarına</strong> ayrılmıştır.
          </p>
        </div>
      </div>
    </div>
  );
}
";

try {
  fs.writeFileSync(path, finalPlannerCode);
  console.log("✅ Akıllı Planlayıcı (v1.0) Entegrasyon Standartlarına Göre Tamamlandı!");
} catch (e) {
  console.log("❌ Hata: Dosya güncellenemedi.");
}
