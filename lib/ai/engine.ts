import { prisma } from '@/lib/prisma';

type LearningProfileSnapshot = {
  weakAreas?: unknown;
  strongAreas?: unknown;
  aiSummary?: string | null;
  totalQuestions?: number | null;
  totalCorrect?: number | null;
} | null;

export type EnhancedContextOptions = {
  profile?: LearningProfileSnapshot;
  activePlanContent?: string | null;
};

const ACTIVE_PLAN_CACHE_TTL_MS = 15_000;

let activePlanCache: { content: string | null; expiresAt: number } | null = null;
let activePlanInFlight: Promise<string | null> | null = null;

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function loadActivePlanContent(): Promise<string | null> {
  const now = Date.now();
  if (activePlanCache && activePlanCache.expiresAt > now) {
    return activePlanCache.content;
  }

  if (!activePlanInFlight) {
    activePlanInFlight = prisma.activePlan
      .findUnique({
        where: { id: "user_active_plan" },
        select: { content: true },
      })
      .then((row) => {
        const content = row?.content ?? null;
        activePlanCache = {
          content,
          expiresAt: Date.now() + ACTIVE_PLAN_CACHE_TTL_MS,
        };
        return content;
      })
      .catch((error) => {
        activePlanCache = {
          content: null,
          expiresAt: Date.now() + 5_000,
        };
        throw error;
      })
      .finally(() => {
        activePlanInFlight = null;
      });
  }

  return activePlanInFlight;
}

export async function getEnhancedContext(
  _message: string,
  userId?: string,
  options: EnhancedContextOptions = {},
) {
  try {
    const profile: LearningProfileSnapshot =
      options.profile ??
      (userId
        ? await prisma.studentLearningProfile.findUnique({
            where: { userId },
            select: {
              weakAreas: true,
              strongAreas: true,
              aiSummary: true,
              totalQuestions: true,
              totalCorrect: true,
            },
          })
        : null);

    const activePlanContent =
      options.activePlanContent ?? (await loadActivePlanContent().catch(() => null));

    const weakAreas = toStringArray(profile?.weakAreas);
    const strongAreas = toStringArray(profile?.strongAreas);
    const totalQ = typeof profile?.totalQuestions === "number" ? profile.totalQuestions : 0;
    const totalC = typeof profile?.totalCorrect === "number" ? profile.totalCorrect : 0;
    const successRate = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : null;

    const userState = [
      weakAreas.length > 0 ? `Zayıf Alanlar: ${weakAreas.join(", ")}` : null,
      strongAreas.length > 0 ? `Güçlü Alanlar: ${strongAreas.join(", ")}` : null,
      successRate !== null ? `Genel Başarı: %${successRate} (${totalC}/${totalQ} soru)` : null,
      profile?.aiSummary ? `AI Özeti: ${profile.aiSummary}` : null,
      activePlanContent ? `Aktif Çalışma Planı: ${activePlanContent}` : null,
    ]
      .filter(Boolean)
      .join("\n") || "Henüz öğrenme verisi yok.";

    return { userState };
  } catch {
    return { userState: "Henüz öğrenme verisi yok." };
  }
}
