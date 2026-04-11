"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  CalendarClock,
  ClipboardPlus,
  HeartPulse,
  History,
  LucideIcon,
  Sparkles,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAssistantConversations } from "@/lib/ai/client-memory";

type UsageData = {
  dailyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  packageName: string;
  modelUsage: { fast: number; efficient: number };
};

type HistoryEntry = {
  id: string;
  module: string;
  model: "FAST" | "EFFICIENT";
  createdAt: string;
};

type SurfaceItem = {
  href: string;
  title: string;
  desc: string;
  eyebrow: string;
  icon: LucideIcon;
  accent: string;
  stats?: string;
};

const surfaces: SurfaceItem[] = [
  {
    href: "/ai-assistant",
    title: "Medikal AI Asistan",
    desc: "Konuş, sadeleştir, nota dönüştür, flashcard üret ve aynı hafıza içinde ilerle.",
    eyebrow: "Core Surface",
    icon: Bot,
    accent: "var(--color-primary)",
  },
  {
    href: "/daily-briefing",
    title: "Günlük Brifing",
    desc: "Sana özel odak alanı, görevler ve klinik tekrar ritmi.",
    eyebrow: "Retention",
    icon: CalendarClock,
    accent: "var(--color-success)",
  },
  {
    href: "/ai-diagnosis",
    title: "AI Tanı Asistanı",
    desc: "Semptomdan DDx zincirine, test önceliğine ve kırmızı bayraklara geç.",
    eyebrow: "Clinical Reasoning",
    icon: Stethoscope,
    accent: "var(--color-warning)",
  },
  {
    href: "/ai-assistant/mentor",
    title: "Mentor AI",
    desc: "Performans, motivasyon ve çalışma ritmini tek kişisel koç katmanında birleştir.",
    eyebrow: "Coaching",
    icon: Brain,
    accent: "var(--color-secondary)",
  },
  {
    href: "/planners/akilli",
    title: "Akıllı Planlayıcı",
    desc: "Zayıf alanlarını haftalık sprintlere ve gerçek çalışma bloklarına dönüştür.",
    eyebrow: "Execution",
    icon: ClipboardPlus,
    accent: "var(--color-primary)",
  },
  {
    href: "/ai/history",
    title: "AI Geçmişi",
    desc: "Hangi modül seni daha çok taşıyor, ne kadar tüketiyorsun ve ritmin nasıl değişiyor gör.",
    eyebrow: "Telemetry",
    icon: History,
    accent: "var(--color-text-secondary)",
  },
];

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default function AIPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [assistantSessions, setAssistantSessions] = useState(0);

  useEffect(() => {
    setAssistantSessions(getAssistantConversations().length);

    void Promise.all([
      fetch("/api/ai/usage").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/ai/history?limit=8").then((res) => (res.ok ? res.json() : null)),
    ]).then(([usageData, historyData]) => {
      if (usageData) setUsage(usageData as UsageData);
      if (historyData?.history) setHistory(historyData.history as HistoryEntry[]);
    });
  }, []);

  const dailyPct = useMemo(() => {
    if (!usage?.dailyLimit) return 0;
    return Math.min((usage.dailyUsed / usage.dailyLimit) * 100, 100);
  }, [usage]);

  const topModules = useMemo(() => {
    const counts = new Map<string, number>();
    history.forEach((entry) => {
      counts.set(entry.module, (counts.get(entry.module) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [history]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section
        className="relative overflow-hidden rounded-3xl border p-8 md:p-10"
        style={{
          borderColor: "color-mix(in srgb, var(--color-primary) 24%, var(--color-border))",
          background:
            "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 32%), radial-gradient(circle at right center, color-mix(in srgb, var(--color-secondary) 16%, transparent), transparent 26%), linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 94%, transparent), color-mix(in srgb, var(--color-background) 96%, transparent))",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.24)",
        }}
      >
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] lg:block" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <Badge className="px-3 py-1 text-[11px] uppercase tracking-[0.28em]" variant="secondary">
              Premium AI Workspace
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[var(--color-text-primary)] text-balance md:text-5xl">
                Merkezi beyinle çalışan, modülleri uzmanlaştırılmış bir AI katmanı.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
                Medasi’nin asıl gücü tek bir chatbot değil; briefing, tanı, mentor, planlama ve dönüşüm akışlarının
                aynı merkezi beyinden beslenip kendi modül uzmanlığıyla çalışması. Bu merkez ekran artık o aklı tek
                bakışta açıyor.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 backdrop-blur-md">
                <CardTitle className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Günlük Kullanım
                </CardTitle>
                <CardContent className="mt-3 p-0">
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                    {usage ? `${usage.dailyUsed}/${usage.dailyLimit}` : "—"}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-elevated)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${dailyPct}%`,
                        background: "linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-success) 55%, var(--color-primary)))",
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 backdrop-blur-md">
                <CardTitle className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Aktif Hafıza
                </CardTitle>
                <CardContent className="mt-3 p-0">
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">{assistantSessions}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
                    Yerel olarak saklanan premium asistan oturumu
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 backdrop-blur-md">
                <CardTitle className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">
                  Bu Ay
                </CardTitle>
                <CardContent className="mt-3 p-0">
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">{usage?.monthlyUsed ?? "—"}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
                    {usage?.packageName ? `${usage.packageName} paketi ile çalışıyor` : "Paket bilgisi yükleniyor"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card
            className="rounded-3xl border p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--color-primary) 18%, var(--color-border))",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-surface-elevated) 92%, transparent), color-mix(in srgb, var(--color-surface) 82%, transparent))",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">AI Pulse</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Bugünkü Sistem Nabzı</h2>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
                <HeartPulse size={20} className="text-[var(--color-primary)]" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Model Dağılımı</span>
                  <Sparkles size={14} className="text-[var(--color-primary)]" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-3">
                    <p className="text-xs text-[var(--color-text-secondary)]">FAST</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {usage?.modelUsage.fast ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-surface-elevated)] p-3">
                    <p className="text-xs text-[var(--color-text-secondary)]">EFFICIENT</p>
                    <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                      {usage?.modelUsage.efficient ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">En Çok Dönen Modüller</p>
                <div className="mt-4 space-y-3">
                  {topModules.length > 0 ? (
                    topModules.map(([module, count], index) => (
                      <div key={module} className="flex items-center gap-3">
                        <div className="w-7 shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]">
                          0{index + 1}
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl bg-[var(--color-surface-elevated)] px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm text-[var(--color-text-primary)]">{module}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">{count} kez</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                      Sistem kullanım verisi geldikçe burada gerçek akış önceliklerin görünecek.
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/ai/wallet"
                className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-elevated)]"
              >
                <span className="inline-flex items-center gap-2">
                  <Wallet size={15} className="text-[var(--color-primary)]" />
                  Token & bütçe katmanını aç
                </span>
                <ArrowRight size={15} className="text-[var(--color-text-secondary)]" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {surfaces.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card
                className="h-full rounded-3xl border p-6 transition-transform duration-200 hover:-translate-y-1"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-border) 84%, transparent)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 96%, transparent), color-mix(in srgb, var(--color-surface-elevated) 88%, transparent))",
                }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: `color-mix(in srgb, ${item.accent} 34%, transparent)`,
                    background: `linear-gradient(135deg, color-mix(in srgb, ${item.accent} 18%, transparent), transparent)`,
                  }}
                >
                  <item.icon size={20} style={{ color: item.accent }} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">{item.eyebrow}</p>
                <CardTitle className="mt-3 text-xl transition-colors group-hover:text-[var(--color-primary)]">
                  {item.title}
                </CardTitle>
                <CardContent className="mt-3 text-sm leading-7">{item.desc}</CardContent>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">Deneyimi aç</span>
                  <ArrowRight
                    size={16}
                    className="text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="rounded-3xl border p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Lock-In Blueprint</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">Bırakılamayan ürün katmanı</h2>
          <div className="mt-6 space-y-4">
            {[
              "Her AI çıktısı not, görev, kart veya klinik akış objesine dönüşmeli.",
              "Asistan, mentor, briefing ve planner aynı kullanıcı hafızasını paylaşmalı.",
              "Sistem kullanıcı çağırmadan da sabah-akşam ritüel üretmeli.",
              "Kullanıcı hangi kararı neden verdiğini kendi geçmişiyle birlikte görmeli.",
            ].map((point, index) => (
              <div key={point} className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface)] px-4 py-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Usage Pressure</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              Günlük limitin{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">{formatPercent(dailyPct)}</span>{" "}
              doluysa, kullanıcı zaten AI katmanına düzenli giriyor demektir. Bundan sonrası her girişte yeni değer
              hissettirmek.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
