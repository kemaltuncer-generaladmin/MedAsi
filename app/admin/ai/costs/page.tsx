import {
  BarChart3,
  BrainCircuit,
  Coins,
  Cpu,
  DollarSign,
  Layers3,
  ReceiptText,
  Users,
} from "lucide-react";
import { getAdminAiCostEvents, getAdminModelPricingRows } from "@/lib/ai/admin-costs";

export const dynamic = "force-dynamic";

function formatUsd(value: number, digits = 4) {
  return `$${value.toFixed(digits)}`;
}

function formatInt(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminAiCostsPage() {
  const [events, pricingRows] = await Promise.all([
    getAdminAiCostEvents(),
    getAdminModelPricingRows(),
  ]);

  const monthStart = startOfMonth();
  const weekStart = startOfDaysAgo(7);

  const totalCost = events.reduce((sum, event) => sum + event.costUsd, 0);
  const monthEvents = events.filter((event) => event.createdAt >= monthStart);
  const weekEvents = events.filter((event) => event.createdAt >= weekStart);
  const monthCost = monthEvents.reduce((sum, event) => sum + event.costUsd, 0);
  const weekCost = weekEvents.reduce((sum, event) => sum + event.costUsd, 0);
  const totalInputTokens = events.reduce((sum, event) => sum + event.inputTokens, 0);
  const totalOutputTokens = events.reduce((sum, event) => sum + event.outputTokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const averageCostPerCall = events.length > 0 ? totalCost / events.length : 0;

  const byModel = Array.from(
    events.reduce((map, event) => {
      const current = map.get(event.model) ?? {
        model: event.model,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      };
      current.calls += 1;
      current.inputTokens += event.inputTokens;
      current.outputTokens += event.outputTokens;
      current.totalTokens += event.totalTokens;
      current.costUsd += event.costUsd;
      map.set(event.model, current);
      return map;
    }, new Map<string, {
      model: string;
      calls: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      costUsd: number;
    }>()),
  ).sort((a, b) => b[1].costUsd - a[1].costUsd).map(([, value]) => value);

  const byModule = Array.from(
    events.reduce((map, event) => {
      const key = event.module ?? "genel";
      const current = map.get(key) ?? {
        module: key,
        calls: 0,
        totalTokens: 0,
        costUsd: 0,
      };
      current.calls += 1;
      current.totalTokens += event.totalTokens;
      current.costUsd += event.costUsd;
      map.set(key, current);
      return map;
    }, new Map<string, { module: string; calls: number; totalTokens: number; costUsd: number }>()),
  ).sort((a, b) => b[1].costUsd - a[1].costUsd).map(([, value]) => value);

  const byUser = Array.from(
    events.reduce((map, event) => {
      const key = event.userId ?? "unknown";
      const current = map.get(key) ?? {
        userId: key,
        label: event.user?.name || event.user?.email || "Bilinmeyen kullanıcı",
        calls: 0,
        totalTokens: 0,
        costUsd: 0,
      };
      current.calls += 1;
      current.totalTokens += event.totalTokens;
      current.costUsd += event.costUsd;
      map.set(key, current);
      return map;
    }, new Map<string, { userId: string; label: string; calls: number; totalTokens: number; costUsd: number }>()),
  ).sort((a, b) => b[1].costUsd - a[1].costUsd).map(([, value]) => value);

  const dailySeries = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const dayEvents = events.filter((event) => event.createdAt.toISOString().slice(0, 10) === key);
    return {
      key,
      label: new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(date),
      calls: dayEvents.length,
      costUsd: dayEvents.reduce((sum, event) => sum + event.costUsd, 0),
    };
  });
  const maxDailyCost = Math.max(...dailySeries.map((item) => item.costUsd), 0.0001);

  return (
    <div className="space-y-6">
      <div className="py-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          AI Maliyetleri
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Exact input/output token telemetry&apos;sinden hesaplanan gerçek AI kullanım maliyetleri
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Toplam API Maliyeti",
            value: formatUsd(totalCost),
            sub: `${formatInt(events.length)} exact çağrı`,
            icon: DollarSign,
            color: "var(--color-destructive)",
          },
          {
            label: "Bu Ay",
            value: formatUsd(monthCost),
            sub: `${formatInt(monthEvents.length)} çağrı`,
            icon: BarChart3,
            color: "var(--color-warning)",
          },
          {
            label: "Son 7 Gün",
            value: formatUsd(weekCost),
            sub: `${formatInt(weekEvents.length)} çağrı`,
            icon: ReceiptText,
            color: "var(--color-primary)",
          },
          {
            label: "Çağrı Başına Ortalama",
            value: formatUsd(averageCostPerCall, 5),
            sub: `${formatInt(totalTokens)} toplam token`,
            icon: Coins,
            color: "var(--color-success)",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderTop: `3px solid ${card.color}`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                {card.label}
              </p>
              <card.icon size={15} style={{ color: card.color, opacity: 0.85 }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {card.value}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Son 7 Günlük Maliyet Akışı
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-3 items-end h-56">
            {dailySeries.map((day) => (
              <div key={day.key} className="flex flex-col items-center gap-2">
                <div className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                  {formatUsd(day.costUsd, 4)}
                </div>
                <div
                  className="w-full max-w-[44px] rounded-t-lg"
                  style={{
                    height: `${Math.max(18, (day.costUsd / maxDailyCost) * 160)}px`,
                    background: "linear-gradient(180deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 45%, black))",
                  }}
                />
                <div className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  {day.label}
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-disabled)" }}>
                  {formatInt(day.calls)} çağrı
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Coins size={16} style={{ color: "var(--color-warning)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Token Özeti
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-secondary)" }}>Input token</span>
                <strong style={{ color: "var(--color-text-primary)" }}>{formatInt(totalInputTokens)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-secondary)" }}>Output token</span>
                <strong style={{ color: "var(--color-text-primary)" }}>{formatInt(totalOutputTokens)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-secondary)" }}>Toplam token</span>
                <strong style={{ color: "var(--color-text-primary)" }}>{formatInt(totalTokens)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-text-secondary)" }}>1K token maliyeti</span>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {formatUsd(totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0, 5)}
                </strong>
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} style={{ color: "var(--color-success)" }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                En Pahalı Model
              </h2>
            </div>
            {byModel[0] ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {byModel[0].model}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {formatInt(byModel[0].calls)} çağrı, {formatInt(byModel[0].totalTokens)} token
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                  {formatUsd(byModel[0].costUsd)}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Henüz telemetry verisi yok.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <Cpu size={15} style={{ color: "var(--color-primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Model Bazında
              </h3>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {byModel.slice(0, 8).map((item) => (
              <div key={item.model} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {item.model}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInt(item.calls)} çağrı · {formatInt(item.totalTokens)} token
                    </p>
                  </div>
                  <strong style={{ color: "var(--color-success)" }}>{formatUsd(item.costUsd)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <Layers3 size={15} style={{ color: "var(--color-warning)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Modül Bazında
              </h3>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {byModule.slice(0, 8).map((item) => (
              <div key={item.module} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {item.module}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInt(item.calls)} çağrı · {formatInt(item.totalTokens)} token
                    </p>
                  </div>
                  <strong style={{ color: "var(--color-success)" }}>{formatUsd(item.costUsd)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <Users size={15} style={{ color: "var(--color-primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Kullanıcı Bazında
              </h3>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {byUser.slice(0, 8).map((item) => (
              <div key={item.userId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {item.label}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInt(item.calls)} çağrı · {formatInt(item.totalTokens)} token
                    </p>
                  </div>
                  <strong style={{ color: "var(--color-success)" }}>{formatUsd(item.costUsd)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <section
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <BrainCircuit size={15} style={{ color: "var(--color-primary)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Son Exact Çağrılar
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Zaman", "Kullanıcı", "Modül", "Model", "Input", "Output", "Maliyet"].map((label) => (
                    <th
                      key={label}
                      className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((event) => (
                  <tr key={`${event.createdAt.toISOString()}-${event.model}-${event.userId ?? "anon"}`} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {formatDate(event.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {event.user?.name || event.user?.email || event.userId || "Bilinmiyor"}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {event.module ?? "genel"}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {event.model}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInt(event.inputTokens)}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {formatInt(event.outputTokens)}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                      {formatUsd(event.costUsd, 5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <ReceiptText size={15} style={{ color: "var(--color-warning)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Aktif Fiyatlandırma
              </h3>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {pricingRows.map((row) => (
              <div key={row.model} className="px-5 py-4">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {row.displayName}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {row.model}
                </p>
                <div className="mt-3 text-xs space-y-1" style={{ color: "var(--color-text-secondary)" }}>
                  <div className="flex items-center justify-between">
                    <span>Input / 1K</span>
                    <strong style={{ color: "var(--color-text-primary)" }}>{formatUsd(row.inputPricePer1k, 6)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Output / 1K</span>
                    <strong style={{ color: "var(--color-text-primary)" }}>{formatUsd(row.outputPricePer1k, 6)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
