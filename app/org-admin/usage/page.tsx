import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Brain, DollarSign, TrendingUp } from "lucide-react";
import { getCurrencySettings, formatUsd } from "@/lib/currency";

export const dynamic = "force-dynamic";

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function OrgUsagePage() {
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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [allUsage, monthAgg, byUser, byModel] = await Promise.all([
    prisma.orgAiUsage.findMany({
      where: { orgId: org.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.orgAiUsage.aggregate({
      where: { orgId: org.id, createdAt: { gte: monthStart } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
    }),
    prisma.orgAiUsage.groupBy({
      by: ["userId"],
      where: { orgId: org.id },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
    }),
    prisma.orgAiUsage.groupBy({
      by: ["model"],
      where: { orgId: org.id },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { id: true },
    }),
  ]);

  // Kullanıcı bilgilerini bul
  const userIds = byUser.map((u) => u.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const totalCost = allUsage.reduce((s, u) => s + u.costUsd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="py-2 px-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          AI Kullanımı
        </h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Organizasyonunuzdaki araştırmacıların AI kullanım detayları
        </p>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              Bu Ay Sorgu
            </p>
            <Brain
              size={14}
              style={{ color: "var(--color-warning)", opacity: 0.7 }}
            />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {monthAgg._count.id.toLocaleString("tr-TR")}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {(
              (monthAgg._sum.inputTokens ?? 0) + (monthAgg._sum.outputTokens ?? 0)
            ).toLocaleString()}{" "}
            token
          </p>
        </div>
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderTop: "2px solid var(--color-destructive)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Bu Ay Maliyet
            </p>
            <DollarSign
              size={14}
              style={{ color: "var(--color-destructive)", opacity: 0.7 }}
            />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {currency.formatTryFromUsd(monthAgg._sum.costUsd ?? 0)}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {formatUsd(monthAgg._sum.costUsd ?? 0)}
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
              Tüm Zamanlar
            </p>
            <TrendingUp
              size={14}
              style={{ color: "var(--color-success)", opacity: 0.7 }}
            />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {allUsage.length.toLocaleString("tr-TR")}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {currency.formatTryFromUsd(totalCost)} toplam
          </p>
        </div>
      </div>

      {/* Araştırmacı bazında */}
      {byUser.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Araştırmacı Bazında Kullanım
            </h3>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Araştırmacı",
                  "Sorgu",
                  "Giriş Tok.",
                  "Çıkış Tok.",
                  "Toplam Maliyet",
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
              {byUser
                .sort((a, b) => (b._sum.costUsd ?? 0) - (a._sum.costUsd ?? 0))
                .map((u) => {
                  const usr = userMap.get(u.userId);
                  return (
                    <tr
                      key={u.userId}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td className="px-5 py-3">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {usr?.name ?? usr?.email ?? u.userId}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {usr?.email}
                        </p>
                      </td>
                      <td
                        className="px-5 py-3 text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {u._count.id}
                      </td>
                      <td
                        className="px-5 py-3 text-xs font-mono"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {(u._sum.inputTokens ?? 0).toLocaleString()}
                      </td>
                      <td
                        className="px-5 py-3 text-xs font-mono"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {(u._sum.outputTokens ?? 0).toLocaleString()}
                      </td>
                      <td
                        className="px-5 py-3 text-sm font-mono"
                        style={{ color: "var(--color-warning)" }}
                      >
                        {currency.formatTryFromUsd(u._sum.costUsd ?? 0)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Model bazında */}
      {byModel.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              AI Model Dağılımı
            </h3>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Model", "Sorgu", "Token", "Maliyet"].map((h) => (
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
              {byModel
                .sort((a, b) => (b._sum.costUsd ?? 0) - (a._sum.costUsd ?? 0))
                .map((m) => (
                  <tr
                    key={m.model}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td
                      className="px-5 py-3 text-sm font-mono"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {m.model}
                    </td>
                    <td
                      className="px-5 py-3 text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {m._count.id}
                    </td>
                    <td
                      className="px-5 py-3 text-xs font-mono"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {(
                        (m._sum.inputTokens ?? 0) + (m._sum.outputTokens ?? 0)
                      ).toLocaleString()}
                    </td>
                    <td
                      className="px-5 py-3 text-sm font-mono"
                      style={{ color: "var(--color-warning)" }}
                      >
                      {currency.formatTryFromUsd(m._sum.costUsd ?? 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ham log */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Detaylı AI Sorgu Kaydı
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Araştırmacı",
                  "Model",
                  "Modül",
                  "Giriş",
                  "Çıkış",
                  "Maliyet",
                  "Tarih",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allUsage.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td
                    className="px-4 py-2 text-xs"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {u.user.name ?? u.user.email}
                  </td>
                  <td
                    className="px-4 py-2 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.model}
                  </td>
                  <td
                    className="px-4 py-2 text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.module ?? "—"}
                  </td>
                  <td
                    className="px-4 py-2 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.inputTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-2 text-xs font-mono"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {u.outputTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-2 text-xs font-mono"
                    style={{ color: "var(--color-warning)" }}
                  >
                    {currency.formatTryFromUsd(u.costUsd)}
                  </td>
                  <td
                    className="px-4 py-2 text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {fmtDate(u.createdAt)}
                  </td>
                </tr>
              ))}
              {allUsage.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Henüz sorgu yapılmadı
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
