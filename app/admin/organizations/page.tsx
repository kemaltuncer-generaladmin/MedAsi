import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getCurrencySettings, formatUsd } from "@/lib/currency";
import {
  FlaskConical,
  Plus,
  Users,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  return "secondary";
}

function statusLabel(status: string) {
  if (status === "active") return "Aktif";
  if (status === "suspended") return "Askıya Alındı";
  return "Süresi Doldu";
}

function daysLeft(expiresAt: Date) {
  const diff = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function OrganizationsPage() {
  const [orgs, currency] = await Promise.all([
    prisma.researchOrganization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        adminUser: true,
        members: { where: { isActive: true } },
        _count: { select: { aiUsage: true } },
      },
    }),
    getCurrencySettings(),
  ]);

  // Her org için bu ayki toplam maliyet
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyUsage = await prisma.orgAiUsage.groupBy({
    by: ["orgId"],
    where: { createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  });
  const usageMap = new Map(
    monthlyUsage.map((u) => [u.orgId, u._sum.costUsd ?? 0]),
  );

  const totalRevenue = orgs.reduce((sum, org) => {
    const cost = usageMap.get(org.id) ?? 0;
    return sum + cost * (1 + org.markupPct / 100);
  }, 0);

  const totalCost = [...usageMap.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Araştırma Organizasyonları
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Bilimsel araştırmacı hesapları ve AI kullanım maliyetleri
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={15} />
          Yeni Organizasyon
        </Link>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderTop: "2px solid var(--color-primary)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Toplam Org.
            </p>
            <FlaskConical size={15} style={{ color: "var(--color-primary)" }} />
          </div>
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {orgs.length}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {orgs.filter((o) => o.status === "active").length} aktif
          </p>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderTop: "2px solid var(--color-warning)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Bu Ay Maliyet
            </p>
            <DollarSign size={15} style={{ color: "var(--color-warning)" }} />
          </div>
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {currency.formatTryFromUsd(totalCost)}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {formatUsd(totalCost)}
          </p>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderTop: "2px solid var(--color-success)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Bu Ay Gelir
            </p>
            <TrendingUp size={15} style={{ color: "var(--color-success)" }} />
          </div>
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {currency.formatTryFromUsd(totalRevenue)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-success)" }}>
            +{currency.formatTryFromUsd(totalRevenue - totalCost)} kâr
          </p>
        </div>
      </div>

      {/* Org tablosu */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Tüm Organizasyonlar
          </h3>
        </div>

        {orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FlaskConical
              size={40}
              style={{ color: "var(--color-text-secondary)", opacity: 0.4 }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Henüz organizasyon yok. İlkini oluşturun.
            </p>
            <Link
              href="/admin/organizations/new"
              className="text-sm font-medium px-4 py-2 rounded-lg"
              style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
            >
              Organizasyon Oluştur
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {[
                    "Organizasyon",
                    "Admin",
                    "Üye",
                    "Bu Ay Maliyet",
                    "Bu Ay Gelir",
                    "Süre",
                    "Durum",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => {
                  const cost = usageMap.get(org.id) ?? 0;
                  const revenue = cost * (1 + org.markupPct / 100);
                  const days = daysLeft(org.expiresAt);
                  return (
                    <tr
                      key={org.id}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {org.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            /{org.slug}
                          </p>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3 text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {org.adminUser.name ?? org.adminUser.email}
                      </td>
                      <td className="px-5 py-3">
                        <div
                          className="flex items-center gap-1.5 text-sm"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          <Users size={13} />
                          {org.members.length}
                        </div>
                      </td>
                      <td
                        className="px-5 py-3 text-sm font-mono"
                        style={{
                          color:
                            cost > 0
                              ? "var(--color-warning)"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {currency.formatTryFromUsd(cost)}
                      </td>
                      <td
                        className="px-5 py-3 text-sm font-mono"
                        style={{ color: "var(--color-success)" }}
                      >
                        {currency.formatTryFromUsd(revenue)}
                      </td>
                      <td className="px-5 py-3">
                        <div
                          className="flex items-center gap-1 text-sm"
                          style={{
                            color:
                              days <= 7
                                ? "var(--color-destructive)"
                                : "var(--color-text-secondary)",
                          }}
                        >
                          <Clock size={12} />
                          {days}g kaldı
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant(org.status)}>
                          {statusLabel(org.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-primary)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          Yönet
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
