import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrencySettings, formatUsd } from "@/lib/currency";
import {
  Brain,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}
function daysLeft(exp: Date) {
  return Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86_400_000));
}

export default async function OrgAdminPage() {
  const [supabase, currency] = await Promise.all([
    createClient(),
    getCurrencySettings(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, role: "org_admin", isActive: true },
    include: {
      org: {
        include: {
          members: { include: { user: true } },
          modules: { include: { module: true } },
        },
      },
    },
  });
  if (!membership) redirect("/login");
  const org = membership.org;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [allTimeAgg, monthAgg, recentUsage] = await Promise.all([
    prisma.orgAiUsage.aggregate({
      where: { orgId: org.id },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
    }),
    prisma.orgAiUsage.aggregate({
      where: { orgId: org.id, createdAt: { gte: monthStart } },
      _sum: { costUsd: true },
      _count: { id: true },
    }),
    prisma.orgAiUsage.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: true },
    }),
  ]);

  const allCost = allTimeAgg._sum.costUsd ?? 0;
  const monthCost = monthAgg._sum.costUsd ?? 0;
  const activeMembers = org.members.filter(
    (m) => m.isActive && m.role === "researcher",
  );
  const days = daysLeft(org.expiresAt);

  // Bütçe %
  const budgetPct = org.monthlyBudgetUsd
    ? Math.min(100, Math.round((monthCost / org.monthlyBudgetUsd) * 100))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="py-2 px-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Genel Bakış
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {org.name} · Araştırma Paneli
        </p>
      </div>

      {/* Süre uyarıları */}
      {days <= 30 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${days <= 7 ? "var(--color-destructive)" : "var(--color-warning)"} 10%, transparent)`,
            border: `1px solid ${days <= 7 ? "var(--color-destructive)" : "var(--color-warning)"}`,
          }}
        >
          <AlertTriangle
            size={16}
            style={{
              color:
                days <= 7 ? "var(--color-destructive)" : "var(--color-warning)",
            }}
          />
          <p
            className="text-sm font-medium"
            style={{
              color:
                days <= 7 ? "var(--color-destructive)" : "var(--color-warning)",
            }}
          >
            {days === 0
              ? "Erişim süreniz bugün doluyor!"
              : `Erişim sürenizin bitmesine ${days} gün kaldı.`}{" "}
            Platform yöneticisiyle iletişime geçin.
          </p>
        </div>
      )}

      {/* Stat kartlar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Aktif Araştırmacı"
          value={String(activeMembers.length)}
          sub={`${org.members.length} toplam üye`}
          icon={Users}
          color="var(--color-primary)"
        />
        <StatCard
          title="Bu Ay AI Sorgusu"
          value={monthAgg._count.id.toLocaleString("tr-TR")}
          sub={`Toplam: ${allTimeAgg._count.id.toLocaleString()}`}
          icon={Brain}
          color="var(--color-warning)"
        />
        <StatCard
          title="Bu Ay Maliyet"
          value={currency.formatTryFromUsd(monthCost)}
          sub={formatUsd(monthCost)}
          icon={DollarSign}
          color="var(--color-destructive)"
        />
        <StatCard
          title="Kalan Süre"
          value={`${days} gün`}
          sub={`${new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(org.expiresAt)}'e kadar`}
          icon={Clock}
          color={
            days <= 7
              ? "var(--color-destructive)"
              : days <= 30
                ? "var(--color-warning)"
                : "var(--color-success)"
          }
        />
      </div>

      {/* Bütçe çubuğu */}
      {budgetPct !== null && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Aylık Bütçe
            </p>
            <p
              className="text-sm font-mono"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {currency.formatTryFromUsd(monthCost)} / {currency.formatTryFromUsd(org.monthlyBudgetUsd!)} ({budgetPct}%)
            </p>
          </div>
          <div
            className="w-full h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${budgetPct}%`,
                backgroundColor:
                  budgetPct >= 90
                    ? "var(--color-destructive)"
                    : budgetPct >= org.alertThresholdPct
                      ? "var(--color-warning)"
                      : "var(--color-primary)",
              }}
            />
          </div>
          {budgetPct >= org.alertThresholdPct && (
            <p
              className="text-xs mt-2 flex items-center gap-1.5"
              style={{ color: "var(--color-warning)" }}
            >
              <AlertTriangle size={11} />
              Uyarı eşiği aşıldı. Bütçenizin %{budgetPct}'i kullanıldı.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Araştırmacılar */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-2">
              <Users size={14} style={{ color: "var(--color-primary)" }} />
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Araştırmacılarım
              </h3>
            </div>
            <a
              href="/org-admin/members"
              className="text-xs"
              style={{ color: "var(--color-primary)" }}
            >
              Tümünü Gör
            </a>
          </div>
          <div
            className="divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {activeMembers.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {m.user.name ?? m.user.email}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {m.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--color-success)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-success)" }}
                  >
                    Aktif
                  </span>
                </div>
              </div>
            ))}
            {activeMembers.length === 0 && (
              <p
                className="px-5 py-6 text-sm text-center"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Henüz araştırmacı yok.{" "}
                <a
                  href="/org-admin/members"
                  style={{ color: "var(--color-primary)" }}
                >
                  Davet et →
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Erişilebilir modüller */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center gap-2"
            style={{ borderColor: "var(--color-border)" }}
          >
            <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Erişilebilir Modüller
            </h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-2">
            {org.modules.map((m) => (
              <span
                key={m.moduleId}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-success) 12%, transparent)",
                  color: "var(--color-success)",
                }}
              >
                {m.module.name}
              </span>
            ))}
            {org.modules.length === 0 && (
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Modül tanımlanmamış
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Son AI sorguları */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Brain size={14} style={{ color: "var(--color-primary)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Son AI Sorguları
            </h3>
          </div>
          <a
            href="/org-admin/usage"
            className="text-xs"
            style={{ color: "var(--color-primary)" }}
          >
            Detaylı Görünüm
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Araştırmacı",
                  "Model",
                  "Modül",
                  "Token",
                  "Maliyet",
                  "Tarih",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td
                    className="px-5 py-2.5 text-sm"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {u.user.name ?? u.user.email}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.model}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.module ?? "—"}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {(u.inputTokens + u.outputTokens).toLocaleString()}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs font-mono"
                    style={{ color: "var(--color-warning)" }}
                  >
                    {currency.formatTryFromUsd(u.costUsd)}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {new Intl.DateTimeFormat("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(u.createdAt)}
                  </td>
                </tr>
              ))}
              {recentUsage.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Henüz AI sorgusu yapılmadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderTop: `2px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </p>
        <Icon size={14} style={{ color, opacity: 0.7 }} />
      </div>
      <p
        className="text-2xl font-bold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
      <p
        className="text-xs mt-1"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {sub}
      </p>
    </div>
  );
}
