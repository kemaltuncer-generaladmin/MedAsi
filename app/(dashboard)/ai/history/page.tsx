"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Filter,
  History,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

const HIDDEN_HISTORY_IDS_KEY = "medasi_ai_history_hidden_ids_v2";

type HistoryItem = {
  id: string;
  model: "FAST" | "EFFICIENT";
  modelName: string;
  tokensUsed: number;
  module: string;
  createdAt: string;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function AIHistoryPage() {
  const [entries, setEntries] = useState<HistoryItem[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState<"all" | "FAST" | "EFFICIENT">("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_HISTORY_IDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        setHiddenIds(new Set(parsed));
      }
    } catch {
      setHiddenIds(new Set());
    }

    async function fetchHistory() {
      try {
        const res = await fetch("/api/ai/history?limit=80", { cache: "no-store" });
        if (!res.ok) throw new Error("AI geçmişi yüklenemedi");
        const data = (await res.json()) as { history?: HistoryItem[] };
        setEntries(Array.isArray(data.history) ? data.history : []);
      } catch {
        toast.error("AI geçmişi yüklenemedi");
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
  }, []);

  useEffect(() => {
    localStorage.setItem(HIDDEN_HISTORY_IDS_KEY, JSON.stringify(Array.from(hiddenIds)));
  }, [hiddenIds]);

  function handleClearVisible() {
    const visibleIds = filteredEntries.map((item) => item.id);
    if (visibleIds.length === 0) {
      toast("Temizlenecek kayıt bulunamadı");
      return;
    }

    setHiddenIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
    toast.success("Görünüm temizlendi");
  }

  function handleRestore() {
    setHiddenIds(new Set());
    toast.success("Geçmiş görünümü geri alındı");
  }

  const visibleEntries = useMemo(
    () => entries.filter((item) => !hiddenIds.has(item.id)),
    [entries, hiddenIds],
  );

  const filteredEntries = useMemo(() => {
    return visibleEntries.filter((item) => {
      const modelMatch = modelFilter === "all" || item.model === modelFilter;
      const haystack = `${item.module} ${item.modelName}`.toLowerCase();
      const searchMatch = haystack.includes(search.trim().toLowerCase());
      return modelMatch && searchMatch;
    });
  }, [visibleEntries, modelFilter, search]);

  const fastCount = filteredEntries.filter((item) => item.model === "FAST").length;
  const efficientCount = filteredEntries.filter((item) => item.model === "EFFICIENT").length;
  const tokenSum = filteredEntries.reduce((sum, item) => sum + item.tokensUsed, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="h-20 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
        <div className="h-20 animate-pulse rounded-3xl bg-[var(--color-surface-elevated)]" />
      </div>
    );
  }

  return (
    <AccountSubpageShell
      icon={History}
      title="AI Geçmişi"
      description="Son AI kullanım kayıtlarınızı filtreleyin, inceleyin ve görünümden temizleyin."
      stats={[
        { label: "Kayıt", value: String(filteredEntries.length) },
        { label: "FAST", value: String(fastCount) },
        { label: "EFFICIENT", value: String(efficientCount) },
        { label: "Toplam token", value: tokenSum.toLocaleString("tr-TR") },
      ]}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="border border-[var(--color-border)]"
            onClick={handleRestore}
            disabled={hiddenIds.size === 0}
          >
            Geri al
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-[var(--color-border)]"
            onClick={handleClearVisible}
            disabled={filteredEntries.length === 0}
          >
            <Trash2 size={14} />
            Görünümü temizle
          </Button>
        </>
      }
    >
      <Card variant="bordered" className="rounded-3xl">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Modül veya model ara"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 pl-9 pr-3 text-sm"
              />
            </div>

            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] p-1">
              <Filter size={12} className="ml-1 text-[var(--color-text-secondary)]" />
              {(["all", "FAST", "EFFICIENT"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setModelFilter(option)}
                  className={[
                    "rounded-md px-3 py-1 text-xs font-medium",
                    modelFilter === option
                      ? "bg-[var(--color-primary)] text-black"
                      : "text-[var(--color-text-secondary)]",
                  ].join(" ")}
                >
                  {option === "all" ? "Tümü" : option}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredEntries.length === 0 ? (
        <Card variant="bordered" className="rounded-3xl">
          <CardContent className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
            Filtreye uygun kayıt bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} variant="bordered" className="rounded-3xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={entry.model === "FAST" ? "default" : "warning"}>
                      {entry.model}
                    </Badge>
                    <Badge variant="outline">{entry.module}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                      <Clock size={11} />
                      {formatRelative(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{entry.modelName}</p>
                </div>

                <div className="text-right">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                    <Zap size={13} />
                    {entry.tokensUsed.toLocaleString("tr-TR")} token
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {new Date(entry.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AccountSubpageShell>
  );
}
