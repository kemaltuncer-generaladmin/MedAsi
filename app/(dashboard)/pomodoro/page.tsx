"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import {
  AlertCircle,
  Brain,
  Coffee,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";

type Mode = "work" | "short" | "long";
type PhaseState = "ready" | "running" | "paused";

type ModeConfig = {
  label: string;
  duration: number;
  color: string;
  icon: ElementType;
  helper: string;
};

type TimerState = {
  mode: Mode;
  phaseState: PhaseState;
  deadlineAt: number | null;
  pausedRemainingSeconds: number;
  cycleWorkSessions: number;
  task: string;
};

type PendingSession = {
  clientId: string;
  mode: "work";
  task: string;
  durationMinutes: number;
  completedAt: string;
};

type ApiSession = {
  id: string;
  durationMinutes: number;
  completedAt: string;
  mode: Mode;
};

type ApiSummary = {
  package: {
    id: string;
    name: string;
    tokenGrant: string;
  };
  wallet: {
    balance: string;
    totalEarned: string;
    totalSpent: string;
    updatedAt: string;
  } | null;
  stats: {
    todayWorkSessions: number;
    todayFocusMinutes: number;
    currentCycleWorkSessions: number;
    nextBreakMode: Exclude<Mode, "work">;
    completedCyclesToday: number;
    totalRecentWorkSessions: number;
  };
  todaySessions: ApiSession[];
  recentSessions: ApiSession[];
  timerConfig: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cycleLength: number;
  };
};

const TIMER_STORAGE_KEY = "medasi_pomodoro_timer_v2";
const PENDING_STORAGE_KEY = "medasi_pomodoro_pending_v2";
const CYCLE_LENGTH = 4;

const MODE_CONFIG: Record<Mode, ModeConfig> = {
  work: {
    label: "Odak",
    duration: 25 * 60,
    color: "var(--color-primary)",
    icon: Brain,
    helper: "Derin çalışma bloğu",
  },
  short: {
    label: "Kısa mola",
    duration: 5 * 60,
    color: "var(--color-success)",
    icon: Coffee,
    helper: "Kısa nefes ve su molası",
  },
  long: {
    label: "Uzun mola",
    duration: 15 * 60,
    color: "var(--color-warning)",
    icon: Timer,
    helper: "Döngüyü sıfırlayan toparlanma arası",
  },
};

const RADIUS = 112;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_TIMER_STATE: TimerState = {
  mode: "work",
  phaseState: "ready",
  deadlineAt: null,
  pausedRemainingSeconds: MODE_CONFIG.work.duration,
  cycleWorkSessions: 0,
  task: "",
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStoredTimerState(): TimerState {
  if (typeof window === "undefined") return DEFAULT_TIMER_STATE;
  const parsed = safeParse<Partial<TimerState>>(window.localStorage.getItem(TIMER_STORAGE_KEY));
  if (!parsed) return DEFAULT_TIMER_STATE;

  const mode: Mode = parsed.mode === "short" || parsed.mode === "long" ? parsed.mode : "work";
  const phaseState: PhaseState =
    parsed.phaseState === "running" || parsed.phaseState === "paused" ? parsed.phaseState : "ready";
  const pausedRemainingSeconds =
    typeof parsed.pausedRemainingSeconds === "number" && Number.isFinite(parsed.pausedRemainingSeconds)
      ? Math.max(0, Math.floor(parsed.pausedRemainingSeconds))
      : MODE_CONFIG[mode].duration;
  const deadlineAt =
    typeof parsed.deadlineAt === "number" && Number.isFinite(parsed.deadlineAt)
      ? parsed.deadlineAt
      : null;
  const cycleWorkSessions =
    typeof parsed.cycleWorkSessions === "number" && Number.isFinite(parsed.cycleWorkSessions)
      ? Math.max(0, Math.floor(parsed.cycleWorkSessions))
      : 0;
  const task = typeof parsed.task === "string" ? parsed.task : "";

  return {
    mode,
    phaseState,
    deadlineAt,
    pausedRemainingSeconds,
    cycleWorkSessions,
    task,
  };
}

function readStoredPendingSessions(): PendingSession[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<PendingSession[]>(window.localStorage.getItem(PENDING_STORAGE_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is PendingSession => {
      return (
        typeof item === "object" &&
        item !== null &&
        item.mode === "work" &&
        typeof item.clientId === "string" &&
        typeof item.task === "string" &&
        typeof item.durationMinutes === "number" &&
        typeof item.completedAt === "string"
      );
    })
    .slice(0, 20);
}

function formatTimeParts(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safeSeconds % 60).toString().padStart(2, "0");
  return { minutes, secs };
}

function formatNumber(value: number | string | bigint) {
  return new Intl.NumberFormat("tr-TR").format(Number(value));
}

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getModeDurationSeconds(mode: Mode) {
  return MODE_CONFIG[mode].duration;
}

function getNextMode(mode: Mode, cycleWorkSessions: number): Mode {
  if (mode !== "work") return "work";
  return (cycleWorkSessions + 1) % CYCLE_LENGTH === 0 ? "long" : "short";
}

function createReadyState(mode: Mode, cycleWorkSessions = 0, task = ""): TimerState {
  return {
    mode,
    phaseState: "ready",
    deadlineAt: null,
    pausedRemainingSeconds: getModeDurationSeconds(mode),
    cycleWorkSessions,
    task,
  };
}

function inferSessionLabel(mode: Mode) {
  if (mode === "work") return "Odak seansı";
  return mode === "long" ? "Uzun mola" : "Kısa mola";
}

export default function PomodoroPage() {
  const [timer, setTimer] = useState<TimerState>(DEFAULT_TIMER_STATE);
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  const syncInFlightRef = useRef(false);
  const initialOverdueCompletionRef = useRef(false);
  const completionGuardRef = useRef(false);

  const currentDurationSeconds = getModeDurationSeconds(timer.mode);
  const remainingSeconds =
    timer.phaseState === "running" && timer.deadlineAt
      ? Math.max(0, Math.ceil((timer.deadlineAt - now) / 1000))
      : timer.pausedRemainingSeconds || currentDurationSeconds;
  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / currentDurationSeconds));
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const modeColor = MODE_CONFIG[timer.mode].color;
  const ModeIcon = MODE_CONFIG[timer.mode].icon;
  const nextMode = getNextMode(timer.mode, timer.cycleWorkSessions);
  const nextModeLabel = MODE_CONFIG[nextMode].label;
  const nextModeColor = MODE_CONFIG[nextMode].color;

  const displayedWorkSessions = (summary?.stats.todayWorkSessions ?? 0) + pendingSessions.length;
  const displayedFocusMinutes =
    (summary?.stats.todayFocusMinutes ?? 0) +
    pendingSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const displayedCycles = Math.floor(displayedWorkSessions / CYCLE_LENGTH);
  const cycleProgress = `${Math.min(timer.cycleWorkSessions + (timer.mode === "work" ? 1 : 0), CYCLE_LENGTH)}/${CYCLE_LENGTH}`;
  const pendingWorkCount = pendingSessions.length;
  const pendingBadge = pendingWorkCount > 0 ? `${pendingWorkCount} bekliyor` : "Kayıt senkron";

  const visibleSessions = useMemo(() => {
    const rows: Array<{
      key: string;
      label: string;
      task: string;
      completedAt: string;
      durationMinutes: number;
      badge: string;
      kind: "pending" | "server";
    }> = [];

    for (const session of summary?.recentSessions ?? []) {
      rows.push({
        key: `server-${session.id}`,
        label: inferSessionLabel(session.mode),
        task: session.mode === "work" ? "Odak seansı" : MODE_CONFIG[session.mode].label,
        completedAt: session.completedAt,
        durationMinutes: session.durationMinutes,
        badge: `${session.durationMinutes} dk`,
        kind: "server",
      });
    }

    for (const session of pendingSessions) {
      rows.push({
        key: `pending-${session.clientId}`,
        label: "Yerelde bekliyor",
        task: session.task,
        completedAt: session.completedAt,
        durationMinutes: session.durationMinutes,
        badge: `${session.durationMinutes} dk`,
        kind: "pending",
      });
    }

    return rows
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10);
  }, [pendingSessions, summary?.recentSessions]);

  const playSound = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const AudioCtor =
        window.AudioContext ||
        (window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioCtor) return;

      const ctx = new AudioCtor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.24, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.55);
      void setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 750);
    } catch {
      // Sessiz kal; timer akışı bozulmasın.
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
      const response = await fetch("/api/pomodoro", {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-timezone": timezone,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { summary?: ApiSummary };
      if (data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error("Summary missing");
      }
    } catch {
      setSummaryError("Bugünkü özet yüklenemedi. Timer yine de çalışabilir.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const syncPendingSession = useCallback(
    async (session: PendingSession) => {
      syncInFlightRef.current = true;
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
        const response = await fetch("/api/pomodoro", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "x-timezone": timezone,
          },
          body: JSON.stringify(session),
        });

        const payload = (await response.json().catch(() => null)) as
          | { summary?: ApiSummary; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        if (payload?.summary) {
          setSummary(payload.summary);
        }

        setPendingSessions((prev) => prev.filter((item) => item.clientId !== session.clientId));
        setSyncError(null);
        return true;
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? `Kayıt şimdilik yerelde tutuldu: ${error.message}`
            : "Kayıt şimdilik yerelde tutuldu. Bağlantı gelince tekrar denenecek.",
        );
        return false;
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [],
  );

  const completeCurrentPhase = useCallback(
    async (options?: { silent?: boolean }) => {
      const completedMode = timer.mode;
      const completedTask = timer.task.trim();
      const completedAt = new Date().toISOString();
      const completedWorkSessions =
        completedMode === "work" ? timer.cycleWorkSessions + 1 : timer.cycleWorkSessions;
      const targetMode = completedMode === "work" ? getNextMode(completedMode, timer.cycleWorkSessions) : "work";
      const nextDurationSeconds = getModeDurationSeconds(targetMode);

      setTimer((prev) => ({
        ...prev,
        mode: targetMode,
        phaseState: "ready",
        deadlineAt: null,
        pausedRemainingSeconds: nextDurationSeconds,
        cycleWorkSessions: completedWorkSessions,
      }));

      if (completedMode === "work") {
        const localSession: PendingSession = {
          clientId: crypto.randomUUID(),
          mode: "work",
          task: completedTask || "Görev belirtilmedi",
          durationMinutes: MODE_CONFIG.work.duration / 60,
          completedAt,
        };

        setPendingSessions((prev) => [localSession, ...prev].slice(0, 20));
        void syncPendingSession(localSession);
      }

      if (!options?.silent) {
        playSound();
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("MEDASI Pomodoro", {
            body:
              completedMode === "work"
                ? "Çalışma seansı tamamlandı. Mola başlıyor."
                : "Mola bitti. Yeni odak bloğu hazır.",
            icon: "/favicon.ico",
          });
        }
      }
    },
    [playSound, syncPendingSession, timer.cycleWorkSessions, timer.mode, timer.task],
  );

  const resetCurrentPhase = useCallback(() => {
    setTimer((prev) => ({
      ...prev,
      phaseState: "ready",
      deadlineAt: null,
      pausedRemainingSeconds: getModeDurationSeconds(prev.mode),
    }));
    setNow(Date.now());
  }, []);

  const changeMode = useCallback((mode: Mode) => {
    setTimer((prev) => createReadyState(mode, prev.cycleWorkSessions, prev.task));
    setNow(Date.now());
  }, []);

  const togglePrimaryAction = useCallback(async () => {
    if (timer.phaseState === "running") {
      const remaining = Math.max(1, remainingSeconds);
      setTimer((prev) => ({
        ...prev,
        phaseState: "paused",
        deadlineAt: null,
        pausedRemainingSeconds: remaining,
      }));
      return;
    }

    if (timer.phaseState === "paused" || timer.phaseState === "ready") {
      await requestNotificationPermission();
      const nextRemaining = Math.max(1, timer.pausedRemainingSeconds || currentDurationSeconds);
      setTimer((prev) => ({
        ...prev,
        phaseState: "running",
        deadlineAt: Date.now() + nextRemaining * 1000,
        pausedRemainingSeconds: nextRemaining,
      }));
      setNow(Date.now());
    }
  }, [currentDurationSeconds, remainingSeconds, requestNotificationPermission, timer.pausedRemainingSeconds, timer.phaseState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTimer = readStoredTimerState();
    const storedPending = readStoredPendingSessions();

    setTimer(storedTimer);
    setPendingSessions(storedPending);
    setNow(Date.now());
    setHydrated(true);

    if (
      storedTimer.phaseState === "running" &&
      storedTimer.deadlineAt !== null &&
      storedTimer.deadlineAt <= Date.now()
    ) {
      initialOverdueCompletionRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
  }, [hydrated, timer]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingSessions));
  }, [hydrated, pendingSessions]);

  useEffect(() => {
    if (!hydrated) return;
    void loadSummary();
  }, [hydrated, loadSummary]);

  useEffect(() => {
    if (!summary) return;
    setTimer((prev) => {
      if (prev.phaseState === "running") return prev;
      const nextCycle = summary.stats.currentCycleWorkSessions;
      if (prev.cycleWorkSessions === nextCycle) return prev;
      return {
        ...prev,
        cycleWorkSessions: nextCycle,
      };
    });
  }, [summary]);

  useEffect(() => {
    if (typeof window === "undefined" || timer.phaseState !== "running") return;

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(id);
  }, [timer.deadlineAt, timer.phaseState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncClock = () => setNow(Date.now());
    const handleVisibility = () => syncClock();

    window.addEventListener("focus", syncClock);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", syncClock);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (timer.phaseState !== "running") {
      completionGuardRef.current = false;
      return;
    }

    if (remainingSeconds > 0) {
      completionGuardRef.current = false;
      return;
    }

    if (completionGuardRef.current) return;
    completionGuardRef.current = true;

    const shouldMute = initialOverdueCompletionRef.current;
    initialOverdueCompletionRef.current = false;
    void completeCurrentPhase({ silent: shouldMute });
  }, [completeCurrentPhase, remainingSeconds, timer.phaseState]);

  useEffect(() => {
    if (!hydrated || syncInFlightRef.current || pendingSessions.length === 0) return;
    let cancelled = false;

    const flushQueue = async () => {
      for (const session of pendingSessions) {
        if (cancelled) break;
        const ok = await syncPendingSession(session);
        if (!ok) break;
      }
    };

    void flushQueue();

    return () => {
      cancelled = true;
    };
  }, [hydrated, pendingSessions, syncPendingSession]);

  useEffect(() => {
    if (timer.phaseState !== "ready") return;
    if (timer.pausedRemainingSeconds > 0) return;

    setTimer((prev) => ({
      ...prev,
      pausedRemainingSeconds: getModeDurationSeconds(prev.mode),
    }));
  }, [timer.pausedRemainingSeconds, timer.phaseState]);

  const statusText =
    timer.phaseState === "running"
      ? "Çalışıyor"
      : timer.phaseState === "paused"
        ? "Duraklatıldı"
        : "Hazır";

  const primaryLabel =
    timer.phaseState === "running"
      ? "Duraklat"
      : timer.phaseState === "paused"
        ? "Devam et"
        : "Başlat";

  const taskValue = timer.task;
  const ErrorBanner = summaryError || syncError;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Pomodoro</Badge>
              <Badge variant="secondary">{summary?.package.name ?? "Paket yükleniyor"}</Badge>
              <Badge variant={timer.phaseState === "running" ? "success" : "warning"}>{statusText}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
              Profesyonel Pomodoro
            </h1>
            <p className="max-w-2xl text-sm text-[var(--color-text-secondary)] md:text-base">
              Deadline tabanlı sayaç, otomatik faz akışı ve DB senkronlu tamamlanan odak seansları.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(MODE_CONFIG) as Mode[]).map((mode) => {
              const config = MODE_CONFIG[mode];
              const active = timer.mode === mode;
              const Icon = config.icon;

              return (
                <button
                  key={mode}
                  onClick={() => changeMode(mode)}
                  className={[
                    "flex min-w-[128px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                    active
                      ? "border-transparent bg-white/8 shadow-lg"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-white/6",
                  ].join(" ")}
                  style={active ? { boxShadow: `0 0 0 1px ${config.color}40, 0 18px 36px rgba(0,0,0,0.22)` } : undefined}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${config.color}1a`, color: config.color }}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">{config.label}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {Math.round(config.duration / 60)} dk · {config.helper}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card variant="bordered" className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 35%)",
              }}
            />
            <CardContent className="relative flex flex-col items-center gap-6 py-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary">
                  Döngü {Math.min(timer.cycleWorkSessions + (timer.mode === "work" ? 1 : 0), CYCLE_LENGTH)}/{CYCLE_LENGTH}
                </Badge>
                <Badge variant="outline">Sonraki: {nextModeLabel}</Badge>
                <Badge variant="outline">{pendingBadge}</Badge>
              </div>

              <div className="relative flex items-center justify-center">
                <svg width="300" height="300" viewBox="0 0 300 300" aria-hidden="true">
                  <circle
                    cx="150"
                    cy="150"
                    r={RADIUS}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r={RADIUS}
                    fill="none"
                    stroke={modeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 150 150)"
                    style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <ModeIcon size={22} style={{ color: modeColor }} className="mb-2" />
                  <p className="font-mono text-6xl font-semibold tabular-nums text-[var(--color-text-primary)] md:text-7xl">
                    {formatTimeParts(remainingSeconds).minutes}:{formatTimeParts(remainingSeconds).secs}
                  </p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-[0.24em]" style={{ color: modeColor }}>
                    {MODE_CONFIG[timer.mode].label}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{taskValue || "Görev belirtilmedi"}</p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{taskValue ? "Bu görev kaydedilecek" : "İstersen görev alanını doldur"}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="ghost" size="md" onClick={resetCurrentPhase}>
                  <RotateCcw size={16} />
                  Sıfırla
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    void togglePrimaryAction();
                  }}
                  className="min-w-[170px] px-8"
                  style={{ backgroundColor: modeColor }}
                >
                  {timer.phaseState === "running" ? <Pause size={18} /> : <Play size={18} />}
                  {primaryLabel}
                </Button>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Bugün odak</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                    {summaryLoading ? <Loader2 className="inline h-5 w-5 animate-spin" /> : formatNumber(displayedWorkSessions)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Bugün odak dk</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{formatNumber(displayedFocusMinutes)} dk</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Bu döngü</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{cycleProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card variant="bordered">
              <CardTitle className="mb-3 text-base">Seans ayarları</CardTitle>
              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Çalışma</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{Math.round(currentDurationSeconds / 60)} dk</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sonraki faz</span>
                  <span className="font-medium text-[var(--color-text-primary)]" style={{ color: nextModeColor }}>
                    {nextModeLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>İlerleme</span>
                  <span className="font-medium text-[var(--color-text-primary)]">%{Math.round(progress * 100)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kayıtlar</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{pendingWorkCount} yerel · {summary?.stats.totalRecentWorkSessions ?? 0} sunucu</span>
                </div>
              </div>
            </Card>

            <Card variant="bordered">
              <CardTitle className="mb-3 text-base">Görev</CardTitle>
              <input
                type="text"
                value={timer.task}
                onChange={(event) =>
                  setTimer((prev) => ({
                    ...prev,
                    task: event.target.value,
                  }))
                }
                placeholder="Örn: Kardiyoloji tekrar, vaka özeti, soru çözümü..."
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-primary)] focus:outline-none"
              />
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                Görev bilgisi sadece arayüzde kalır; tamamlanan odak seansı DB’ye süre olarak yazılır.
              </p>
            </Card>

            <Card variant="bordered">
              <CardTitle className="mb-3 text-base">Paket ve token</CardTitle>
              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div className="flex items-center justify-between gap-4">
                  <span>Paket</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{summary?.package.name ?? "Yükleniyor"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Başlangıç tokenı</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {summary ? formatNumber(summary.package.tokenGrant) : "..."}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Cüzdan</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {summary?.wallet ? formatNumber(summary.wallet.balance) : "0"}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {ErrorBanner ? (
        <Card variant="bordered" className="border-l-4 border-l-[var(--color-warning)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--color-warning)]" />
            <div className="space-y-1">
              <CardTitle className="text-base">Bağlantı uyarısı</CardTitle>
              <p className="text-sm text-[var(--color-text-secondary)]">{ErrorBanner}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card variant="bordered">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Yakın seanslar</CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)]">API’den gelen bugünkü ve son tamamlanan seanslar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Bugün {formatNumber(displayedCycles)} çevrim</Badge>
            <Badge variant="outline">{summaryLoading ? "Özet yükleniyor" : "Özet hazır"}</Badge>
          </div>
        </div>

        {visibleSessions.length === 0 ? (
          <div className="py-10 text-center">
            <Timer size={32} className="mx-auto mb-3 text-[var(--color-text-secondary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">Henüz tamamlanan seans yok.</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">İlk odak bloğunu başlatınca burada görünür.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleSessions.map((session) => (
              <div
                key={session.key}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: session.kind === "pending" ? "rgba(255, 188, 66, 0.14)" : "rgba(91, 140, 255, 0.14)",
                      color: session.kind === "pending" ? "var(--color-warning)" : "var(--color-primary)",
                    }}
                  >
                    {session.kind === "pending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{session.label}</span>
                      <Badge variant={session.kind === "pending" ? "warning" : "secondary"}>{session.kind === "pending" ? "Yerelde" : "Kayıtlı"}</Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{session.task}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                  <span>{formatSessionTime(session.completedAt)}</span>
                  <Badge variant="outline">{session.badge}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
