"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { getStoredBriefing, getTodayKey, saveStoredBriefing } from "@/lib/ai/client-memory";

type DailyGoal = { id: string; text: string; done: boolean };
type UsageData = {
  dailyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  modelUsage: { fast: number; efficient: number };
};
type HistoryEntry = { id: string; module: string; createdAt: string };

const DEFAULT_GOALS: DailyGoal[] = [
  { id: "goal-1", text: "Bir zayıf alanı 25 dakikalık blokla temizle", done: false },
  { id: "goal-2", text: "AI ile bir konuyu not veya karta dönüştür", done: false },
  { id: "goal-3", text: "Bugün en az 5 soru ile hatayı görünür kıl", done: false },
];

function normalizeGoals(value: unknown): DailyGoal[] {
  if (!Array.isArray(value)) return DEFAULT_GOALS.map((goal) => ({ ...goal }));
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { id?: unknown; text?: unknown; done?: unknown };
      if (typeof candidate.text !== "string" || !candidate.text.trim()) return null;
      return {
        id: typeof candidate.id === "string" ? candidate.id : `goal-${index + 1}`,
        text: candidate.text.trim(),
        done: Boolean(candidate.done),
      };
    })
    .filter((item): item is DailyGoal => item !== null);
}

function splitBriefingSections(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const defaults = [
    "Bugünün odağı için tek bir zayıf alan seç ve önce onu temizle.",
    "En büyük risk dikkat dağınıklığı ve plansız tekrar döngüsü.",
    "Mikro kazanım için 25 dakikalık blok + 5 soru yeterli.",
    "Sonraki en iyi adım briefing sonrası doğrudan odak oturumuna geçmek.",
  ];

  return {
    focus: lines[0] ?? defaults[0],
    risk: lines[1] ?? defaults[1],
    microWin: lines[2] ?? defaults[2],
    nextStep: lines[3] ?? defaults[3],
  };
}

export default function DailyBriefingPage() {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<string>("");
  const [goals, setGoals] = useState<DailyGoal[]>(DEFAULT_GOALS.map((goal) => ({ ...goal })));
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const todayKey = getTodayKey();

  useEffect(() => {
    const stored = getStoredBriefing();
    if (stored?.date === todayKey) {
      setBriefing(stored.content);
      setGoals(normalizeGoals(stored.goals));
    }

    void Promise.all([
      fetch("/api/dashboard/goals").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/ai/usage").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/ai/history?limit=14").then((res) => (res.ok ? res.json() : null)),
    ]).then(([goalData, usageData, historyData]) => {
      if (goalData) setGoals(normalizeGoals(goalData.goals ?? goalData));
      if (usageData) setUsage(usageData as UsageData);
      if (historyData?.history) setHistory(historyData.history as HistoryEntry[]);
    });
  }, [todayKey]);

  const topModule = useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach((entry) => counts.set(entry.module, (counts.get(entry.module) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mentor";
  }, [history]);

  async function persistGoals(nextGoals: DailyGoal[]) {
    setGoals(nextGoals);
    saveStoredBriefing({
      date: todayKey,
      content: briefing,
      goals: nextGoals,
      focusLabel: topModule,
    });

    try {
      const res = await fetch("/api/dashboard/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });
      if (!res.ok) throw new Error("Goals save failed");
    } catch {
      toast.error("Hedefler kaydedilirken sorun oluştu.");
    }
  }

  const generateBriefing = useCallback(async (force = false) => {
    if (loading) return;
    if (!force && briefing) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            "Bugün için premium bir kişisel briefing üret.",
            "Yalnızca dört kısa satır döndür.",
            "Satır sırası: Bugünün Odağı / En Büyük Risk / Mikro Kazanım / Sonraki En İyi Adım.",
            "Tıp öğrencisi veya genç hekim tonuna uygun yaz.",
            "Odak, tekrar ve klinik karar desteğini birleştir.",
          ].join("\n"),
          model: "EFFICIENT",
          module: "daily-briefing",
          maxOutputTokens: 500,
        }),
      });

      if (!res.ok) throw new Error("Brifing alınamadı.");
      const data = await res.json();
      const text = String(data?.response?.text ?? data?.text ?? "").trim();
      if (!text) throw new Error("Boş briefing");
      setBriefing(text);
      saveStoredBriefing({
        date: todayKey,
        content: text,
        goals,
        focusLabel: topModule,
      });
    } catch {
      toast.error("Günlük briefing şu an üretilemedi.");
    } finally {
      setLoading(false);
    }
  }, [briefing, goals, loading, todayKey, topModule]);

  useEffect(() => {
    if (!briefing) {
      void generateBriefing(false);
    }
  }, [briefing, generateBriefing]);

  const sections = splitBriefingSections(briefing);
  const completedGoals = goals.filter((goal) => goal.done).length;
  const weeklyBars = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label) => {
    const count = history.filter((entry) => {
      const day = new Date(entry.createdAt).getDay();
      const normalized = day === 0 ? 6 : day - 1;
      return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][normalized] === label;
    }).length;
    return { label, count };
  });
  const maxBar = Math.max(1, ...weeklyBars.map((bar) => bar.count));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <div className="space-y-6">
        <section className="glass-panel rounded-3xl p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
                <Sparkles size={14} />
                Retention Ritual
              </div>
              <h1 className="mt-5 text-3xl font-semibold text-[var(--color-text-primary)]">
                Günlük Brifing
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
                Briefing artık tek metin değil; bugünün riskini, mikro kazanımını ve bir sonraki doğru adımı tek akışta verir.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => void generateBriefing(true)} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                Yeniden üret
              </Button>
              <Link href="/pomodoro">
                <Button>
                  <ArrowRight size={16} />
                  Göreve dönüştür
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="min-h-[220px]">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target size={16} className="text-[var(--color-primary)]" />
              Bugünün Odağı
            </CardTitle>
            <CardContent className="mt-4 text-base leading-8 text-[var(--color-text-primary)]">
              {sections.focus}
            </CardContent>
          </Card>

          <Card className="min-h-[220px]">
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert size={16} className="text-[var(--color-warning)]" />
              En Büyük Risk
            </CardTitle>
            <CardContent className="mt-4 text-base leading-8 text-[var(--color-text-primary)]">
              {sections.risk}
            </CardContent>
          </Card>

          <Card className="min-h-[220px]">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 size={16} className="text-[var(--color-success)]" />
              Mikro Kazanım
            </CardTitle>
            <CardContent className="mt-4 text-base leading-8 text-[var(--color-text-primary)]">
              {sections.microWin}
            </CardContent>
          </Card>

          <Card className="min-h-[220px]">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain size={16} className="text-[var(--color-primary)]" />
              Sonraki En İyi Adım
            </CardTitle>
            <CardContent className="mt-4 text-base leading-8 text-[var(--color-text-primary)]">
              {sections.nextStep}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardTitle className="text-base">Bugünün Hedefleri</CardTitle>
          <div className="mt-5 space-y-3">
            {goals.map((goal, index) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  const nextGoals = goals.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, done: !item.done } : item,
                  );
                  void persistGoals(nextGoals);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-elevated)]"
              >
                <CheckCircle2
                  size={18}
                  className={goal.done ? "text-[var(--color-success)]" : "text-[var(--color-text-disabled)]"}
                />
                <span className="text-sm leading-7 text-[var(--color-text-primary)]">{goal.text}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardTitle className="text-base">Bugün Önerilen Modül</CardTitle>
          <CardContent className="mt-4">
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{topModule}</p>
            <p className="mt-2 text-sm leading-7">
              Son AI kullanım paterni bu alan etrafında dönüyor. Brifingi burada aksiyona çevirmek en hızlı kazanımı verir.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="text-base">7 Günlük AI / Çalışma Pateni</CardTitle>
          <div className="mt-5 flex items-end gap-3">
            {weeklyBars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-[var(--color-primary)]/15"
                  style={{ height: `${Math.max(16, (bar.count / maxBar) * 120)}px` }}
                />
                <span className="text-[11px] text-[var(--color-text-secondary)]">{bar.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle className="text-base">Kullanım Özeti</CardTitle>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Hedef Tamamlama</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                {completedGoals}/{goals.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Aylık AI Kullanımı</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                {usage?.monthlyUsed ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Model Dağılımı</p>
              <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                FAST {usage?.modelUsage.fast ?? 0} · EFFICIENT {usage?.modelUsage.efficient ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}
