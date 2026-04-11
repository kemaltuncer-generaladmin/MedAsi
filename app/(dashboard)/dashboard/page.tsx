"use client";

import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Users, FlaskConical, FileText, Sparkles,
  Brain, BookOpen, Stethoscope, Gamepad2, Calculator,
  Clock, MapPin, CloudSun, Sun, Cloud, CloudRain, Snowflake,
  Target, CheckCircle, Circle, TrendingUp, Zap, Focus,
  Timer, BookMarked, HelpCircle, Layers, X, Play, Square,
  ChevronRight, Activity, Award, BarChart3, Loader2,
  RefreshCw, Star, Flame, Coffee, Moon,
} from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

// ── Tipler ──────────────────────────────────────────────────────────────────
type WeatherData = {
  temp: number;
  weathercode: number;
  city: string;
};

type DashboardStats = {
  patientCount: number;
  noteCount: number;
  totalQuestions: number;
  totalCorrect: number;
  weakAreas: string[];
  strongAreas: string[];
  aiSummary: string | null;
  motivationScore: number | null;
  weeklyChart: { date: string; minutes: number }[];
  activeStudySession: { id: string; startedAt: string } | null;
  dailyGoals: DailyGoalsSnapshot;
};

type DailyGoal = { id: string; text: string; done: boolean };
type DailyGoalsSnapshot = { date: string; goals: DailyGoal[] };

// ── Hava durumu kodu → ikon/metin ─────────────────────────────────────────
function weatherIcon(code: number) {
  if (code === 0) return <Sun size={18} className="text-yellow-400" />;
  if (code <= 3) return <CloudSun size={18} className="text-yellow-300" />;
  if (code <= 67) return <CloudRain size={18} className="text-blue-400" />;
  if (code <= 77) return <Snowflake size={18} className="text-blue-200" />;
  return <Cloud size={18} className="text-[var(--color-text-secondary)]" />;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Açık";
  if (code <= 3) return "Parçalı bulutlu";
  if (code <= 48) return "Sisli";
  if (code <= 67) return "Yağmurlu";
  if (code <= 77) return "Karlı";
  return "Bulutlu";
}

function greetingByHour(h: number) {
  if (h < 6) return { text: "İyi geceler", icon: <Moon size={22} className="text-[var(--color-primary)]" /> };
  if (h < 12) return { text: "Günaydın", icon: <Sun size={22} className="text-yellow-400" /> };
  if (h < 18) return { text: "İyi günler", icon: <Coffee size={22} className="text-[var(--color-warning)]" /> };
  return { text: "İyi akşamlar", icon: <Moon size={22} className="text-[var(--color-primary)]" /> };
}

const DEFAULT_GOALS: DailyGoal[] = [
  { id: "goal-1", text: "Bugün 25 dk odaklanmış çalış (Pomodoro)", done: false },
  { id: "goal-2", text: "AI ile en az 1 konu pekiştir", done: false },
  { id: "goal-3", text: "Zayıf alanında 5 soru çöz", done: false },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultGoals(): DailyGoal[] {
  return DEFAULT_GOALS.map((goal) => ({ ...goal }));
}

function normalizeGoalItem(value: unknown, index: number): DailyGoal | null {
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    return {
      id: `legacy-goal-${index + 1}`,
      text,
      done: false,
    };
  }

  if (!isRecord(value)) return null;
  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text) return null;

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `goal-${index + 1}`,
    text,
    done: Boolean(value.done),
  };
}

function normalizeDailyGoals(value: unknown): DailyGoalsSnapshot {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  if (Array.isArray(value)) {
    return {
      date: todayKey,
      goals: value
        .map((item, index) => normalizeGoalItem(item, index))
        .filter((item): item is DailyGoal => item !== null),
    };
  }

  if (isRecord(value)) {
    const date = typeof value.date === "string" ? value.date : todayKey;
    const rawGoals = Array.isArray(value.goals) ? value.goals : [];
    return {
      date,
      goals: rawGoals
        .map((item, index) => normalizeGoalItem(item, index))
        .filter((item): item is DailyGoal => item !== null),
    };
  }

  return {
    date: todayKey,
    goals: cloneDefaultGoals(),
  };
}

const STUDY_QUICK_LINKS = [
  { href: "/flashcards/flashcard", icon: Layers, label: "Flashcard", color: "var(--color-primary)" },
  { href: "/questions/bank", icon: HelpCircle, label: "Sorular", color: "var(--color-warning)" },
  { href: "/exams/osce", icon: Stethoscope, label: "OSCE", color: "var(--color-success)" },
  { href: "/source/ders-notlari", icon: BookMarked, label: "Notlar", color: "var(--color-primary)" },
  { href: "/pomodoro", icon: Timer, label: "Pomodoro", color: "var(--color-warning)" },
  { href: "/ai-assistant", icon: Brain, label: "Mentor AI", color: "var(--color-success)" },
];

const MODULES = [
  { href: "/my-patients", icon: Users, title: "Hastalarım", desc: "Hasta listesi", color: "var(--color-primary)" },
  { href: "/clinic", icon: Stethoscope, title: "Klinik", desc: "Servis & notlar", color: "var(--color-success)" },
  { href: "/lab-viewing", icon: FlaskConical, title: "Lab Takip", desc: "Lab sonuçları", color: "var(--color-warning)" },
  { href: "/ai-diagnosis", icon: Brain, title: "AI Tanı", desc: "Olası tanılar", color: "var(--color-primary)" },
  { href: "/case-rpg", icon: Gamepad2, title: "Vaka Sim.", desc: "Sanal hasta", color: "var(--color-success)" },
  { href: "/tools/clinical-formule", icon: Calculator, title: "Formüller", desc: "Klinik hesapla", color: "var(--color-warning)" },
  { href: "/source", icon: BookOpen, title: "Kaynaklar", desc: "Slayt & notlar", color: "var(--color-primary)" },
  { href: "/ai-assistant", icon: Sparkles, title: "Mentor AI", desc: "Sana özel rehber", color: "var(--color-success)" },
];

// ── Ana bileşen ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [goals, setGoals] = useState<DailyGoal[]>(cloneDefaultGoals());
  const [goalDraft, setGoalDraft] = useState("");
  const [goalEditingId, setGoalEditingId] = useState<string | null>(null);
  const [goalEditingText, setGoalEditingText] = useState("");
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [studyLoading, setStudyLoading] = useState(false);
  const studyInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Saat ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Hedefler (DB) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (stats?.dailyGoals) {
      setGoals(normalizeDailyGoals(stats.dailyGoals).goals);
    }
  }, [stats?.dailyGoals]);

  const persistGoals = useCallback(async (nextGoals: DailyGoal[]) => {
    setGoalsSaving(true);
    try {
      const res = await fetch("/api/dashboard/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });
      if (!res.ok) throw new Error("Hedefler kaydedilemedi");
      const data = await res.json();
      setGoals(normalizeDailyGoals(data).goals);
      setGoalEditingId(null);
      setGoalEditingText("");
    } catch {
      toast.error("Hedefler kaydedilemedi.");
    } finally {
      setGoalsSaving(false);
    }
  }, []);

  const toggleGoal = useCallback((id: string) => {
    const next = goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal));
    setGoals(next);
    void persistGoals(next);
  }, [goals, persistGoals]);

  const addGoal = useCallback(() => {
    const text = goalDraft.trim();
    if (!text) return;
    const next = [...goals, { id: `goal-${crypto.randomUUID()}`, text, done: false }];
    setGoals(next);
    setGoalDraft("");
    void persistGoals(next);
  }, [goalDraft, goals, persistGoals]);

  const startEditingGoal = useCallback((goal: DailyGoal) => {
    setGoalEditingId(goal.id);
    setGoalEditingText(goal.text);
  }, []);

  const cancelEditingGoal = useCallback(() => {
    setGoalEditingId(null);
    setGoalEditingText("");
  }, []);

  const saveEditingGoal = useCallback(() => {
    if (!goalEditingId) return;
    const nextText = goalEditingText.trim();
    if (!nextText) {
      cancelEditingGoal();
      return;
    }

    const next = goals.map((goal) =>
      goal.id === goalEditingId ? { ...goal, text: nextText } : goal,
    );
    setGoals(next);
    void persistGoals(next);
  }, [cancelEditingGoal, goalEditingId, goalEditingText, goals, persistGoals]);

  const removeGoal = useCallback((id: string) => {
    const next = goals.filter((goal) => goal.id !== id);
    setGoals(next);
    if (goalEditingId === id) cancelEditingGoal();
    void persistGoals(next);
  }, [cancelEditingGoal, goalEditingId, goals, persistGoals]);

  const handleGoalEditKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEditingGoal();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingGoal();
    }
  }, [cancelEditingGoal, saveEditingGoal]);

  function renderGoalRow(goal: DailyGoal, index: number, options?: { compact?: boolean }) {
    const compact = Boolean(options?.compact);
    const editing = goalEditingId === goal.id && !compact;
    return (
      <div
        key={goal.id}
        onClick={!editing ? () => toggleGoal(goal.id) : undefined}
        className={`flex items-start gap-3 group rounded-xl transition-colors ${compact ? "cursor-pointer px-3 py-2 hover:bg-[var(--color-surface)]" : "cursor-pointer px-3 py-3 border border-[var(--color-border)] bg-[var(--color-surface)]/70"}`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleGoal(goal.id);
          }}
          className="mt-0.5 shrink-0"
          aria-label={goal.done ? "Görevi tamamlanmadı olarak işaretle" : "Görevi tamamlandı olarak işaretle"}
        >
          {goal.done ? (
            <CheckCircle size={18} className="text-[var(--color-success)] shrink-0" />
          ) : (
            <Circle size={18} className="text-[var(--color-text-secondary)] shrink-0 group-hover:text-[var(--color-primary)]" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={goalEditingText}
              onChange={(event) => setGoalEditingText(event.target.value)}
              onBlur={saveEditingGoal}
              onKeyDown={handleGoalEditKeyDown}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              style={{ borderColor: "var(--color-border)" }}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => startEditingGoal(goal)}
              onClick={() => compact && toggleGoal(goal.id)}
              className={`w-full text-left text-sm leading-6 whitespace-normal break-words [overflow-wrap:anywhere] ${goal.done ? "line-through text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}
            >
              {goal.text}
            </button>
          )}
          {!compact && editing && (
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Enter ile kaydet, Esc ile vazgeç.</p>
          )}
        </div>

        {!compact && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                startEditingGoal(goal);
              }}
              className="px-2 py-1 rounded-md text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeGoal(goal.id);
              }}
              className="px-2 py-1 rounded-md text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[color-mix(in_srgb,var(--color-destructive)_10%,transparent)] transition-colors"
            >
              Sil
            </button>
          </div>
        )}
        {!compact && editing && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              saveEditingGoal();
            }}
            className="px-2 py-1 rounded-md text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors shrink-0"
          >
            Kaydet
          </button>
        )}
      </div>
    );
  }

  // ── Hava durumu ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { latitude: lat, longitude: lon } = coords;
        const [meteo, geo] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then(r => r.json()),
        ]);
        const city = geo?.address?.city || geo?.address?.town || geo?.address?.county || "Konum";
        setWeather({
          temp: Math.round(meteo.current_weather.temperature),
          weathercode: meteo.current_weather.weathercode,
          city,
        });
      } catch {}
    }, () => {}, { timeout: 5000 });
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.dailyGoals) {
          setGoals(normalizeDailyGoals(data.dailyGoals).goals);
        }
        // Aktif çalışma oturumu varsa süreyi başlat
        if (data.activeStudySession) {
          const elapsed = Math.floor((Date.now() - new Date(data.activeStudySession.startedAt).getTime()) / 1000);
          setStudySeconds(elapsed);
          setStudyMode(true);
        }
      }
    } catch {}
    setStatsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Çalışma modu zamanlayıcı ─────────────────────────────────────────────
  useEffect(() => {
    if (studyMode) {
      studyInterval.current = setInterval(() => setStudySeconds(s => s + 1), 1000);
    } else {
      if (studyInterval.current) clearInterval(studyInterval.current);
    }
    return () => { if (studyInterval.current) clearInterval(studyInterval.current); };
  }, [studyMode]);

  async function startStudyMode() {
    setStudyLoading(true);
    try {
      await fetch("/api/study-session", { method: "POST" });
      setStudySeconds(0);
      setStudyMode(true);
    } catch { toast.error("Oturum başlatılamadı."); }
    setStudyLoading(false);
  }

  async function endStudyMode() {
    setStudyLoading(true);
    try {
      const res = await fetch("/api/study-session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setStudyMode(false);
      setStudySeconds(0);
      toast.success(`Tebrikler! ${data.durationMin ?? 0} dakika çalıştın. 🎉`);
    } catch { toast.error("Oturum kapatılamadı."); }
    setStudyLoading(false);
  }

  // ── AI Brifing ────────────────────────────────────────────────────────────
  async function fetchBriefing() {
    setBriefingLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Benim günlük brifingimi hazırla. Kısa ve motive edici bir günaydın mesajı, zayıf alanıma göre bugünkü odak konusu ve 1 pratik klinik ipucu ver. 3 paragraftan fazla olmasın.",
          model: "EFFICIENT",
          module: "daily-briefing",
          maxOutputTokens: 700,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBriefing(data?.response?.text ?? data?.text ?? null);
    } catch { toast.error("Brifing alınamadı."); }
    setBriefingLoading(false);
  }

  // Kullanıcı aksiyonu olmadan AI çağrısı yapılmaz.

  // ── Yardımcılar ──────────────────────────────────────────────────────────
  const greeting = greetingByHour(now.getHours());
  const accuracy = stats && stats.totalQuestions > 0
    ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
    : null;
  const maxMinutes = Math.max(...(stats?.weeklyChart.map(d => d.minutes) ?? [1]), 1);

  function fmtSeconds(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}s ` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const doneCount = goals.filter(g => g.done).length;
  const progressPct = goals.length > 0 ? Math.round((doneCount / goals.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── ÇALIŞMA MODU OVERLAY ──────────────────────────────────────── */}
      {studyMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
          >
            {/* Başlık */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center animate-pulse">
                  <Focus size={20} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="font-bold text-[var(--color-text-primary)]">Çalışma Modu Aktif</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Odaklan, sen yapabilirsin!</p>
                </div>
              </div>
              <button
                onClick={() => setStudyMode(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <X size={18} className="text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* Zamanlayıcı */}
            <div className="flex flex-col items-center py-8 gap-2">
              <div
                className="text-6xl font-mono font-bold tabular-nums"
                style={{ color: "var(--color-primary)" }}
              >
                {fmtSeconds(studySeconds)}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">toplam çalışma süresi</p>
            </div>

            {/* Hedefler */}
            <div className="px-6 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">Bugünkü Hedefler</p>
              <div className="flex flex-col gap-2">
                {goals.map((goal, index) => renderGoalRow(goal, index, { compact: true }))}
              </div>
            </div>

            {/* Hızlı Erişim */}
            <div className="px-6 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">Hızlı Erişim</p>
              <div className="grid grid-cols-3 gap-2">
                {STUDY_QUICK_LINKS.map(l => (
                  <Link key={l.href} href={l.href} onClick={() => setStudyMode(false)}>
                    <div
                      className="flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all hover:border-[var(--color-primary)]/50 cursor-pointer group"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                    >
                      <l.icon size={18} style={{ color: l.color }} />
                      <span className="text-xs font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">{l.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bitir butonu */}
            <div className="px-6 pb-6 flex justify-center">
              <Button
                variant="primary"
                onClick={endStudyMode}
                disabled={studyLoading}
                className="w-full max-w-xs"
              >
                {studyLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Square size={16} className="mr-2" />}
                Çalışma Oturumunu Bitir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ANA SAYFA ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">

        {/* ── HERO BAR ─────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-6"
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, #6366f1 50%, #8b5cf6 100%)",
          }}
        >
          {/* Dekoratif daireler */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 bg-[var(--color-text-primary)] -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full opacity-10 bg-[var(--color-text-primary)] translate-y-8" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center backdrop-blur-sm shrink-0">
                {greeting.icon}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">{greeting.text} 👋</h1>
                <p className="text-[var(--color-text-primary)]/70 text-sm mt-0.5">Ana Panelin — tüm sistemin burada</p>
              </div>
            </div>

            {/* Sağ: Saat + Hava + Çalışma Modu */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Saat */}
              <div className="flex flex-col items-end bg-[var(--color-surface-elevated)] backdrop-blur-sm rounded-2xl px-4 py-2">
                <span className="text-xl font-mono font-bold text-[var(--color-text-primary)] tabular-nums">
                  {now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="text-[var(--color-text-primary)]/60 text-xs">
                  {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
              </div>

              {/* Hava */}
              {weather && (
                <div className="flex items-center gap-2 bg-[var(--color-surface-elevated)] backdrop-blur-sm rounded-2xl px-4 py-2">
                  {weatherIcon(weather.weathercode)}
                  <div>
                    <p className="text-[var(--color-text-primary)] font-bold text-sm">{weather.temp}°C</p>
                    <p className="text-[var(--color-text-primary)]/60 text-xs flex items-center gap-1">
                      <MapPin size={10} />{weather.city}
                    </p>
                  </div>
                </div>
              )}

              {/* Çalışma modu butonu */}
              <Button
                onClick={studyMode ? () => setStudyMode(true) : startStudyMode}
                disabled={studyLoading}
                className="bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] border backdrop-blur-sm"
                variant="ghost"
              >
                {studyLoading
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Focus size={14} />}
                <span className="ml-2 font-semibold">{studyMode ? "Odak Modu ●" : "Ders Çalışma Modu"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── STAT KARTLARI ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aktif Hastalar", value: statsLoading ? "…" : stats?.patientCount ?? 0, color: "var(--color-primary)", icon: Users, sub: "kayıtlı hasta" },
            { label: "Notlar", value: statsLoading ? "…" : stats?.noteCount ?? 0, color: "var(--color-success)", icon: FileText, sub: "klinik not" },
            { label: "Çözülen Sorular", value: statsLoading ? "…" : stats?.totalQuestions ?? 0, color: "var(--color-warning)", icon: HelpCircle, sub: "toplam deneme" },
            { label: "Başarı Oranı", value: statsLoading ? "…" : accuracy != null ? `%${accuracy}` : "—", color: "var(--color-primary)", icon: Award, sub: "doğruluk" },
          ].map(s => (
            <Card key={s.label} variant="elevated" className="p-4 group hover:scale-[1.02] transition-transform">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}15` }}
                >
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <TrendingUp size={12} className="text-[var(--color-text-secondary)] opacity-50" />
              </div>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{s.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* ── ORTA BÖLÜM: Brifing + Hedefler + Grafik ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Merkez Beyin Brifing */}
          <div className="lg:col-span-2">
            <Card variant="elevated" className="relative overflow-hidden h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
              <div className="absolute top-4 right-4 opacity-10">
                <Brain size={80} className="text-[var(--color-primary)]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
                      <Sparkles size={15} className="text-[var(--color-primary)]" />
                    </div>
                    <CardTitle className="text-base">Merkez Beyin Raporu</CardTitle>
                  </div>
                  <button
                    onClick={fetchBriefing}
                    disabled={briefingLoading}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <RefreshCw size={13} className={`text-[var(--color-text-secondary)] ${briefingLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {briefingLoading ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse" style={{ width: `${80 - i * 12}%` }} />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-2 text-sm leading-7 text-[var(--color-text-secondary)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {briefing || "Brifingi başlatmak için yenile butonuna basın."}
                  </div>
                )}

                {stats?.motivationScore != null && (
                  <div className="mt-4 flex items-center gap-3">
                    <Flame size={14} className="text-[var(--color-warning)]" />
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000"
                        style={{ width: `${stats.motivationScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">Motivasyon {stats.motivationScore}/100</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Hedefler */}
          <div>
            <Card variant="bordered" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-[var(--color-primary)]" />
                  <CardTitle className="text-base">Bugünkü Hedefler</CardTitle>
                </div>
                <span className="text-xs font-bold text-[var(--color-primary)]">{doneCount}/{goals.length}</span>
              </div>

              {/* İlerleme çubuğu */}
              <div className="w-full h-1.5 rounded-full bg-[var(--color-surface)] mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addGoal();
                    }
                  }}
                  placeholder="Yeni hedef ekle..."
                  className="flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text-primary)] outline-none"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <Button variant="secondary" size="sm" onClick={addGoal} disabled={!goalDraft.trim() || goalsSaving}>
                  Ekle
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {goals.length > 0 ? (
                  goals.map((goal, index) => renderGoalRow(goal, index))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-5 text-sm text-[var(--color-text-secondary)]">
                    Henüz hedef eklenmedi. Yukarıdan yeni bir hedef ekleyebilirsin.
                  </div>
                )}
              </div>

              {goalsSaving && (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Hedefler kaydediliyor...</p>
              )}

              {goals.length > 0 && doneCount === goals.length && (
                <div className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--color-success)]/10">
                  <Star size={14} className="text-[var(--color-success)]" />
                  <span className="text-xs font-bold text-[var(--color-success)]">Tüm hedefleri tamamladın! 🎉</span>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ── HAFTALIK GRAFİK + ZAYIF/GÜÇLÜ ALANLAR ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Grafik */}
          <div className="md:col-span-2">
            <Card variant="bordered">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={15} className="text-[var(--color-primary)]" />
                <CardTitle className="text-base">Haftalık Çalışma Süresi</CardTitle>
              </div>
              <div className="flex items-end gap-2 h-32">
                {(stats?.weeklyChart ?? Array(7).fill({ date: "", minutes: 0 })).map((d, i) => {
                  const pct = maxMinutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
                  const dayName = d.date
                    ? new Date(d.date).toLocaleDateString("tr-TR", { weekday: "short" })
                    : ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][i];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.minutes}dk
                      </span>
                      <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
                        <div
                          className="w-full rounded-t-lg transition-all duration-700"
                          style={{
                            height: `${Math.max(pct, 4)}%`,
                            background: pct > 0
                              ? "linear-gradient(to top, var(--color-primary), #8b5cf6)"
                              : "var(--color-surface)",
                            opacity: statsLoading ? 0.4 : 1,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--color-text-secondary)]">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Zayıf/Güçlü Alanlar */}
          <div className="flex flex-col gap-3">
            {stats?.weakAreas && (stats.weakAreas as string[]).length > 0 && (
              <Card variant="bordered" className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={13} className="text-[var(--color-warning)]" />
                  <span className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-widest">Odak Gereken</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(stats.weakAreas as string[]).slice(0, 5).map(a => (
                    <span key={a} className="text-xs px-2 py-1 rounded-full bg-[var(--color-warning)]/10 text-[var(--color-warning)]">{a}</span>
                  ))}
                </div>
              </Card>
            )}
            {stats?.strongAreas && (stats.strongAreas as string[]).length > 0 && (
              <Card variant="bordered" className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} className="text-[var(--color-success)]" />
                  <span className="text-xs font-bold text-[var(--color-success)] uppercase tracking-widest">Güçlü Alanlar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(stats.strongAreas as string[]).slice(0, 5).map(a => (
                    <span key={a} className="text-xs px-2 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">{a}</span>
                  ))}
                </div>
              </Card>
            )}
            {(!stats || (!(stats.weakAreas as string[]).length && !(stats.strongAreas as string[]).length)) && (
              <Card variant="bordered" className="flex-1 flex items-center justify-center">
                <p className="text-xs text-[var(--color-text-secondary)] text-center py-4">
                  Soru çözdükçe güçlü/zayıf alanların burada görünecek
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* ── MODÜLLER IZGARASI ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <LayoutDashboard size={15} className="text-[var(--color-primary)]" />
            Tüm Modüller
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {MODULES.map(m => (
              <Link key={m.href} href={m.href}>
                <div
                  className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border cursor-pointer group transition-all hover:scale-105 hover:border-[var(--color-primary)]/40"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover:scale-110"
                    style={{ backgroundColor: `${m.color}15` }}
                  >
                    <m.icon size={18} style={{ color: m.color }} />
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] text-center group-hover:text-[var(--color-primary)] transition-colors">{m.title}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] text-center">{m.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
