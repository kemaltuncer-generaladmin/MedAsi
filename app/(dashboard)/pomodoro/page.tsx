"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Coffee,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";

type Mode = "work" | "short" | "long";
type PhaseState = "ready" | "running" | "paused";

type ApiSummary = {
  package: { id: string; name: string; tokenGrant: string };
  wallet: { balance: string; totalEarned: string; totalSpent: string; updatedAt: string } | null;
  stats: {
    todayWorkSessions: number;
    todayFocusMinutes: number;
    currentCycleWorkSessions: number;
    nextBreakMode: Exclude<Mode, "work">;
    completedCyclesToday: number;
    totalRecentWorkSessions: number;
  };
  todaySessions: Array<{ id: string; durationMinutes: number; completedAt: string; mode: Mode }>;
  recentSessions: Array<{ id: string; durationMinutes: number; completedAt: string; mode: Mode }>;
  timerConfig: { workMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; cycleLength: number };
};

const STORAGE_KEY = "medasi_focus_station_v1";

function formatSeconds(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getModeDuration(summary: ApiSummary | null, mode: Mode) {
  if (!summary) {
    if (mode === "work") return 25 * 60;
    if (mode === "long") return 15 * 60;
    return 5 * 60;
  }

  if (mode === "work") return summary.timerConfig.workMinutes * 60;
  if (mode === "long") return summary.timerConfig.longBreakMinutes * 60;
  return summary.timerConfig.shortBreakMinutes * 60;
}

export default function PomodoroPage() {
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<Mode>("work");
  const [phase, setPhase] = useState<PhaseState>("ready");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          task?: string;
          mode?: Mode;
          phase?: PhaseState;
          remainingSeconds?: number;
          deadlineAt?: number | null;
        };
        if (typeof parsed.task === "string") setTask(parsed.task);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.phase) setPhase(parsed.phase);
        if (typeof parsed.remainingSeconds === "number") setRemainingSeconds(parsed.remainingSeconds);
        if (typeof parsed.deadlineAt === "number") setDeadlineAt(parsed.deadlineAt);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ task, mode, phase, remainingSeconds, deadlineAt }),
    );
  }, [task, mode, phase, remainingSeconds, deadlineAt]);

  async function loadSummary() {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/pomodoro", {
        headers: { "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      if (!res.ok) throw new Error("Pomodoro summary failed");
      const payload = await res.json();
      setSummary(payload.summary as ApiSummary);
      setRemainingSeconds((prev) => (prev === 25 * 60 ? getModeDuration(payload.summary, mode) : prev));
    } catch {
      toast.error("Odak istasyonu yüklenemedi.");
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (phase !== "running" || !deadlineAt) return;

    const interval = window.setInterval(() => {
      const next = Math.max(0, Math.floor((deadlineAt - Date.now()) / 1000));
      setRemainingSeconds(next);

      if (next === 0 && !completedRef.current) {
        completedRef.current = true;
        setPhase("ready");
        setDeadlineAt(null);
        if (mode === "work") {
          void syncCompletedSession();
        }
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [deadlineAt, mode, phase, syncCompletedSession]);

  useEffect(() => {
    if (phase !== "running") {
      completedRef.current = false;
    }
  }, [phase]);

  async function syncCompletedSession() {
    setSyncing(true);
    try {
      const durationMinutes = Math.max(1, Math.round(getModeDuration(summary, "work") / 60));
      const res = await fetch("/api/pomodoro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({
          mode: "work",
          durationMinutes,
          task,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("sync");
      const payload = await res.json();
      if (payload.summary) setSummary(payload.summary as ApiSummary);
      toast.success("Odak seansı kaydedildi.");
      const nextMode = summary?.stats.nextBreakMode ?? "short";
      setMode(nextMode);
      setRemainingSeconds(getModeDuration(summary, nextMode));
    } catch {
      toast.error("Seans kaydedilemedi.");
    } finally {
      setSyncing(false);
    }
  }

  const progress = useMemo(() => {
    const duration = getModeDuration(summary, mode);
    return Math.min(100, Math.max(0, ((duration - remainingSeconds) / duration) * 100));
  }, [mode, remainingSeconds, summary]);

  const suggestion =
    mode === "work"
      ? task.trim()
        ? `"${task}" için tek hedef: blok boyunca konu değiştirme.`
        : "Bu blokta tek bir hedef seç: briefing çıktısını aksiyona çevir."
      : mode === "long"
        ? "Uzun molada ekrana değil bedene dön: yürü, su iç, ritmi sıfırla."
        : "Kısa molada yeni iş açma; yalnız zihni boşalt.";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <div className="space-y-6">
        <section className="glass-panel rounded-3xl p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
                <Timer size={14} />
                Focus Station
              </div>
              <h1 className="mt-5 text-3xl font-semibold text-[var(--color-text-primary)]">
                Odak Oturumu
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
                Ring timer, görev bağlama ve AI odak önerisi tek yüzeyde. Amaç daha çok iş değil, daha temiz dikkat.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void loadSummary()} disabled={summaryLoading}>
              {summaryLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Yenile
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center justify-center gap-6 py-4">
              <div className="relative flex h-[320px] w-[320px] items-center justify-center rounded-full border border-[var(--color-border)] bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_65%)]">
                <div
                  className="absolute inset-[14px] rounded-full border border-[var(--color-border)]"
                  style={{
                    background: `conic-gradient(var(--color-primary) ${progress}%, rgba(255,255,255,0.06) ${progress}% 100%)`,
                  }}
                />
                <div className="absolute inset-[30px] rounded-full bg-[var(--color-background)]/90" />
                <div className="relative z-10 text-center">
                  <p className="medasi-panel-title">
                    {mode === "work" ? "Odak" : mode === "long" ? "Uzun Mola" : "Kısa Mola"}
                  </p>
                  <p className="mt-3 font-mono text-6xl font-semibold text-[var(--color-text-primary)]">
                    {formatSeconds(remainingSeconds)}
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                    {phase === "running" ? "Seans akıyor" : phase === "paused" ? "Duraklatıldı" : "Hazır"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => {
                    if (phase === "running") {
                      setPhase("paused");
                      setRemainingSeconds(Math.max(0, Math.floor((deadlineAt! - Date.now()) / 1000)));
                      setDeadlineAt(null);
                      return;
                    }
                    setPhase("running");
                    setDeadlineAt(Date.now() + remainingSeconds * 1000);
                  }}
                >
                  {phase === "running" ? <Pause size={16} /> : <Play size={16} />}
                  {phase === "running" ? "Duraklat" : "Başlat"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPhase("ready");
                    setDeadlineAt(null);
                    setRemainingSeconds(getModeDuration(summary, mode));
                  }}
                >
                  <RotateCcw size={16} />
                  Sıfırla
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle className="text-base">Bu blokta ne yapmalıyım?</CardTitle>
            <CardContent className="mt-5 text-sm leading-7">
              {suggestion}
            </CardContent>
            <div className="mt-5 space-y-3">
              {(["work", "short", "long"] as Mode[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => {
                    setMode(candidate);
                    setPhase("ready");
                    setDeadlineAt(null);
                    setRemainingSeconds(getModeDuration(summary, candidate));
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-elevated)]"
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {candidate === "work" ? "Odak Bloğu" : candidate === "long" ? "Uzun Mola" : "Kısa Mola"}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {Math.round(getModeDuration(summary, candidate) / 60)} dk
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle className="text-base">Görev Bağla</CardTitle>
          <div className="mt-5 space-y-4">
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Örnek: Kardiyoloji zayıf alanını briefing üzerinden 25 dakikada toparla"
              className="min-h-[120px] w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 text-sm outline-none"
            />
            <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
              Görevi net yazmak dikkat dağılmasını azaltır. Tek blokta tek konu.
            </p>
          </div>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardTitle className="text-base">Günlük Odak Özeti</CardTitle>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Tamamlanan seans</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                {summary?.stats.todayWorkSessions ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Bugünkü odak dakikası</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                {summary?.stats.todayFocusMinutes ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <p className="medasi-panel-title">Sonraki mola</p>
              <p className="mt-2 text-sm text-[var(--color-text-primary)]">
                {summary?.stats.nextBreakMode === "long" ? "Uzun mola" : "Kısa mola"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain size={16} className="text-[var(--color-primary)]" />
            AI Focus Note
          </CardTitle>
          <CardContent className="mt-5 text-sm leading-7">
            {syncing
              ? "Seans kaydı işleniyor."
              : "Briefing sonrası ilk odak bloğunda yeni materyal açma. Önce mevcut zayıf alanı tek soruyla test et, sonra genişlet."}
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="text-base">Son Seanslar</CardTitle>
          <div className="mt-5 space-y-3">
            {summary?.recentSessions.length ? (
              summary.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {session.mode === "work" ? "Odak seansı" : session.mode === "long" ? "Uzun mola" : "Kısa mola"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {new Intl.DateTimeFormat("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      }).format(new Date(session.completedAt))}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {session.durationMinutes} dk
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Henüz odak seansı kaydı yok. İlk bloğu başlattığında burada görünecek.
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
