import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { estimateMonthlyAiCostTry, getMonthlyAiCostRangeTry } from "@/constants";
import {
  Brain,
  TrendingUp,
  Users,
  Activity,
  BarChart2,
  Package,
  FileText,
  UserCheck,
  Cpu,
  FolderOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGES: { value: DateRange; label: string; days: number }[] = [
  { value: "7d", label: "Son 7 Gün", days: 7 },
  { value: "30d", label: "Son 30 Gün", days: 30 },
  { value: "90d", label: "Son 90 Gün", days: 90 },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function getRange(searchParams?: Record<string, string | string[] | undefined>): {
  value: DateRange;
  days: number;
  label: string;
} {
  const requested = searchParams?.range;
  const value = (Array.isArray(requested) ? requested[0] : requested) as DateRange | undefined;
  const selected = DATE_RANGES.find((r) => r.value === value) ?? DATE_RANGES[1];
  return { value: selected.value, days: selected.days, label: selected.label };
}

function buildDailySeries(dates: Date[], days: number): number[] {
  const buckets = Array.from({ length: days }, () => 0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (const date of dates) {
    const diff = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) buckets[diff] += 1;
  }
  return buckets;
}

function MiniChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-14">
      {values.map((v, i) => (
        <div
          key={i}
          className="rounded-sm flex-1"
          style={{
            height: `${Math.max(4, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: 0.35 + (i / values.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

function packageVariant(name: string): "default" | "success" | "warning" | "secondary" {
  const lower = name.toLowerCase();
  if (lower.includes("pro") || lower.includes("klinik")) return "success";
  if (lower.includes("kurumsal") || lower.includes("enterprise")) return "warning";
  if (lower.includes("öğrenci") || lower.includes("student") || lower.includes("free")) return "default";
  return "secondary";
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const range = getRange(resolvedParams);
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (range.days - 1));

  // ─── Parallel DB queries ──────────────────────────────────────────────────
  const [
    // User stats
    totalUsers,
    activeUsers,
    adminUsers,
    newUserRows,
    // AI / Session stats
    totalSessions,
    sessionsInRange,
    sessionRows,
    tokenAggregate,
    topModelsRaw,
    activeSessionUsersRaw,
    // Case / Notes stats
    totalCases,
    totalNotes,
    casesInRange,
    // Package distribution
    packageDist,
    packages,
    // Module usage
    moduleUsage,
    modules,
    // Recent signups
    recentSignups,
    // Pomodoro
    pomodoroInRange,
    // Finance
    financeRows,
  ] = await Promise.all([
    // Users
    prisma.user.count(),
    prisma.user.count({ where: { onboardingCompleted: true } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.user.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    // Sessions (all-time + range)
    prisma.session.count(),
    prisma.session.count({ where: { createdAt: { gte: rangeStart } } }),
    prisma.session.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true, tokensUsed: true },
    }),
    prisma.session.aggregate({ _sum: { tokensUsed: true } }),
    prisma.session.groupBy({
      by: ["model"],
      where: { createdAt: { gte: rangeStart } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.session.findMany({
      where: { createdAt: { gte: rangeStart } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    // Cases & Notes
    prisma.case.count(),
    prisma.note.count(),
    prisma.case.count({ where: { createdAt: { gte: rangeStart } } }),
    // Package distribution
    prisma.user.groupBy({ by: ["packageId"], _count: { id: true } }),
    prisma.package.findMany(),
    // Module usage
    prisma.userModule.groupBy({ by: ["moduleId"], _count: { userId: true } }),
    prisma.module.findMany(),
    // Recent signups
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { package: true },
    }),
    // Pomodoro focus sessions in range
    prisma.pomodoroLog.count({ where: { completedAt: { gte: rangeStart } } }),
    prisma.$queryRaw<{ couponUsed: string | null; packageName: string | null; price: number | null }[]>`
      SELECT
        u.coupon_used AS "couponUsed",
        p.name AS "packageName",
        p.price AS "price"
      FROM users u
      LEFT JOIN packages p ON p.id = u.package_id
    `,
  ]);

  // ─── Derived values ───────────────────────────────────────────────────────
  const newUsersCount = newUserRows.length;
  const activeSessionUsersCount = activeSessionUsersRaw.length;
  const totalTokens = tokenAggregate._sum.tokensUsed ?? 0;
  const avgTokens =
    sessionsInRange > 0
      ? Math.round(sessionRows.reduce((s, r) => s + r.tokensUsed, 0) / sessionsInRange)
      : 0;

  const dailyAiSessions = buildDailySeries(
    sessionRows.map((r) => r.createdAt),
    range.days,
  );
  const dailyRegistrations = buildDailySeries(
    newUserRows.map((r) => r.createdAt),
    range.days,
  );

  // Package distribution with names
  const packageMap = new Map(packages.map((p) => [p.id, p]));
  const pkgDistribution = packageDist
    .map((g) => {
      const pkg = packageMap.get(g.packageId);
      const count = g._count.id;
      const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
      return { name: pkg?.name ?? "Bilinmiyor", count, pct };
    })
    .sort((a, b) => b.count - a.count);

  // Module usage with names
  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const maxModuleUsage = Math.max(...moduleUsage.map((m) => m._count.userId), 1);
  const moduleStats = moduleUsage
    .map((g) => ({
      name: moduleMap.get(g.moduleId)?.name ?? "Bilinmiyor",
      count: g._count.userId,
      pct: Math.round((g._count.userId / maxModuleUsage) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top AI models
  const topModels = topModelsRaw.map((item) => ({
    name: item.model,
    usage: item._count.id,
    pct: sessionsInRange > 0 ? Math.round((item._count.id / sessionsInRange) * 100) : 0,
  }));

  const payingUsers = financeRows.filter((row) => !row.couponUsed);
  const couponUsers = financeRows.filter((row) => !!row.couponUsed).length;
  const monthlyRevenue = payingUsers.reduce((sum, row) => sum + (row.price ?? 0), 0);
  const monthlyAiCost = financeRows.reduce(
    (sum, row) => sum + estimateMonthlyAiCostTry(row.packageName),
    0,
  );
  const monthlyProfit = monthlyRevenue - monthlyAiCost;
  const freeCostRange = getMonthlyAiCostRangeTry("Ücretsiz");

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-10">
      {/* Header + date range selector */}
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Analitik
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Gerçek kullanım verileri — Prisma / PostgreSQL
          </p>
        </div>
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {DATE_RANGES.map((dr) => (
            <Link
              key={dr.value}
              href={`/admin/analytics?range=${dr.value}`}
              className="px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor:
                  range.value === dr.value
                    ? "var(--color-primary)"
                    : "var(--color-surface-elevated)",
                color:
                  range.value === dr.value ? "#000" : "var(--color-text-secondary)",
              }}
            >
              {dr.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 1: Top stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: "Toplam Kullanıcı",
            value: formatNum(totalUsers),
            sub: `+${formatNum(newUsersCount)} bu dönem`,
            icon: Users,
            color: "var(--color-primary)",
          },
          {
            label: "Aktif Kullanıcı",
            value: formatNum(activeUsers),
            sub: `Onboarding tamamlandı`,
            icon: UserCheck,
            color: "var(--color-success)",
          },
          {
            label: "Admin Sayısı",
            value: formatNum(adminUsers),
            sub: `${totalUsers > 0 ? Math.round((adminUsers / totalUsers) * 100) : 0}% of users`,
            icon: Users,
            color: "var(--color-warning)",
          },
          {
            label: "AI Sorgusu",
            value: formatNum(sessionsInRange),
            sub: `${range.label.toLowerCase()} toplam`,
            icon: Brain,
            color: "var(--color-secondary)",
          },
          {
            label: "Toplam Token",
            value: formatNum(totalTokens),
            sub: `Ort. ${formatNum(avgTokens)} / sorgu`,
            icon: Cpu,
            color: "var(--color-primary)",
          },
          {
            label: "AI Aktif Kullanıcı",
            value: formatNum(activeSessionUsersCount),
            sub: `${range.label.toLowerCase()} benzersiz`,
            icon: Activity,
            color: "var(--color-success)",
          },
          {
            label: "Aylık Gelir (Kupon Hariç)",
            value: `₺${formatNum(monthlyRevenue)}`,
            sub: `${formatNum(couponUsers)} kupon kullanıcı dahil edilmedi`,
            icon: TrendingUp,
            color: "var(--color-warning)",
          },
          {
            label: "Aylık Net Kâr (Tahmini)",
            value: `₺${formatNum(monthlyProfit)}`,
            sub: `Maliyet: ₺${formatNum(monthlyAiCost)} · Free maliyet hedefi ${freeCostRange ? `₺${freeCostRange.min}-${freeCostRange.max}` : "-"}`,
            icon: Cpu,
            color: "var(--color-primary)",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                borderTop: `2px solid ${s.color}`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <p
                  className="text-xs font-semibold uppercase tracking-wider leading-tight"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {s.label}
                </p>
                <Icon size={15} style={{ color: s.color, opacity: 0.7 }} />
              </div>
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                {s.value}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {s.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Section 2: Secondary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Toplam AI Oturumu",
            value: formatNum(totalSessions),
            sub: "Tüm zamanlar",
            icon: Brain,
            color: "var(--color-secondary)",
          },
          {
            label: "Vakalar",
            value: formatNum(totalCases),
            sub: `+${formatNum(casesInRange)} bu dönem`,
            icon: FolderOpen,
            color: "var(--color-primary)",
          },
          {
            label: "Notlar",
            value: formatNum(totalNotes),
            sub: "Tüm zamanlar",
            icon: FileText,
            color: "var(--color-warning)",
          },
          {
            label: "Pomodoro Seansı",
            value: formatNum(pomodoroInRange),
            sub: `${range.label.toLowerCase()} tamamlanan`,
            icon: Activity,
            color: "var(--color-success)",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {s.label}
                </p>
                <Icon size={15} style={{ color: s.color, opacity: 0.7 }} />
              </div>
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                {s.value}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {s.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Section 3: Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Daily AI sessions */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} style={{ color: "var(--color-primary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Günlük AI Sorguları
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
            {range.label}
          </p>
          <MiniChart values={dailyAiSessions} color="var(--color-primary)" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              En az: {Math.min(...dailyAiSessions)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              En fazla: {Math.max(...dailyAiSessions)}
            </span>
          </div>
        </div>

        {/* Daily registrations */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: "var(--color-secondary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Günlük Yeni Kayıtlar
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
            {range.label}
          </p>
          <MiniChart values={dailyRegistrations} color="var(--color-secondary)" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Toplam: {formatNum(newUsersCount)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Ort: {formatNum(Math.round(newUsersCount / range.days))} / gün
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 4: Package distribution + Module usage ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Package distribution */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <Package size={16} style={{ color: "var(--color-text-secondary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Paket Dağılımı
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {pkgDistribution.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Veri yok.
              </p>
            ) : (
              pkgDistribution.map((pkg, i) => (
                <div key={pkg.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: "var(--color-background)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {pkg.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {formatNum(pkg.count)}
                      </span>
                      <Badge variant={i === 0 ? "success" : "default"}>%{pkg.pct}</Badge>
                    </div>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-border)" }}
                  >
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${pkg.pct}%`,
                        background:
                          i === 0
                            ? "linear-gradient(90deg, var(--color-primary), var(--color-secondary))"
                            : "var(--color-primary)",
                        opacity: 1 - i * 0.1,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Module usage */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <BarChart2 size={16} style={{ color: "var(--color-text-secondary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Modül Kullanımı
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {moduleStats.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Veri yok.
              </p>
            ) : (
              moduleStats.map((mod, i) => (
                <div key={mod.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: "var(--color-background)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {mod.name}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatNum(mod.count)}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-border)" }}
                  >
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${mod.pct}%`,
                        backgroundColor: "var(--color-success)",
                        opacity: 0.9 - i * 0.08,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Section 5: Top AI models ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Brain size={16} style={{ color: "var(--color-text-secondary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              En Çok Kullanılan AI Modelleri
            </h3>
          </div>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {range.label}
          </span>
        </div>
        <div className="p-6 space-y-4">
          {topModels.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Bu aralıkta veri yok.
            </p>
          ) : (
            topModels.map((mod, i) => (
              <div key={mod.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {mod.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {formatNum(mod.usage)}
                    </span>
                    <Badge variant={i === 0 ? "success" : "default"}>%{mod.pct}</Badge>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-border)" }}
                >
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${mod.pct}%`,
                      background:
                        i === 0
                          ? "linear-gradient(90deg, var(--color-primary), var(--color-secondary))"
                          : "var(--color-primary)",
                      opacity: 1 - i * 0.12,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Section 6: Recent signups table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "var(--color-text-secondary)" }} />
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Son Kayıt Olan Kullanıcılar
            </h3>
          </div>
          <Link
            href="/admin/users"
            className="text-xs font-semibold transition-colors"
            style={{ color: "var(--color-primary)" }}
          >
            Tümünü Gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Kullanıcı", "E-Posta", "Paket", "Onboarding", "Kayıt Tarihi"].map((th) => (
                  <th
                    key={th}
                    className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((user) => (
                <tr
                  key={user.id}
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                          color: "#fff",
                        }}
                      >
                        {getInitials(user.name, user.email)}
                      </div>
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {user.name ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-6 py-3 text-sm whitespace-nowrap"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {user.email}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={packageVariant(user.package.name)}>
                      {user.package.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: user.onboardingCompleted
                          ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
                          : "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                        color: user.onboardingCompleted
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                      }}
                    >
                      {user.onboardingCompleted ? "Tamamlandı" : "Bekliyor"}
                    </span>
                  </td>
                  <td
                    className="px-6 py-3 text-sm whitespace-nowrap"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {formatDate(user.createdAt)}
                  </td>
                </tr>
              ))}
              {recentSignups.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Henüz kayıtlı kullanıcı bulunmuyor.
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
