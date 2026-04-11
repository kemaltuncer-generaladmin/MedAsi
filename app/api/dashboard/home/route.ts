import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getStudyWorkspace } from "@/lib/study/core";

export const dynamic = "force-dynamic";

type DailyGoal = {
  id: string;
  text: string;
  done: boolean;
};

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

function coerceGoals(value: unknown): DailyGoal[] {
  if (!value || typeof value !== "object" || !("goals" in value) || !Array.isArray(value.goals)) {
    return [];
  }

  return value.goals
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { id?: unknown; text?: unknown; done?: unknown };
      if (typeof row.text !== "string" || !row.text.trim()) return null;
      return {
        id: typeof row.id === "string" ? row.id : `goal-${index + 1}`,
        text: row.text.trim(),
        done: Boolean(row.done),
      };
    })
    .filter((item): item is DailyGoal => item !== null);
}

function safeJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [dbUser, learningProfile, studySession, recentStudySessions, recentHistory, todayPomodoros, studyWorkspace] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            name: true,
            package: { select: { name: true } },
            notificationPrefs: true,
          },
        }),
        prisma.studentLearningProfile.findUnique({
          where: { userId: user.id },
          select: {
            weakAreas: true,
            strongAreas: true,
            totalQuestions: true,
            totalCorrect: true,
            aiSummary: true,
            motivationScore: true,
          },
        }),
        prisma.studySession.findFirst({
          where: { userId: user.id, endedAt: null },
          select: { id: true, startedAt: true, notes: true },
          orderBy: { startedAt: "desc" },
        }),
        prisma.studySession.findMany({
          where: { userId: user.id },
          select: { id: true, startedAt: true, endedAt: true, durationMin: true, notes: true },
          orderBy: { startedAt: "desc" },
          take: 4,
        }),
        prisma.session.findMany({
          where: { userId: user.id },
          select: { id: true, model: true, createdAt: true, tokensUsed: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.pomodoroLog.findMany({
          where: { userId: user.id, completedAt: { gte: weekStart } },
          select: { duration: true, completedAt: true },
          orderBy: { completedAt: "desc" },
        }),
        getStudyWorkspace(user.id),
      ]);

    const notificationPrefs = (dbUser?.notificationPrefs as Record<string, unknown> | null) ?? {};
    const dailyGoalsSnapshot = notificationPrefs.dailyGoals;
    const dailyGoals = coerceGoals(dailyGoalsSnapshot).length
      ? coerceGoals(dailyGoalsSnapshot)
      : [
          { id: "goal-1", text: "Bir kritik zayıf alanı 25 dakikada kapat", done: false },
          { id: "goal-2", text: "AI ile bir not veya plan üret", done: false },
          { id: "goal-3", text: "Hatalı sorulardan 5 tanesini tekrar çöz", done: false },
        ];

    const weakAreas = safeJsonArray(learningProfile?.weakAreas);
    const strongAreas = safeJsonArray(learningProfile?.strongAreas);
    const totalQuestions = learningProfile?.totalQuestions ?? 0;
    const totalCorrect = learningProfile?.totalCorrect ?? 0;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const focusMinutes = todayPomodoros.reduce((sum, item) => sum + item.duration, 0);
    const topWeakArea = weakAreas[0] ?? "Klinik muhakeme";
    const topStrongArea = strongAreas[0] ?? "Temel tekrar";
    const todayKey = getTodayKey();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      user: {
        name: dbUser?.name ?? "Medasi kullanıcısı",
        packageName: dbUser?.package?.name ?? "ucretsiz",
      },
      hero: {
        title: `${topWeakArea} üzerine odaklanıp günü temiz kapat.`,
        summary:
          learningProfile?.aiSummary ??
          "Bugün önce tek bir zayıf alanı sabitle, sonra kısa tekrar ve vaka akışıyla güçlendir.",
        primaryAction: {
          label: "Günlük brifingi aç",
          href: "/daily-briefing",
        },
        secondaryAction: {
          label: "Odak bloğu başlat",
          href: "/pomodoro",
        },
      },
      focus: {
        todayKey,
        focusMinutes,
        openSession: studySession
          ? {
              id: studySession.id,
              startedAt: studySession.startedAt.toISOString(),
              note: studySession.notes ?? null,
            }
          : null,
        goals: dailyGoals,
      },
      signals: {
        weakAreas: weakAreas.slice(0, 3),
        strongAreas: strongAreas.slice(0, 3),
        accuracy,
        totalQuestions,
        motivationScore: learningProfile?.motivationScore ?? null,
      },
      recommendations: [
        {
          label: "Brifing ile hizalan",
          detail: `${topWeakArea} bugün en büyük gelişim alanın.`,
          href: "/daily-briefing",
          tone: "primary",
        },
        {
          label: "Mini vaka ile aktar",
          detail: `${topStrongArea} gücünü klinik karara taşı.`,
          href: "/cases",
          tone: "success",
        },
        {
          label: "Odak seansı aç",
          detail: `${focusMinutes} dk tamamlandı. Bir blok daha derin çalışma öneriliyor.`,
          href: "/pomodoro",
          tone: "warning",
        },
      ],
      quickActions: [
        { label: "Çalışma Merkezi", href: "/questions", icon: "brain" },
        { label: "Soru Bankası", href: "/questions/bank", icon: "help-circle" },
        { label: "Mentor AI", href: "/ai-assistant/mentor", icon: "brain" },
        { label: "Materyaller", href: "/materials", icon: "file-text" },
      ],
      continueItems: [
        ...studyWorkspace.materials.map((item) => ({
          id: item.id,
          label: item.name,
          meta: `Kalite ${item.qualityScore ?? "-"} · ${item.slideCount ?? 0} slayt`,
          href: `/materials?material=${item.id}`,
        })),
        ...recentStudySessions.map((item) => ({
          id: item.id,
          label: item.notes?.trim() || "Çalışma oturumu",
          meta: item.endedAt
            ? `${item.durationMin ?? 0} dk tamamlandı`
            : "Açık çalışma oturumu",
          href: "/pomodoro",
        })),
      ].slice(0, 6),
      aiRail: {
        headline: "Proaktif Copilot",
        risk: topWeakArea,
        nextBestAction:
          studyWorkspace.recommendations[0]?.body ??
          "25 dakikalık odak bloğundan sonra aynı konudan 5 soru çöz.",
        note:
          recentHistory[0]
            ? `Son AI kullanımın ${new Intl.DateTimeFormat("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(recentHistory[0].createdAt)} civarında yapıldı.`
            : "Henüz AI geçmişin oluşmamış. Brifing ile ilk yönlendirmeyi oluştur.",
      },
    });
  } catch (error) {
    console.error("Dashboard home error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
