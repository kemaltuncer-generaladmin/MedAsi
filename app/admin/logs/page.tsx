"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronDown, ChevronRight, Download, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { clearAdminLogs, getAdminLogs } from "@/lib/actions/settings";

type LogLevel = "info" | "warn" | "error" | "success";
type LogCategory = "auth" | "user" | "ai" | "system" | "payment";
type DateRange = "today" | "7d" | "30d" | "all";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;
  userId?: string;
}

const LEVEL_COLORS: Record<
  LogLevel,
  { bg: string; text: string; label: string }
> = {
  info: { bg: "rgba(59,130,246,0.15)", text: "#60A5FA", label: "Info" },
  warn: { bg: "rgba(245,158,11,0.15)", text: "#FCD34D", label: "Warn" },
  error: { bg: "rgba(239,68,68,0.15)", text: "#F87171", label: "Error" },
  success: { bg: "rgba(16,185,129,0.15)", text: "#34D399", label: "Başarı" },
};

const CATEGORY_LABELS: Record<LogCategory, string> = {
  auth: "Auth",
  user: "Kullanıcı",
  ai: "AI",
  system: "Sistem",
  payment: "Ödeme",
};

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | "all">(
    "all",
  );
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function loadLogs() {
    setLoading(true);
    try {
      const rows = await getAdminLogs({ take: 1000 });
      setLogs(rows);
    } catch {
      toast.error("Log kayıtları yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter)
        return false;

      if (dateRange !== "all") {
        const ts = new Date(l.timestamp).getTime();
        const now = Date.now();
        if (dateRange === "today" && ts < now - 86_400_000) return false;
        if (dateRange === "7d" && ts < now - 7 * 86_400_000) return false;
        if (dateRange === "30d" && ts < now - 30 * 86_400_000) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        if (
          !l.message.toLowerCase().includes(q) &&
          !l.details?.toLowerCase().includes(q) &&
          !l.userId?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [logs, levelFilter, categoryFilter, dateRange, search]);

  async function handleClear() {
    const confirmed = window.confirm(
      "Tüm günlük kayıtları silinecek. Emin misiniz?",
    );
    if (!confirmed) return;

    try {
      await clearAdminLogs();
      toast.success("Günlük temizlendi.");
      await loadLogs();
    } catch {
      toast.error("Günlük temizlenemedi");
    }
  }

  function handleExport() {
    const lines = filteredLogs.map(
      (l) =>
        `[${l.timestamp}] [${l.level.toUpperCase().padEnd(7)}] [${l.category.padEnd(7)}] ${l.message}${l.details ? "\n  → " + l.details : ""}`,
    );
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medasi-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLogs.length} kayıt dışa aktarıldı.`);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const stats: Record<LogLevel, number> = {
    info: 0,
    warn: 0,
    error: 0,
    success: 0,
  };
  for (const l of logs) stats[l.level]++;

  return (
    <div className="space-y-5 max-w-screen-xl mx-auto pb-10">
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Aktivite Günlüğü
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {logs.length.toLocaleString("tr-TR")} toplam kayıt
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Yenile
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={14} />
            Dışa Aktar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 size={14} />
            Günlüğü Temizle
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(Object.entries(stats) as [LogLevel, number][]).map(([level, count]) => {
          const col = LEVEL_COLORS[level];
          return (
            <button
              key={level}
              onClick={() =>
                setLevelFilter((prev) => (prev === level ? "all" : level))
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor:
                  levelFilter === level ? col.bg : "var(--color-surface-elevated)",
                color: col.text,
                border: `1px solid ${
                  levelFilter === level ? col.text + "60" : "var(--color-border)"
                }`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: col.text }}
              />
              {col.label}
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: col.bg,
                  color: col.text,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "auth", "user", "ai", "system", "payment"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
                  style={{
                    backgroundColor:
                      categoryFilter === cat
                        ? "var(--color-surface-elevated)"
                        : "transparent",
                    color:
                      categoryFilter === cat
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    border:
                      categoryFilter === cat
                        ? "1px solid var(--color-primary)"
                        : "1px solid transparent",
                  }}
                >
                  {cat === "all" ? "Tümü" : CATEGORY_LABELS[cat]}
                </button>
              ),
            )}
          </div>

          <div
            className="w-px h-5 shrink-0"
            style={{ backgroundColor: "var(--color-border)" }}
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { value: "today", label: "Bugün" },
                { value: "7d", label: "Son 7 Gün" },
                { value: "30d", label: "Son 30 Gün" },
                { value: "all", label: "Tümü" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDateRange(value)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
                style={{
                  backgroundColor:
                    dateRange === value
                      ? "var(--color-surface-elevated)"
                      : "transparent",
                  color:
                    dateRange === value
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                  border:
                    dateRange === value
                      ? "1px solid var(--color-primary)"
                      : "1px solid transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-sm">
          <Input
            placeholder="Mesaj veya kullanıcı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs px-1" style={{ color: "var(--color-text-disabled)" }}>
        {filteredLogs.length.toLocaleString("tr-TR")} kayıt gösteriliyor
      </p>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Yükleniyor...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Filtreye uyan kayıt bulunamadı.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {filteredLogs.map((log) => {
              const col = LEVEL_COLORS[log.level];
              const isExpanded = expanded.has(log.id);
              return (
                <div
                  key={log.id}
                  className="px-4 py-3 transition-colors duration-100"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="text-[11px] font-mono shrink-0 pt-0.5 tabular-nums"
                      style={{
                        color: "var(--color-text-disabled)",
                        minWidth: "120px",
                      }}
                    >
                      {formatTimestamp(log.timestamp)}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
                      style={{
                        backgroundColor: col.bg,
                        color: col.text,
                        minWidth: "50px",
                        textAlign: "center",
                      }}
                    >
                      {col.label}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium shrink-0"
                      style={{
                        backgroundColor: "var(--color-surface-elevated)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-border)",
                        minWidth: "56px",
                        textAlign: "center",
                      }}
                    >
                      {CATEGORY_LABELS[log.category]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-snug" style={{ color: "var(--color-text-primary)" }}>
                          {log.message}
                          {log.userId && (
                            <span
                              className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: "var(--color-background)",
                                color: "var(--color-text-disabled)",
                              }}
                            >
                              {log.userId}
                            </span>
                          )}
                        </p>
                        {log.details && (
                          <button
                            onClick={() => toggleExpanded(log.id)}
                            className="shrink-0 p-0.5 rounded transition-colors"
                            style={{ color: "var(--color-text-disabled)" }}
                            title={isExpanded ? "Gizle" : "Detayları göster"}
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        )}
                      </div>
                      {isExpanded && log.details && (
                        <div
                          className="mt-2 px-3 py-2 rounded-md text-xs font-mono leading-relaxed"
                          style={{
                            backgroundColor: "var(--color-background)",
                            color: "var(--color-text-secondary)",
                            borderLeft: `2px solid ${col.text}`,
                          }}
                        >
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
