"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CalendarCheck,
  CalendarDays,
  Info,
  Loader2,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { getStoredPlan, getWeekKey } from "@/lib/ai/client-memory";

type UsageData = {
  dailyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  modelUsage: { fast: number; efficient: number };
};

const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function splitPlanIntoDays(plan: string) {
  return DAY_LABELS.map((day) => {
    const regex = new RegExp(`${day}[\\s\\S]*?(?=${DAY_LABELS.filter((item) => item !== day).join("|")}|$)`, "i");
    const match = plan.match(regex);
    return {
      day,
      content: (match?.[0] ?? "").replace(new RegExp(`^${day}\\s*:?\\s*`, "i"), "").trim() || "AI bu gün için ayrı bir blok üretmedi.",
    };
  });
}

export default function AkilliPlanlayiciPage() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string>("");
  const [sourceSummary, setSourceSummary] = useState("Zayıf alanlar + günlük AI ritmi");
  const [usage, setUsage] = useState<UsageData | null>(null);

  const weekKey = getWeekKey();

  useEffect(() => {
    const stored = getStoredPlan();
    let importedLocal = false;

    if (stored?.weekKey === weekKey) {
      setPlan(stored.markdown);
      setSourceSummary(stored.sourceSummary);
    }

    void fetch(`/api/study/plans?weekKey=${encodeURIComponent(weekKey)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.plan?.content) {
          setPlan(data.plan.content as string);
          setSourceSummary((data.plan.sourceSummary as string) || sourceSummary);
          return;
        }
        if (stored?.weekKey === weekKey && stored.markdown && !importedLocal) {
          importedLocal = true;
          void fetch("/api/study/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weekKey,
              sourceSummary: stored.sourceSummary,
              content: stored.markdown,
            }),
          }).catch(() => {});
        }
      });

    void fetch("/api/ai/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUsage(data as UsageData);
      });
  }, [weekKey]);

  async function generateSmartPlan() {
    setLoading(true);
    const loadingId = toast.loading("Haftalık sprint planı hazırlanıyor…");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            "Merkezi beyindeki öğrenme profilimi ve kullanım ritmimi düşünerek premium bir haftalık çalışma planı hazırla.",
            "Pazartesi-Pazar başlıklarıyla yaz.",
            "Her gün en fazla 3 odak, 2-4 pomodoro bloğu ve bir kapanış cümlesi olsun.",
            "Zayıf alanlara ağırlık ver, ama güçlü alanlardan bir tekrar dokunuşu da bırak.",
            "Çıktıyı okunaklı başlıklar ve kısa satırlarla ver.",
          ].join("\n"),
          model: "EFFICIENT",
          module: "planners-akilli",
        }),
      });

      if (!res.ok) throw new Error("Plan oluşturulamadı.");
      const data = await res.json();
      const nextPlan = data?.response?.text ?? data?.text ?? "";
      if (!nextPlan) throw new Error("Plan boş döndü.");
      setPlan(nextPlan);
      await fetch("/api/study/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekKey,
          sourceSummary,
          content: nextPlan,
        }),
      });
      toast.success("Haftalık akıllı plan hazır.", { id: loadingId });
    } catch {
      toast.error("Plan şu an üretilemedi.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  function clearPlan() {
    setPlan("");
    void fetch("/api/study/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekKey,
        sourceSummary: "",
        content: "",
      }),
    }).catch(() => {});
    toast.success("Haftalık plan temizlendi.");
  }

  const days = useMemo(() => splitPlanIntoDays(plan), [plan]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section
        className="rounded-3xl border p-7"
        style={{
          borderColor: "color-mix(in srgb, var(--color-primary) 20%, var(--color-border))",
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 94%, transparent), color-mix(in srgb, var(--color-background) 97%, transparent))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
              <Sparkles size={24} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Execution Layer</p>
              <h1 className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">Akıllı Planlayıcı</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Merkezi beyinden gelen eksikleri haftalık sprintlere dönüştüren premium plan yüzeyi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {plan && (
              <Button variant="ghost" size="sm" onClick={clearPlan}>
                <Trash2 size={14} />
                Temizle
              </Button>
            )}
            <Button onClick={generateSmartPlan} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {plan ? "Planı Yeniden Kur" : "Haftalık Plan Üret"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Odak", value: "Zayıf Alan Sprintleri", icon: Target },
          { label: "Yöntem", value: "Pomodoro + kapanış", icon: Brain },
          { label: "Zemin", value: sourceSummary, icon: Info },
          { label: "Günlük Limit", value: usage ? `${usage.dailyUsed}/${usage.dailyLimit}` : "—", icon: CalendarDays },
        ].map((item) => (
          <Card key={item.label} className="rounded-3xl border p-4" variant="bordered">
            <div className="flex items-center gap-2">
              <item.icon size={15} className="text-[var(--color-primary)]" />
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">{item.label}</p>
            </div>
            <p className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{item.value}</p>
          </Card>
        ))}
      </div>

      {!plan && !loading ? (
        <Card className="flex flex-col items-center gap-6 rounded-3xl border border-dashed p-14 text-center" variant="elevated">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] shadow-inner">
            <CalendarCheck size={40} className="text-[var(--color-text-disabled)]" />
          </div>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Bu haftanın rotası henüz kurulu değil</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              Güçlü bir AI planner yalnızca metin üretmez; kullanıcıyı haftaya bağlar. Bu yüzey artık haftayı gün gün
              okunur sprint bloklarına çeviriyor ve aynı haftada hafızasını koruyor.
            </p>
          </div>
          <Button onClick={generateSmartPlan} size="lg">
            Planımı Hemen Kur
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border p-0 overflow-hidden" variant="bordered">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
                  Aktif Hafta Planı
                </span>
              </div>
              <Badge variant="success">Week Memory</Badge>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="space-y-3">
                  <div className="medasi-shimmer-line w-1/3" />
                  <div className="medasi-shimmer-line w-full" />
                  <div className="medasi-shimmer-line w-5/6" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {days.map((day, index) => (
                    <div key={day.day} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                        Gün 0{index + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">{day.day}</h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-secondary)]">
                        {day.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-3xl border p-5" variant="bordered">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Planner Note</p>
              <CardTitle className="mt-3 text-xl">Neden daha güçlü?</CardTitle>
              <CardContent className="mt-3 p-0 text-sm leading-7">
                Plan aynı hafta içinde saklanıyor; kullanıcı her girişte sıfırdan başlamıyor. Lock-in etkisi yalnızca
                görsel kaliteyle değil, devamlılıkla oluşur.
              </CardContent>
            </Card>

            <Card className="rounded-3xl border p-5" variant="bordered">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Ürün İlkesi</p>
              <CardContent className="mt-3 p-0 text-sm leading-7 text-[var(--color-text-primary)]">
                Planın içinde her gün net odak, tekrar ve kapanış cümlesi olmalı. Kullanıcı “bugün ne yapacağım?”
                sorusunu başka yerde sormamalı.
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
