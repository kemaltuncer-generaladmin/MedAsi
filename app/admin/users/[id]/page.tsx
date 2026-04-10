import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Activity, BrainCircuit, Coins, Layers3, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { parseAiUsageEventFromLog } from "@/lib/ai/telemetry";
import { getCurrencySettings, formatUsd } from "@/lib/currency";
import { ensureUsageTrackingSchema } from "@/lib/db/schema-guard";

export const dynamic = "force-dynamic";

function formatInt(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureUsageTrackingSchema();
  const [{ role }, { id: userId }] = await Promise.all([
    getCurrentUserWithRole(),
    params,
  ]);

  if (role !== "admin") {
    redirect("/login?mode=admin");
  }

  const [user, logs, moduleActivities, tokenTransactions, currency] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        package: true,
        tokenWallet: true,
      },
    }),
    prisma.systemLog.findMany({
      where: {
        userId,
        OR: [{ category: "ai" }, { message: "AI_USAGE_EVENT" }],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.moduleActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    getCurrencySettings(),
  ]);

  if (!user) notFound();

  const aiEvents = logs
    .map((log) =>
      parseAiUsageEventFromLog({
        createdAt: log.createdAt,
        details: log.details,
        userId: log.userId,
        message: log.message,
      }),
    )
    .filter((event): event is NonNullable<ReturnType<typeof parseAiUsageEventFromLog>> => Boolean(event));

  const totalAiCostUsd = aiEvents.reduce((sum, event) => sum + event.costUsd, 0);
  const totalAiTokens = aiEvents.reduce((sum, event) => sum + event.totalTokens, 0);
  const modelBreakdown = Array.from(
    aiEvents.reduce((map, event) => {
      const current = map.get(event.model) ?? {
        model: event.model,
        calls: 0,
        totalTokens: 0,
        costUsd: 0,
      };
      current.calls += 1;
      current.totalTokens += event.totalTokens;
      current.costUsd += event.costUsd;
      map.set(event.model, current);
      return map;
    }, new Map<string, { model: string; calls: number; totalTokens: number; costUsd: number }>()),
  ).map(([, value]) => value).sort((a, b) => b.costUsd - a.costUsd);

  const aiModuleBreakdown = Array.from(
    aiEvents.reduce((map, event) => {
      const key = event.module ?? "genel";
      const current = map.get(key) ?? { module: key, calls: 0, totalTokens: 0, costUsd: 0 };
      current.calls += 1;
      current.totalTokens += event.totalTokens;
      current.costUsd += event.costUsd;
      map.set(key, current);
      return map;
    }, new Map<string, { module: string; calls: number; totalTokens: number; costUsd: number }>()),
  ).map(([, value]) => value).sort((a, b) => b.costUsd - a.costUsd);

  const moduleUsageBreakdown = Array.from(
    moduleActivities.reduce((map, entry) => {
      const current = map.get(entry.module) ?? { module: entry.module, count: 0, lastSeenAt: entry.createdAt };
      current.count += 1;
      if (entry.createdAt > current.lastSeenAt) current.lastSeenAt = entry.createdAt;
      map.set(entry.module, current);
      return map;
    }, new Map<string, { module: string; count: number; lastSeenAt: Date }>()),
  ).map(([, value]) => value).sort((a, b) => b.count - a.count);

  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const moduleActivity7d = moduleActivities.filter((entry) => entry.createdAt >= last7Days).length;
  const moduleActivity30d = moduleActivities.filter((entry) => entry.createdAt >= last30Days).length;
  const spentTransactions = tokenTransactions.filter((entry) => entry.type === "deduct");
  const totalSpentTokens = spentTransactions.reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/users"
            className="mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{user.name ?? user.email}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {user.email} · {user.package.name} · {user.role}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Cüzdan Bakiyesi",
            value: formatInt(Number(user.tokenWallet?.balance ?? 0n)),
            sub: "mevcut token",
            icon: Coins,
          },
          {
            label: "Toplam Token Harcaması",
            value: formatInt(totalSpentTokens),
            sub: `${formatInt(totalAiTokens)} AI token telemetry`,
            icon: BrainCircuit,
          },
          {
            label: "AI Maliyeti",
            value: currency.formatTryFromUsd(totalAiCostUsd),
            sub: formatUsd(totalAiCostUsd),
            icon: TrendingUp,
          },
          {
            label: "Modül Aktivitesi (30g)",
            value: formatInt(moduleActivity30d),
            sub: `${formatInt(moduleActivity7d)} son 7 gün`,
            icon: Activity,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">{card.label}</p>
              <card.icon size={15} className="text-[var(--color-primary)]" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">{card.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Hesap Durumu</h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Kayıt", formatDate(user.createdAt)],
              ["Son Giriş", formatDate(user.lastLoginAt)],
              ["Onboarding", user.onboardingCompleted ? "Tamamlandı" : "Bekliyor"],
              ["Hesap Onayı", user.accountApprovedAt ? formatDate(user.accountApprovedAt) : "Bekliyor"],
              ["Kilit", user.lockedUntil ? `Kilit bitişi: ${formatDate(user.lockedUntil)}` : "Aktif kilit yok"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
                <span className="text-[var(--color-text-secondary)]">{label}</span>
                <span className="font-medium text-[var(--color-text-primary)]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={15} className="text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Modül Kullanımı</h2>
          </div>
          <div className="mt-4 space-y-3">
            {moduleUsageBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Henüz modül aktivitesi kaydı yok.</p>
            ) : (
              moduleUsageBreakdown.slice(0, 8).map((entry) => (
                <div key={entry.module} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{entry.module}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{formatInt(entry.count)} olay</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Son aktivite: {formatDate(entry.lastSeenAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Model Dağılımı</h2>
          <div className="mt-4 space-y-3">
            {modelBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">AI kullanım kaydı yok.</p>
            ) : (
              modelBreakdown.map((entry) => (
                <div key={entry.model} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{entry.model}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{entry.calls} çağrı</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {formatInt(entry.totalTokens)} token · {currency.formatTryFromUsd(entry.costUsd)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">AI Modül Kırılımı</h2>
          <div className="mt-4 space-y-3">
            {aiModuleBreakdown.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">AI modül kırılımı henüz oluşmadı.</p>
            ) : (
              aiModuleBreakdown.map((entry) => (
                <div key={entry.module} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{entry.module}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{entry.calls} çağrı</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {formatInt(entry.totalTokens)} token · {currency.formatTryFromUsd(entry.costUsd)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">Son Aktivite Akışı</h2>
        <div className="mt-4 space-y-3">
          {moduleActivities.slice(0, 20).map((activity) => (
            <div key={activity.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--color-text-primary)]">{activity.module}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(activity.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{activity.action} · {activity.path}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
