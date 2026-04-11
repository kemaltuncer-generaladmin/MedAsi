"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Layers,
  Loader2,
  Presentation,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import type { StudyWorkspace } from "@/types";

export default function StudyCorePage() {
  const [data, setData] = useState<StudyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/study/workspace", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("study-workspace"))))
      .then((payload) => {
        if (active) setData(payload as StudyWorkspace);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel flex items-center gap-3 rounded-3xl px-6 py-4 text-sm text-[var(--color-text-secondary)]">
          <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
          Study core yükleniyor...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardTitle>Çalışma yüzeyi yüklenemedi</CardTitle>
        <CardContent className="mt-3 text-sm">
          Ortak çalışma verisi şu an alınamıyor. Birkaç saniye sonra tekrar deneyin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
      <div className="space-y-6">
        <section className="glass-panel overflow-hidden rounded-3xl p-6 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_320px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
                <Brain size={14} />
                Study Core
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-[var(--color-text-primary)] md:text-4xl">
                Çalışma omurgan tek yüzeyde toplandı.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
                Hatalı sorular, kart tekrarları, haftalık plan ve materyal kalitesi artık aynı karar akışında.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/questions">
                  <Button>
                    <Target size={16} />
                    Çalışma Merkezi
                  </Button>
                </Link>
                <Link href="/materials">
                  <Button variant="secondary">
                    <Presentation size={16} />
                    Materyal Kalitesini Gör
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--color-border)] bg-black/10 p-5">
              <p className="medasi-panel-title">Odak özeti</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
                  <p className="text-xs text-[var(--color-text-disabled)]">Zayıf alan</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {data.focus.weakAreas[0] ?? "Henüz analiz yok"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
                  <p className="text-xs text-[var(--color-text-disabled)]">Doğruluk</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    %{data.focus.accuracy}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
                  {data.plan?.content?.trim()
                    ? "Bu hafta için aktif bir planın var; ritmi bozmadan devam et."
                    : "Bu hafta için henüz plan kurulmamış. Önce haftalık yönünü sabitle."}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {data.highlights.map((item) => (
            <Card key={item.label}>
              <CardTitle className="text-base">{item.label}</CardTitle>
              <CardContent className="mt-4">
                <p className="text-3xl font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                <Link href={item.href} className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-primary)]">
                  Aç
                  <ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardTitle className="text-base">Çalışma önerileri</CardTitle>
            <div className="mt-5 space-y-3">
              {data.recommendations.length > 0 ? data.recommendations.map((item) => (
                <Link
                  key={item.id}
                  href={item.href ?? "/questions"}
                  className="flex items-start justify-between gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 transition-colors hover:bg-[var(--color-surface-elevated)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.body}</p>
                  </div>
                  <ArrowRight size={15} className="mt-0.5 text-[var(--color-primary)]" />
                </Link>
              )) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Yeni öneriler için soru, kart veya materyal aktivitesi gerekiyor.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Materyal sinyalleri</CardTitle>
            <div className="mt-5 space-y-3">
              {data.materials.length > 0 ? data.materials.map((item) => (
                <Link
                  key={item.id}
                  href={`/materials?material=${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 transition-colors hover:bg-[var(--color-surface-elevated)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {item.branch} · kalite {item.qualityScore ?? "-"} · slayt {item.slideCount ?? "-"}
                    </p>
                  </div>
                  <ArrowRight size={15} className="text-[var(--color-primary)]" />
                </Link>
              )) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Henüz analiz edilmiş materyal bulunmuyor.
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers size={16} className="text-[var(--color-primary)]" />
            Operasyon sayacı
          </CardTitle>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Hatalı sorular</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{data.counts.wrongQuestions}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Tekrar bekleyen kart</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{data.counts.flashcardsDue}</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Hazır materyal</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{data.counts.readyMaterials}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2 text-base">
            <TriangleAlert size={16} className="text-[var(--color-warning)]" />
            Ritmi koru
          </CardTitle>
          <CardContent className="mt-4 text-sm leading-7">
            Önce zayıf alanı sabitle, sonra materyalden soru veya kart üret, en sonda Mentor AI ile kapanış içgörüsü al.
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
