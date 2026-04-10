import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getCurrencySettings } from "@/lib/currency";
import {
  ArrowLeft,
  Users,
  Brain,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  BarChart3,
  Puzzle,
} from "lucide-react";
import {
  suspendOrganization,
  activateOrganization,
} from "@/lib/actions/organizations";
import {
  getOrgBillingSummary,
  getOrgBudgetUsage,
} from "@/lib/ai/track-org-usage";

export const dynamic = "force-dynamic";

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
function daysLeft(exp: Date) {
  return Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86_400_000));
}

export default async function OrgDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const org = await prisma.researchOrganization.findUnique({
    where: { id: params.id },
    include: {
      adminUser: true,
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      modules: { include: { module: true } },
    },
  });

  if (!org) notFound();

  // Tüm zamanlar ve bu ay için özet
  const [allTime, thisMonth, budget, recentUsage, currency] = await Promise.all([
    getOrgBillingSummary(org.id),
    getOrgBillingSummary(
      org.id,
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      undefined,
    ),
    getOrgBudgetUsage(org.id),
    prisma.orgAiUsage.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true },
    }),
    getCurrencySettings(),
  ]);

  const days = daysLeft(org.expiresAt);
  const isActive = org.status === "active";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between py-2 px-1">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/organizations"
            className="mt-1 p-1.5 rounded-md hover:bg-white/5 transition-colors"
          >
            <ArrowLeft
              size={16}
              style={{ color: "var(--color-text-secondary)" }}
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {org.name}
              </h1>
              <Badge variant={org.status === "active" ? "success" : "warning"}>
                {org.status === "active" ? "Aktif" : "Askıda"}
              </Badge>
            </div>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              /{org.slug} · Admin: {org.adminUser.name ?? org.adminUser.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/organizations/${org.id}/billing`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-surface-elevated)",
            }}
          >
            <BarChart3 size={13} />
            Detaylı Rapor
          </Link>
          {isActive ? (
            <form action={suspendOrganization.bind(null, org.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                  color: "var(--color-warning)",
                  border: "1px solid var(--color-warning)",
                }}
              >
                <ShieldAlert size={13} /> Askıya Al
              </button>
            </form>
          ) : (
            <form action={activateOrganization.bind(null, org.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-success) 15%, transparent)",
                  color: "var(--color-success)",
                  border: "1px solid var(--color-success)",
                }}
              >
                <ShieldCheck size={13} /> Aktifleştir
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Stat kartlar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Maliyet (tüm)"
          icon={DollarSign}
          color="var(--color-warning)"
          value={currency.formatTryFromUsd(allTime.totalCostUsd)}
          sub={`${allTime.totalCalls} AI sorgusu`}
        />
        <StatCard
          title="Bu Ay Gelir"
          icon={TrendingUp}
          color="var(--color-success)"
          value={currency.formatTryFromUsd(thisMonth.revenueUsd)}
          sub={`+${currency.formatTryFromUsd(thisMonth.profitUsd)} kâr (%${org.markupPct} marj)`}
        />
        <StatCard
          title="Aktif Üye"
          icon={Users}
          color="var(--color-primary)"
          value={String(org.members.filter((m) => m.isActive).length)}
          sub={`${org.members.length} toplam`}
        />
        <StatCard
          title="Kalan Süre"
          icon={Clock}
          color={
            days <= 7
              ? "var(--color-destructive)"
              : "var(--color-text-secondary)"
          }
          value={`${days} gün`}
          sub={`${fmtDate(org.startsAt)} – ${fmtDate(org.expiresAt)}`}
        />
      </div>

      {/* Bütçe çubuğu */}
      {budget && (
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
              Aylık Bütçe Kullanımı
            </p>
            <p
              className="text-sm font-mono"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {currency.formatTryFromUsd(budget.usedUsd)} / {currency.formatTryFromUsd(budget.budgetUsd)} ({budget.pct}%)
            </p>
          </div>
          <div
            className="w-full h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${budget.pct}%`,
                backgroundColor:
                  budget.pct >= 90
                    ? "var(--color-destructive)"
                    : budget.pct >= org.alertThresholdPct
                      ? "var(--color-warning)"
                      : "var(--color-primary)",
              }}
            />
          </div>
          {budget.pct >= org.alertThresholdPct && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--color-warning)" }}
            >
              ⚠ Uyarı eşiği aşıldı (%{org.alertThresholdPct})
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Üyeler */}
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
                Üyeler
              </h3>
            </div>
          </div>
          <div
            className="divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {org.members.map((m) => (
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
                <div className="flex items-center gap-2">
                  <Badge
                    variant={m.role === "org_admin" ? "warning" : "secondary"}
                  >
                    {m.role === "org_admin" ? "Org Admin" : "Araştırmacı"}
                  </Badge>
                  {!m.isActive && <Badge variant="secondary">Pasif</Badge>}
                </div>
              </div>
            ))}
            {org.members.length === 0 && (
              <p
                className="px-5 py-6 text-sm text-center"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Henüz üye yok
              </p>
            )}
          </div>
        </div>

        {/* İzinli Modüller */}
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
            <Puzzle size={14} style={{ color: "var(--color-primary)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              İzinli Modüller
            </h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-2">
            {org.modules.map((m) => (
              <span
                key={m.moduleId}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  color: "var(--color-primary)",
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
          <Link
            href={`/admin/organizations/${org.id}/billing`}
            className="text-xs flex items-center gap-1"
            style={{ color: "var(--color-primary)" }}
          >
            Tümünü Gör <ExternalLink size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Kullanıcı",
                  "Model",
                  "Modül",
                  "Giriş Tok.",
                  "Çıkış Tok.",
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
                    {u.inputTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-5 py-2.5 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.outputTokens.toLocaleString()}
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
                    colSpan={7}
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

      {/* Org notları */}
      {org.notes && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Sözleşme / Notlar
          </p>
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: "var(--color-text-primary)" }}
          >
            {org.notes}
          </p>
        </div>
      )}
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
