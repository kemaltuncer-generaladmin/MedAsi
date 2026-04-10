import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BarChart3, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { getCurrencySettings } from "@/lib/currency";

export const dynamic = "force-dynamic";

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}

export default async function OrgReportsPage() {
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
    include: { org: true },
  });
  if (!membership) redirect("/login");
  const org = membership.org;

  const allUsage = await prisma.orgAiUsage.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "asc" },
    include: { user: true },
  });

  // Aylık gruplama
  const byMonth = new Map<
    string,
    {
      costUsd: number;
      calls: number;
      inputTokens: number;
      outputTokens: number;
      users: Set<string>;
    }
  >();

  for (const u of allUsage) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const existing = byMonth.get(key);
    if (existing) {
      existing.costUsd += u.costUsd;
      existing.calls++;
      existing.inputTokens += u.inputTokens;
      existing.outputTokens += u.outputTokens;
      existing.users.add(u.userId);
    } else {
      byMonth.set(key, {
        costUsd: u.costUsd,
        calls: 1,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        users: new Set([u.userId]),
      });
    }
  }

  const months = [...byMonth.entries()].sort((a, b) =>
    b[0].localeCompare(a[0]),
  );

  const totalCost = allUsage.reduce((s, u) => s + u.costUsd, 0);
  const totalCalls = allUsage.length;

  // Ortalama günlük maliyet (aktif günler bazında)
  const daySet = new Set(
    allUsage.map((u) => u.createdAt.toISOString().slice(0, 10)),
  );
  const avgDailyCost = daySet.size > 0 ? totalCost / daySet.size : 0;

  return (
    <div className="space-y-6">
      <div className="py-2 px-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Raporlar
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Organizasyonunuzun kullanım özeti ve dönemsel analizler
        </p>
      </div>

      {/* Genel istatistikler */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Toplam Sorgu",
            value: totalCalls.toLocaleString("tr-TR"),
            icon: BarChart3,
            color: "var(--color-primary)",
          },
          {
            label: "Toplam Maliyet",
            value: currency.formatTryFromUsd(totalCost),
            icon: DollarSign,
            color: "var(--color-warning)",
          },
          {
            label: "Ort. Günlük Maliyet",
            value: currency.formatTryFromUsd(avgDailyCost),
            icon: TrendingUp,
            color: "var(--color-success)",
          },
          {
            label: "Aktif Ay Sayısı",
            value: months.length.toString(),
            icon: Calendar,
            color: "var(--color-text-secondary)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              borderTop: `2px solid ${s.color}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {s.label}
              </p>
              <s.icon size={14} style={{ color: s.color, opacity: 0.7 }} />
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Aylık tablo */}
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
          <Calendar size={14} style={{ color: "var(--color-primary)" }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Aylık Döküm
          </h3>
        </div>
        {months.length === 0 ? (
          <p
            className="px-5 py-8 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Henüz kullanım verisi yok
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Dönem",
                  "Sorgu",
                  "Aktif Kullanıcı",
                  "Giriş Tok.",
                  "Çıkış Tok.",
                  "Maliyet (TRY)",
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
              {months.map(([month, data]) => (
                <tr
                  key={month}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td
                    className="px-5 py-3 text-sm font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {month}
                  </td>
                  <td
                    className="px-5 py-3 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {data.calls}
                  </td>
                  <td
                    className="px-5 py-3 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {data.users.size}
                  </td>
                  <td
                    className="px-5 py-3 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {data.inputTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-5 py-3 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {data.outputTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-5 py-3 text-sm font-mono font-semibold"
                    style={{ color: "var(--color-warning)" }}
                  >
                    {currency.formatTryFromUsd(data.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: "2px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                }}
              >
                <td
                  className="px-5 py-3 text-sm font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  TOPLAM
                </td>
                <td
                  className="px-5 py-3 text-sm font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {totalCalls}
                </td>
                <td className="px-5 py-3" />
                <td
                  className="px-5 py-3 text-xs font-mono font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {allUsage
                    .reduce((s, u) => s + u.inputTokens, 0)
                    .toLocaleString()}
                </td>
                <td
                  className="px-5 py-3 text-xs font-mono font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {allUsage
                    .reduce((s, u) => s + u.outputTokens, 0)
                    .toLocaleString()}
                </td>
                <td
                  className="px-5 py-3 text-sm font-mono font-bold"
                  style={{ color: "var(--color-warning)" }}
                >
                  {currency.formatTryFromUsd(totalCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Sözleşme bilgileri */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Sözleşme Bilgileri
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ["Organizasyon", org.name],
            ["Slug", `/${org.slug}`],
            ["Başlangıç", org.startsAt.toLocaleDateString("tr-TR")],
            ["Bitiş", org.expiresAt.toLocaleDateString("tr-TR")],
            ["Durum", org.status === "active" ? "Aktif" : "Askıda"],
            [
              "Aylık Bütçe",
              org.monthlyBudgetUsd
                ? currency.formatTryFromUsd(org.monthlyBudgetUsd)
                : "Tanımsız",
            ],
          ].map(([k, v]) => (
            <div key={k}>
              <p
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {k}
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
