"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Newspaper,
  Target,
  CheckCircle,
  Circle,
  TrendingUp,
  Lightbulb,
  Activity,
  Sparkles,
  Loader2,
  Brain,
} from "lucide-react";
import toast from "react-hot-toast";

type DailyGoal = { id: string; text: string; done: boolean };
type DailyGoalsSnapshot = { date: string; goals: DailyGoal[] };

const DEFAULT_GOALS: DailyGoal[] = [
  { id: "goal-1", text: "Bugün 25 dk odaklanmış çalış (Pomodoro)", done: false },
  { id: "goal-2", text: "AI ile en az 1 konu pekiştir", done: false },
  { id: "goal-3", text: "Zayıf alanında 5 soru çöz", done: false },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultGoals(): DailyGoal[] {
  return DEFAULT_GOALS.map((goal) => ({ ...goal }));
}

function normalizeGoalItem(value: unknown, index: number): DailyGoal | null {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    return { id: `legacy-goal-${index + 1}`, text, done: false };
  }

  if (!isRecord(value)) return null;

  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text) return null;

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `goal-${index + 1}`,
    text,
    done: Boolean(value.done),
  };
}

function normalizeDailyGoals(value: unknown): DailyGoalsSnapshot {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  if (Array.isArray(value)) {
    return {
      date: todayKey,
      goals: value
        .map((item, index) => normalizeGoalItem(item, index))
        .filter((item): item is DailyGoal => item !== null),
    };
  }

  if (isRecord(value)) {
    const date = typeof value.date === "string" ? value.date : todayKey;
    const rawGoals = Array.isArray(value.goals) ? value.goals : [];
    return {
      date,
      goals: rawGoals
        .map((item, index) => normalizeGoalItem(item, index))
        .filter((item): item is DailyGoal => item !== null),
    };
  }

  return {
    date: todayKey,
    goals: cloneDefaultGoals(),
  };
}

export default function DailyBriefingPage() {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<string | null>(null);
  const [goals, setGoals] = useState<DailyGoal[]>(cloneDefaultGoals());

  useEffect(() => {
    async function loadGoals() {
      try {
        const res = await fetch("/api/dashboard/goals");
        if (!res.ok) throw new Error("Goals load failed");
        const data = await res.json();
        setGoals(normalizeDailyGoals(data).goals);
      } catch {
        setGoals(cloneDefaultGoals());
      }
    }

    void loadGoals();
  }, []);

  async function generateBriefing() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Bugün için bana özel bir brifing hazırla. Günaydın mesajı, zayıf alanıma göre odak konusu, 3 kısa hedef ve 1 klinik ipucu ver. Yapıyı başlıklar halinde kur, satırları kısa tut ve 3 paragraftan uzun olma.",
          model: "EFFICIENT",
          module: "daily-briefing",
          maxOutputTokens: 700,
        }),
      });

      if (!res.ok) throw new Error("Brifing alınamadı.");
      const data = await res.json();
      const text = data?.response?.text ?? data?.text ?? "";
      if (!text) throw new Error("Brifing alınamadı.");
      setAiData(text);
    } catch {
      toast.error("Sabah raporu şu an hazırlanamadı.");
    } finally {
      setLoading(false);
    }
  }

  const toggleGoal = async (index: number) => {
    const nextGoals = goals.map((goal, i) => (i === index ? { ...goal, done: !goal.done } : goal));
    setGoals(nextGoals);

    try {
      const res = await fetch("/api/dashboard/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });

      if (!res.ok) throw new Error("Goals save failed");
      const data = await res.json();
      setGoals(normalizeDailyGoals(data).goals);
    } catch {
      toast.error("Hedef güncellenemedi.");
    }
  };

  const doneCount = goals.filter((goal) => goal.done).length;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Newspaper size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Günlük Brifing</h1>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm ml-1">
            Kişisel tıbbi gelişim özetin ve hedeflerin
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={generateBriefing} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
          <span className="ml-2">Güncelle</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]" />
          <div className="h-64 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]" />
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
              <div className="max-h-96 overflow-y-auto pr-2 text-sm leading-7 text-[var(--color-text-secondary)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {aiData || "Brifingi üretmek için 'Güncelle' butonuna basın."}
              </div>
            </Card>

            <Card variant="bordered">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[var(--color-primary)]" />
                  <CardTitle>Bugünün Hedefleri</CardTitle>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)]">{doneCount}/{goals.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {goals.map((goal, index) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => void toggleGoal(index)}
                    className="flex items-start gap-3 cursor-pointer group px-3 py-2 rounded-xl transition-colors hover:bg-[var(--color-surface)] text-left"
                  >
                    {goal.done ? (
                      <CheckCircle size={18} className="text-[var(--color-success)] shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={18} className="text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)] mt-0.5" />
                    )}
                    <span
                      className={`text-sm leading-6 whitespace-normal break-words [overflow-wrap:anywhere] ${goal.done ? "line-through text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}
                    >
                      {goal.text}
                    </span>
                  </button>
                ))}

                {goals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                    Bugün için henüz hedef yok. Dashboard'dan yeni hedef ekleyebilirsin.
                  </div>
                )}
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
                {[40, 70, 45, 90, 65, 30, 0].map((val, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-[var(--color-primary)]/20 border-t-2 border-[var(--color-primary)] transition-all duration-700"
                      style={{ height: `${val}%` }}
                    />
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][index]}
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
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                "Klinik verilerine göre Farmakoloji başarınız artıyor. Ancak renal doz ayarlamalarında hâlâ %30 hata payınız var. Kreatinin klerensi hesaplamalarını bu hafta rutin haline getirin."
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
