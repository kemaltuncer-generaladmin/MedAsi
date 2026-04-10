import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import {
  inviteResearcher,
  deactivateOrgMember,
  reactivateOrgMember,
} from "@/lib/actions/organizations";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function OrgMembersPage() {
  const supabase = await createClient();
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

  const [members, invitations] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId: org.id },
      include: {
        user: true,
        org: {
          include: {
            aiUsage: {
              where: {
                createdAt: {
                  gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  ),
                },
              },
              select: { userId: true, costUsd: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.orgInvitation.findMany({
      where: { orgId: org.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Bu ay kullanıcı bazında maliyet
  const allUsage = members[0]?.org.aiUsage ?? [];
  const userCostMap = new Map<string, number>();
  for (const u of allUsage) {
    userCostMap.set(u.userId, (userCostMap.get(u.userId) ?? 0) + u.costUsd);
  }

  const researchers = members.filter((m) => m.role === "researcher");
  const activeCount = researchers.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between py-2 px-1">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Araştırmacılarım
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {activeCount} aktif araştırmacı · {researchers.length} toplam
          </p>
        </div>
      </div>

      {/* Davet formu */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={15} style={{ color: "var(--color-primary)" }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Araştırmacı Davet Et
          </h3>
        </div>
        <form action={inviteResearcher} className="flex gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="arastirmaci@universite.edu.tr"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
          >
            <Mail size={14} />
            Davet Gönder
          </button>
        </form>
        <p
          className="text-xs mt-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          7 gün geçerli davet bağlantısı oluşturulur. Araştırmacı bu bağlantıdan
          kayıt olur.
        </p>
      </div>

      {/* Bekleyen davetler */}
      {invitations.length > 0 && (
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
            <Clock size={14} style={{ color: "var(--color-warning)" }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Bekleyen Davetler
            </h3>
          </div>
          <div
            className="divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {inv.email}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Son geçerlilik: {fmtDate(inv.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Bekliyor</Badge>
                  <p
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {inv.token.slice(0, 12)}…
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Üye tablosu */}
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
          <Users size={14} style={{ color: "var(--color-primary)" }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Tüm Üyeler
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {[
                  "Araştırmacı",
                  "Rol",
                  "Bu Ay Maliyet",
                  "Katılım",
                  "Durum",
                  "",
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
              {members.map((m) => {
                const monthCost = userCostMap.get(m.userId) ?? 0;
                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                            color: "#fff",
                          }}
                        >
                          {(m.user.name ?? m.user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {m.user.name ?? "—"}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          m.role === "org_admin" ? "warning" : "secondary"
                        }
                      >
                        {m.role === "org_admin" ? "Org Admin" : "Araştırmacı"}
                      </Badge>
                    </td>
                    <td
                      className="px-5 py-3 text-sm font-mono"
                      style={{
                        color:
                          monthCost > 0
                            ? "var(--color-warning)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {monthCost > 0 ? `$${monthCost.toFixed(4)}` : "—"}
                    </td>
                    <td
                      className="px-5 py-3 text-xs"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {fmtDate(m.joinedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {m.isActive ? (
                          <>
                            <CheckCircle
                              size={13}
                              style={{ color: "var(--color-success)" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-success)" }}
                            >
                              Aktif
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle
                              size={13}
                              style={{ color: "var(--color-text-secondary)" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              Pasif
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {m.role !== "org_admin" &&
                        (m.isActive ? (
                          <form action={deactivateOrgMember.bind(null, m.id)}>
                            <button
                              type="submit"
                              className="text-xs px-2.5 py-1 rounded-md transition-colors"
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, var(--color-destructive) 12%, transparent)",
                                color: "var(--color-destructive)",
                                border: "1px solid var(--color-destructive)",
                              }}
                            >
                              Devre Dışı
                            </button>
                          </form>
                        ) : (
                          <form action={reactivateOrgMember.bind(null, m.id)}>
                            <button
                              type="submit"
                              className="text-xs px-2.5 py-1 rounded-md transition-colors"
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, var(--color-success) 12%, transparent)",
                                color: "var(--color-success)",
                                border: "1px solid var(--color-success)",
                              }}
                            >
                              Aktifleştir
                            </button>
                          </form>
                        ))}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Henüz üye yok
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
