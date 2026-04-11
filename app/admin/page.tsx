"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";

type OverviewPayload = {
  kpis: Array<{ label: string; value: string; detail: string }>;
  health: Array<{ label: string; status: "healthy" | "warning"; detail: string }>;
  packageDistribution: Array<{ name: string; count: number; share: number }>;
  moderation: {
    openReports: number;
    supportQueue: number;
    errorLogs24h: number;
    warnLogs24h: number;
  };
  costlyServices: {
    ai: {
      enabled: boolean;
      probeOk: boolean;
      reason: string;
      detail: string;
    };
    walletPurchase: {
      enabled: boolean;
      detail: string;
    };
    database: {
      ok: boolean;
      detail: string;
    };
  };
  moduleHealth: Array<{ name: string; userAssignments: number; packageAssignments: number }>;
  recentUsers: Array<{ id: string; name: string; packageName: string; createdAt: string }>;
};

function statusColor(status: "healthy" | "warning") {
  return status === "healthy" ? "var(--color-success)" : "var(--color-warning)";
}

export default function AdminPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/overview")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("overview"))))
      .then((payload) => {
        if (active) setData(payload as OverviewPayload);
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
          Admin overview hazırlanıyor...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardTitle>Admin verisi alınamadı</CardTitle>
        <CardContent className="mt-4 text-sm">
          Overview API şu anda yanıt vermiyor. Lütfen birkaç saniye sonra yeniden deneyin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <section className="glass-panel rounded-3xl p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
              <ShieldCheck size={14} />
              Overview
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-[var(--color-text-primary)]">
              Platformu tek bakışta yönet
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
              Kullanıcı erişimi, AI hacmi, moderasyon riskleri ve modül dağılımı aynı operasyon yüzeyinde toplandı.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((item) => (
          <Card key={item.label}>
            <CardTitle className="text-base">{item.label}</CardTitle>
            <CardContent className="mt-4">
              <p className="text-3xl font-semibold text-[var(--color-text-primary)]">{item.value}</p>
              <p className="mt-2 text-sm">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit size={16} className="text-[var(--color-primary)]" />
              Sistem Sağlığı
            </CardTitle>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.health.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-[var(--color-border)] bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</p>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColor(item.status) }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={16} className="text-[var(--color-primary)]" />
              Paket Dağılımı
            </CardTitle>
            <div className="mt-5 space-y-3">
              {data.packageDistribution.map((item) => (
                <div key={item.name} className="rounded-3xl border border-[var(--color-border)] bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{item.count} kullanıcı</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${Math.max(8, item.share)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity size={16} className="text-[var(--color-primary)]" />
              Modül Sağlığı
            </CardTitle>
            <div className="mt-5 space-y-3">
              {data.moduleHealth.map((module) => (
                <div key={module.name} className="rounded-3xl border border-[var(--color-border)] bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{module.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {module.userAssignments} user · {module.packageAssignments} package
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle size={16} className="text-[var(--color-warning)]" />
              Moderasyon ve Risk
            </CardTitle>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">Açık rapor</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  {data.moderation.openReports}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">Destek kuyruğu</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  {data.moderation.supportQueue}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">24s log sinyali</p>
                <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                  {data.moderation.errorLogs24h} error · {data.moderation.warnLogs24h} warning
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Maliyetli Hizmetler</CardTitle>
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">AI Sağlığı</p>
                <p className="mt-2 text-[var(--color-text-primary)]">
                  {data.costlyServices.ai.enabled
                    ? data.costlyServices.ai.probeOk
                      ? "Aktif · Probe başarılı"
                      : `Aktif · Probe hata (${data.costlyServices.ai.reason})`
                    : "Kapalı"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">Cüzdan Satın Alma</p>
                <p className="mt-2 text-[var(--color-text-primary)]">
                  {data.costlyServices.walletPurchase.enabled ? "Açık" : "Bakım/Kapalı"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-3">
                <p className="medasi-panel-title">Veritabanı</p>
                <p className="mt-2 text-[var(--color-text-primary)]">
                  {data.costlyServices.database.ok ? "Sağlıklı" : "Erişim riski"}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Yeni Kullanıcılar</CardTitle>
            <div className="mt-5 space-y-3">
              {data.recentUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{user.packageName}</p>
                  <p className="mt-2 text-xs text-[var(--color-text-disabled)]">
                    {new Intl.DateTimeFormat("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(user.createdAt))}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
