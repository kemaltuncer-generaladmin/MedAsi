"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { 
  Newspaper, Calendar, Target, CheckCircle, Circle, 
  TrendingUp, BookOpen, Lightbulb, ChevronRight, Activity, 
  Sparkles, Loader2, Brain 
} from "lucide-react";
import toast from "react-hot-toast";

export default function DailyBriefingPage() {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const GOALS_KEY = "medasi_daily_goals";
  const todayKey = new Date().toISOString().split("T")[0];

  const defaultGoals = [
    { text: "AI Tanı Modülünde 1 analiz yap", done: false },
    { text: "Vaka RPG'de 1 vaka tamamla", done: false },
    { text: "25 dakika odaklanmış çalışma (Pomodoro)", done: false },
  ];

  function loadGoals() {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (!raw) return defaultGoals;
      const saved = JSON.parse(raw);
      if (saved.date !== todayKey) return defaultGoals;
      return saved.goals ?? defaultGoals;
    } catch {
      return defaultGoals;
    }
  }

  const [goals, setGoals] = useState(defaultGoals);

  useEffect(() => {
    setGoals(loadGoals());
    generateBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateBriefing() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Bugün için bana özel bir brifing hazırla. Günaydın mesajı, zayıf alanıma göre odak konusu, 3 yeni hedef ve 1 klinik ipucu ver. Format: JSON değil, yapılandırılmış metin ver.", 
          model: "EFFICIENT", 
          module: "daily-briefing" 
        }),
      });

      if (!res.ok) throw new Error("Brifing alınamadı.");
      const data = await res.json();
      const text = data?.response?.text ?? data?.text ?? "";
      if (!text) throw new Error("Brifing alınamadı.");
      setAiData(text);
    } catch (e) {
      toast.error("Sabah raporu şu an hazırlanamadı.");
    } finally {
      setLoading(false);
    }
  }

  const toggleGoal = (index: number) => {
    const newGoals = goals.map((g, i) =>
      i === index ? { ...g, done: !g.done } : g,
    );
    setGoals(newGoals);
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify({ date: todayKey, goals: newGoals }));
    } catch {
      // localStorage kotası doluysa sessizce geç
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Newspaper size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Günlük Brifing</h1>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm ml-1">Kişisel tıbbi gelişim özetin ve hedeflerin</p>
        </div>
        <Button variant="ghost" size="sm" onClick={generateBriefing} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
          <span className="ml-2">Güncelle</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
           <div className="h-64 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]"></div>
           <div className="h-64 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Card variant="elevated" className="relative overflow-hidden border-l-4 border-[var(--color-primary)]">
              <div className="absolute top-4 right-4 text-[var(--color-primary)]/20">
                <Sparkles size={48} />
              </div>
              <CardTitle className="flex items-center gap-2 mb-4 text-lg">
                <Brain size={18} className="text-[var(--color-primary)]" />
                Merkezi Beyin Raporu
              </CardTitle>
              <div className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap italic">
                {aiData || "Profilin analiz ediliyor, lütfen bekleyin..."}
              </div>
            </Card>

            <Card variant="bordered">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-[var(--color-primary)]" />
                <CardTitle>Bugünün Hedefleri</CardTitle>
              </div>
              <div className="flex flex-col gap-3">
                {goals.map((goal, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleGoal(i)}>
                    {goal.done ? (
                      <CheckCircle size={18} className="text-[var(--color-success)] shrink-0" />
                    ) : (
                      <Circle size={18} className="text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)]" />
                    )}
                    <span className={`text-sm ${goal.done ? "line-through text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}>
                      {goal.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card variant="bordered">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--color-primary)]" />
                <CardTitle>Haftalık İlerleme</CardTitle>
              </div>
              <div className="h-48 flex items-end gap-2 px-2">
                 {[40, 70, 45, 90, 65, 30, 0].map((val, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full rounded-t-md bg-[var(--color-primary)]/20 border-t-2 border-[var(--color-primary)] transition-all duration-700" 
                        style={{ height: `${val}%` }}
                      ></div>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i]}
                      </span>
                   </div>
                 ))}
              </div>
            </Card>
            
            <Card variant="bordered" className="bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={16} className="text-[var(--color-warning)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-warning)]">Uzman İpucu</span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                "Klinik verilerine göre Farmakoloji başarınız artıyor. Ancak renal doz ayarlamalarında hâlâ %30 hata payınız var. Kreatinin klerensi hesaplamalarını bu hafta rutin haline getirin."
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
