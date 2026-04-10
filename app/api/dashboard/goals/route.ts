import { NextRequest, NextResponse } from "next/server";
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
    return {
      date: todayKey,
      goals: value
        .map((item, index) => normalizeGoalItem(item, index))
        .filter((item): item is DailyGoal => item !== null),
    };
  }

  if (!isRecord(value)) return null;

  const date = typeof value.date === "string" ? value.date : todayKey;
  const rawGoals = Array.isArray(value.goals) ? value.goals : [];

  return {
    date,
    goals: rawGoals
      .map((item, index) => normalizeGoalItem(item, index))
      .filter((item): item is DailyGoal => item !== null),
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

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true as const, user };
}

async function readDailyGoals(userId: string): Promise<DailyGoalsSnapshot> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!dbUser) {
    return getEffectiveDailyGoals(null);
  }

  const stored = normalizeDailyGoals(
    (dbUser.notificationPrefs as Record<string, unknown> | null)?.dailyGoals,
  );
  const effective = getEffectiveDailyGoals(stored);

  if (!stored || stored.date !== effective.date) {
    const existingPrefs =
      (dbUser.notificationPrefs as Record<string, unknown> | null) ?? {};
    await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPrefs: {
          ...existingPrefs,
          dailyGoals: effective,
        },
      },
    });
  }

  return effective;
}

async function writeDailyGoals(userId: string, nextGoals: DailyGoal[]) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!dbUser) {
    return null;
  }

  const payload: DailyGoalsSnapshot = {
    date: getTodayKey(),
    goals: nextGoals,
  };

  const existingPrefs =
    (dbUser.notificationPrefs as Record<string, unknown> | null) ?? {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPrefs: {
        ...existingPrefs,
        dailyGoals: payload,
      },
    },
  });

  return payload;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const dailyGoals = await readDailyGoals(auth.user.id);
  return NextResponse.json(dailyGoals);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const rawGoals: unknown[] | null = Array.isArray(body?.goals)
    ? (body.goals as unknown[])
    : Array.isArray(body?.items)
      ? (body.items as unknown[])
      : null;

  if (!rawGoals) {
    return NextResponse.json({ error: "goals array gerekli" }, { status: 400 });
  }

  const goals = rawGoals
    .map((item, index) => normalizeGoalItem(item, index))
    .filter((item): item is DailyGoal => item !== null);

  const snapshot = await writeDailyGoals(auth.user.id, goals);
  if (!snapshot) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}

export async function PUT(req: NextRequest) {
  return PATCH(req);
}
