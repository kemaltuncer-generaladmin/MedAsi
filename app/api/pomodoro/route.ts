import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { creditTokens, getOrCreateWallet } from "@/lib/ai/token-wallet";

export const dynamic = "force-dynamic";

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;
const CYCLE_LENGTH = 4;

const POMODORO_CONFIG = {
  workMinutes: WORK_MINUTES,
  shortBreakMinutes: SHORT_BREAK_MINUTES,
  longBreakMinutes: LONG_BREAK_MINUTES,
  cycleLength: CYCLE_LENGTH,
} as const;

type PomodoroMode = "work" | "short" | "long";

type PomodoroLogItem = {
  id: string;
  durationMinutes: number;
  completedAt: string;
  mode: PomodoroMode;
};

type PomodoroSummary = {
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
    nextBreakMode: Exclude<PomodoroMode, "work">;
    completedCyclesToday: number;
    totalRecentWorkSessions: number;
  };
  todaySessions: PomodoroLogItem[];
  recentSessions: PomodoroLogItem[];
  timerConfig: typeof POMODORO_CONFIG;
};

type AuthenticatedUser = {
  id: string;
  packageId: string;
  package: {
    id: string;
    name: string;
    tokenGrant: bigint;
  };
};

type WalletSnapshot = {
  balance: bigint;
  totalEarned: bigint;
  totalSpent: bigint;
  updatedAt: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getTimeZoneFromRequest(req: NextRequest) {
  return req.headers.get("x-timezone") || "Europe/Istanbul";
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    },
    {},
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function getDayStartInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    },
    {},
  );

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - offset);
}

function inferModeFromDuration(durationMinutes: number): PomodoroMode {
  if (durationMinutes >= 20) return "work";
  if (durationMinutes >= 10) return "long";
  return "short";
}

function serializeWallet(wallet: WalletSnapshot | null) {
  if (!wallet) return null;
  return {
    balance: wallet.balance.toString(),
    totalEarned: wallet.totalEarned.toString(),
    totalSpent: wallet.totalSpent.toString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function serializeLogs(rows: { id: string; duration: number; completedAt: Date }[]) {
  return rows.map<PomodoroLogItem>((row) => ({
    id: row.id,
    durationMinutes: row.duration,
    completedAt: row.completedAt.toISOString(),
    mode: inferModeFromDuration(row.duration),
  }));
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      packageId: true,
      package: {
        select: {
          id: true,
          name: true,
          tokenGrant: true,
        },
      },
    },
  });

  if (!dbUser) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user: dbUser as AuthenticatedUser };
}

async function ensurePackageTokenGrant(user: AuthenticatedUser) {
  try {
    const walletRows = await prisma.$queryRaw<{ balance: bigint; totalEarned: bigint }[]>`
      SELECT balance, total_earned AS "totalEarned"
      FROM token_wallets
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    const wallet = walletRows[0];
    if (wallet) {
      if (wallet.totalEarned === 0n && user.package.tokenGrant > 0n) {
        await creditTokens(
          user.id,
          user.package.tokenGrant,
          "grant",
          `${user.package.name} paketi için başlangıç tokenı`,
          `pomodoro-package-${user.packageId}`,
        );
      }
      return;
    }

    if (user.package.tokenGrant > 0n) {
      await creditTokens(
        user.id,
        user.package.tokenGrant,
        "grant",
        `${user.package.name} paketi için başlangıç tokenı`,
        `pomodoro-package-${user.packageId}`,
      );
      return;
    }

    await getOrCreateWallet(user.id);
  } catch (error) {
    console.error("Pomodoro package token bootstrap failed:", error);
  }
}

async function buildSummary(user: AuthenticatedUser, dayStart: Date): Promise<PomodoroSummary> {
  const [walletRows, todayLogs, recentLogs] = await Promise.all([
    prisma.$queryRaw<WalletSnapshot[]>`
      SELECT balance, total_earned AS "totalEarned", total_spent AS "totalSpent", updated_at AS "updatedAt"
      FROM token_wallets
      WHERE user_id = ${user.id}
      LIMIT 1
    `,
    prisma.pomodoroLog.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: dayStart },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.pomodoroLog.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
      take: 12,
    }),
  ]);

  const todayFocusMinutes = todayLogs.reduce((sum, row) => sum + row.duration, 0);
  const todayWorkSessions = todayLogs.length;
  const currentCycleWorkSessions = todayWorkSessions % CYCLE_LENGTH;
  const nextBreakMode = currentCycleWorkSessions === CYCLE_LENGTH - 1 ? "long" : "short";

  return {
    package: {
      id: user.package.id,
      name: user.package.name,
      tokenGrant: user.package.tokenGrant.toString(),
    },
    wallet: serializeWallet(walletRows[0] ?? null),
    stats: {
      todayWorkSessions,
      todayFocusMinutes,
      currentCycleWorkSessions,
      nextBreakMode,
      completedCyclesToday: Math.floor(todayWorkSessions / CYCLE_LENGTH),
      totalRecentWorkSessions: recentLogs.length,
    },
    todaySessions: serializeLogs(todayLogs),
    recentSessions: serializeLogs(recentLogs),
    timerConfig: POMODORO_CONFIG,
  };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const user = auth.user;
  await ensurePackageTokenGrant(user);

  const dayStart = getDayStartInTimeZone(new Date(), getTimeZoneFromRequest(req));
  const summary = await buildSummary(user, dayStart);

  return NextResponse.json({ summary });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const user = auth.user;
  await ensurePackageTokenGrant(user);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const mode = body.mode;
  const durationMinutes = Number(body.durationMinutes);
  const clientId = toStringOrNull(body.clientId);
  const completedAtRaw = toStringOrNull(body.completedAt);

  if (mode !== "work") {
    return NextResponse.json({ ok: true, recorded: false, summary: null });
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const completedAt = completedAtRaw ? new Date(completedAtRaw) : new Date();
  if (Number.isNaN(completedAt.getTime())) {
    return NextResponse.json({ error: "Invalid completedAt" }, { status: 400 });
  }

  const roundedDuration = Math.max(1, Math.round(durationMinutes));
  const duplicateWindowStart = new Date(completedAt.getTime() - 60_000);
  const duplicateWindowEnd = new Date(completedAt.getTime() + 60_000);

  const existing = await prisma.pomodoroLog.findFirst({
    where: {
      userId: user.id,
      duration: roundedDuration,
      completedAt: {
        gte: duplicateWindowStart,
        lte: duplicateWindowEnd,
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const dayStart = getDayStartInTimeZone(completedAt, getTimeZoneFromRequest(req));

  if (existing) {
    const summary = await buildSummary(user, dayStart);
    return NextResponse.json({
      ok: true,
      recorded: false,
      clientId,
      summary,
    });
  }

  await prisma.pomodoroLog.create({
    data: {
      userId: user.id,
      duration: roundedDuration,
      completedAt,
    },
  });

  const summary = await buildSummary(user, dayStart);

  return NextResponse.json({
    ok: true,
    recorded: true,
    clientId,
    summary,
  });
}
