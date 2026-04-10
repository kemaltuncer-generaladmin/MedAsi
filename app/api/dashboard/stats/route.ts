import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type DailyGoal = {
  id: string;
  text: string;
  done: boolean;
};

type DailyGoalsSnapshot = {
  date: string;
  goals: DailyGoal[];
};

const DEFAULT_DAILY_GOALS: DailyGoal[] = [
  { id: "goal-1", text: "Bugün 25 dk odaklanmış çalış (Pomodoro)", done: false },
  { id: "goal-2", text: "AI ile en az 1 konu pekiştir", done: false },
  { id: "goal-3", text: "Zayıf alanında 5 soru çöz", done: false },
];

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultGoals(): DailyGoal[] {
  return DEFAULT_DAILY_GOALS.map((goal) => ({ ...goal }));
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

  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : `goal-${index + 1}`;
  return {
    id,
    text,
    done: Boolean(value.done),
  };
}

function normalizeDailyGoals(value: unknown): DailyGoalsSnapshot | null {
  const todayKey = getTodayKey();

  if (Array.isArray(value)) {
    const goals = value
      .map((item, index) => normalizeGoalItem(item, index))
      .filter((item): item is DailyGoal => item !== null);
    return {
      date: todayKey,
      goals,
    };
  }

  if (!isRecord(value)) return null;

  const date = typeof value.date === "string" ? value.date : todayKey;
  const rawGoals = Array.isArray(value.goals) ? value.goals : [];
  const goals = rawGoals
    .map((item, index) => normalizeGoalItem(item, index))
    .filter((item): item is DailyGoal => item !== null);

  return {
    date,
    goals,
  };
}

function getEffectiveDailyGoals(snapshot: DailyGoalsSnapshot | null): DailyGoalsSnapshot {
  const todayKey = getTodayKey();
  if (!snapshot || snapshot.date !== todayKey) {
    return {
      date: todayKey,
      goals: cloneDefaultGoals(),
    };
  }

  return {
    date: snapshot.date,
    goals: snapshot.goals,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [
    patientCount,
    noteCount,
    learningProfile,
    pomodoroLogs,
    weeklyStudySessions,
    todayStudySession,
    dailyPrefs,
  ] = await Promise.all([
    prisma.patient.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
    prisma.studentLearningProfile.findUnique({
      where: { userId },
      select: {
        totalQuestions: true,
        totalCorrect: true,
        weakAreas: true,
        strongAreas: true,
        aiSummary: true,
        motivationScore: true,
        mentorInsights: true,
      },
    }),
    // Son 7 günün pomodoro dakikaları (gün bazlı)
    prisma.pomodoroLog.findMany({
      where: { userId, completedAt: { gte: weekStart } },
      select: { duration: true, completedAt: true },
    }),
    // Son 7 günün çalışma oturumları
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: weekStart }, endedAt: { not: null } },
      select: { durationMin: true, startedAt: true },
    }),
    // Bugün aktif oturum var mı?
    prisma.studySession.findFirst({
      where: { userId, endedAt: null },
      select: { id: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    }),
  ]);

  // Son 7 gün için günlük çalışma süresi (dk)
  const dailyMinutes: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dailyMinutes[d.toISOString().split("T")[0]] = 0;
  }

  for (const log of pomodoroLogs) {
    const key = log.completedAt.toISOString().split("T")[0];
    if (key in dailyMinutes) dailyMinutes[key] += log.duration;
  }
  for (const s of weeklyStudySessions) {
    const key = s.startedAt.toISOString().split("T")[0];
    if (key in dailyMinutes) dailyMinutes[key] += s.durationMin ?? 0;
  }

  const storedDailyGoals = normalizeDailyGoals(
    (dailyPrefs?.notificationPrefs as Record<string, unknown> | null)?.dailyGoals,
  );
  const dailyGoals = getEffectiveDailyGoals(storedDailyGoals);

  if (dailyPrefs && (!storedDailyGoals || storedDailyGoals.date !== dailyGoals.date)) {
    const existingPrefs =
      (dailyPrefs?.notificationPrefs as Record<string, unknown> | null) ?? {};
    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPrefs: {
          ...existingPrefs,
          dailyGoals,
        },
      },
    });
  }

  const weeklyChart = Object.entries(dailyMinutes).map(([date, minutes]) => ({
    date,
    minutes,
  }));

  return NextResponse.json({
    patientCount,
    noteCount,
    totalQuestions: learningProfile?.totalQuestions ?? 0,
    totalCorrect: learningProfile?.totalCorrect ?? 0,
    weakAreas: learningProfile?.weakAreas ?? [],
    strongAreas: learningProfile?.strongAreas ?? [],
    aiSummary: learningProfile?.aiSummary ?? null,
    motivationScore: learningProfile?.motivationScore ?? null,
    mentorInsights: learningProfile?.mentorInsights ?? null,
    weeklyChart,
    activeStudySession: todayStudySession ?? null,
    dailyGoals,
  });
}
