import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeContextText, sanitizeUserMessage } from "@/lib/ai/limits";

const MAX_MEMORY_TOPICS = 6;
const MAX_MEMORY_MODULES = 5;
const MAX_PROFILE_TOPICS = 6;
const SUMMARY_REFRESH_INTERVAL = 20;

const STOP_WORDS = new Set([
  "acaba", "adım", "ait", "ama", "ancak", "artık", "aslında", "az", "bana", "bazı", "belki",
  "ben", "beni", "benim", "beri", "bile", "bir", "biraz", "birkaç", "birçok", "biri", "biz",
  "bize", "bizi", "bizim", "bu", "buna", "bunda", "bundan", "bunu", "bunun", "burada", "çok",
  "çünkü", "da", "daha", "de", "defa", "değil", "diye", "dolayı", "en", "gibi", "göre", "hala",
  "hangi", "hani", "hatta", "hem", "hep", "hepsi", "her", "hiç", "için", "ile", "ise", "iyi",
  "kadar", "kendi", "kez", "ki", "kim", "kimi", "mı", "mi", "mu", "mü", "nasıl", "neden", "ne",
  "niye", "o", "olan", "olarak", "oldu", "olur", "ona", "onda", "ondan", "onu", "onun", "orada",
  "oysa", "pek", "rağmen", "sanki", "şey", "siz", "size", "sizi", "sizin", "sonra", "şu", "tüm",
  "ve", "veya", "ya", "yani", "yine", "yok", "zaten",
]);

const STRUGGLE_PATTERNS = [
  "anlamad",
  "karist",
  "karışt",
  "zorlan",
  "zor",
  "emin degil",
  "emin değil",
  "yanlis",
  "yanlış",
  "eksik",
  "unut",
  "kafam",
  "takild",
  "takıld",
];

export type SharedAiMemory = {
  recentTopics: string[];
  struggleTopics: string[];
  strengthTopics: string[];
  lastModules: string[];
  keyObservation: string | null;
  interactionCount?: number;
  lastSummaryAt?: string | null;
  updatedAt: string;
};

export type AgentInsight = {
  weakAreas?: string[];
  strongAreas?: string[];
  studyFocus?: string[];
  motivationScore?: number | null;
  keyObservation?: string | null;
  summary?: string | null;
  mentorPayload?: Record<string, unknown> | null;
};

function toJsonValue(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return value as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function uniqLimited(values: string[], max: number): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).slice(0, max);
}

function normalizeTopic(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractTopics(text: string, max = 4): string[] {
  const normalized = sanitizeContextText(text, 1_200).toLocaleLowerCase("tr-TR");
  const tokens = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu) ?? [];
  const scored = new Map<string, number>();

  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    scored.set(token, (scored.get(token) ?? 0) + 1);
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([token]) => normalizeTopic(token));
}

function inferWeakTopics(message: string, derivedTopics: string[]): string[] {
  const normalized = sanitizeUserMessage(message, 800).toLocaleLowerCase("tr-TR");
  const hasStruggleSignal = STRUGGLE_PATTERNS.some((pattern) => normalized.includes(pattern));
  return hasStruggleSignal ? derivedTopics.slice(0, 3) : [];
}

function sanitizeMemory(value: unknown): SharedAiMemory {
  if (!isRecord(value)) {
    return {
      recentTopics: [],
      struggleTopics: [],
      strengthTopics: [],
      lastModules: [],
      keyObservation: null,
      interactionCount: 0,
      lastSummaryAt: null,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return {
    recentTopics: uniqLimited(toStringArray(value.recentTopics), MAX_MEMORY_TOPICS),
    struggleTopics: uniqLimited(toStringArray(value.struggleTopics), MAX_MEMORY_TOPICS),
    strengthTopics: uniqLimited(toStringArray(value.strengthTopics), MAX_MEMORY_TOPICS),
    lastModules: uniqLimited(toStringArray(value.lastModules), MAX_MEMORY_MODULES),
    keyObservation: typeof value.keyObservation === "string" && value.keyObservation.trim()
      ? sanitizeContextText(value.keyObservation, 220)
      : null,
    interactionCount: typeof value.interactionCount === "number" ? Math.max(0, value.interactionCount) : 0,
    lastSummaryAt: typeof value.lastSummaryAt === "string" ? value.lastSummaryAt : null,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt.trim()
      ? value.updatedAt
      : new Date(0).toISOString(),
  };
}

function buildDeterministicSummary(memory: SharedAiMemory) {
  const segments = [
    memory.struggleTopics.length > 0 ? `Zorlandığı alanlar: ${memory.struggleTopics.slice(0, 3).join(", ")}` : null,
    memory.strengthTopics.length > 0 ? `Görece güçlü alanlar: ${memory.strengthTopics.slice(0, 3).join(", ")}` : null,
    memory.recentTopics.length > 0 ? `Son odak konuları: ${memory.recentTopics.slice(0, 3).join(", ")}` : null,
    memory.keyObservation ? `Davranış sinyali: ${memory.keyObservation}` : null,
  ].filter(Boolean);
  return segments.join(". ").trim() || null;
}

export function formatSharedAiMemory(value: unknown): string {
  const memory = sanitizeMemory(value);
  const lines = [
    memory.recentTopics.length > 0 ? `Son Odak Konuları: ${memory.recentTopics.join(", ")}` : null,
    memory.struggleTopics.length > 0 ? `Zorlandığı Başlıklar: ${memory.struggleTopics.join(", ")}` : null,
    memory.strengthTopics.length > 0 ? `Görece Rahat Olduğu Başlıklar: ${memory.strengthTopics.join(", ")}` : null,
    memory.lastModules.length > 0 ? `Son Aktif Modüller: ${memory.lastModules.join(", ")}` : null,
    memory.keyObservation ? `Kısa Davranış Gözlemi: ${memory.keyObservation}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export async function rememberUserSignals(input: {
  userId: string;
  moduleName?: string;
  userMessage?: string;
  assistantText?: string;
  insight?: AgentInsight | null;
}) {
  const normalizedMessage = sanitizeUserMessage(input.userMessage, 1_000);
  const normalizedAssistant = sanitizeContextText(input.assistantText ?? "", 700);
  const combinedTopics = uniqLimited(
    [
      ...extractTopics(normalizedMessage, 4),
      ...extractTopics(normalizedAssistant, 2),
      ...toStringArray(input.insight?.studyFocus).map(normalizeTopic),
      ...toStringArray(input.insight?.weakAreas).map(normalizeTopic),
      ...toStringArray(input.insight?.strongAreas).map(normalizeTopic),
    ],
    MAX_MEMORY_TOPICS,
  );

  const inferredWeakTopics = inferWeakTopics(normalizedMessage, combinedTopics);
  const insightWeakAreas = toStringArray(input.insight?.weakAreas).map(normalizeTopic);
  const insightStrongAreas = toStringArray(input.insight?.strongAreas).map(normalizeTopic);
  const moduleName = input.moduleName?.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { notificationPrefs: true },
  });

  const existingPrefs = isRecord(user?.notificationPrefs) ? user.notificationPrefs : {};
  const currentMemory = sanitizeMemory(existingPrefs.aiMemory);

  const nextMemory: SharedAiMemory = {
    recentTopics: uniqLimited([...combinedTopics, ...currentMemory.recentTopics], MAX_MEMORY_TOPICS),
    struggleTopics: uniqLimited([...insightWeakAreas, ...inferredWeakTopics, ...currentMemory.struggleTopics], MAX_MEMORY_TOPICS),
    strengthTopics: uniqLimited([...insightStrongAreas, ...currentMemory.strengthTopics], MAX_MEMORY_TOPICS),
    lastModules: uniqLimited([...(moduleName ? [moduleName] : []), ...currentMemory.lastModules], MAX_MEMORY_MODULES),
    keyObservation: input.insight?.keyObservation
      ? sanitizeContextText(input.insight.keyObservation, 220)
      : currentMemory.keyObservation,
    interactionCount: (currentMemory.interactionCount ?? 0) + 1,
    lastSummaryAt: currentMemory.lastSummaryAt ?? null,
    updatedAt: new Date().toISOString(),
  };

  const shouldRefreshSummary =
    !!input.insight?.summary ||
    ((nextMemory.interactionCount ?? 0) > 0 && (nextMemory.interactionCount ?? 0) % SUMMARY_REFRESH_INTERVAL === 0);
  const refreshedSummary = input.insight?.summary
    ? sanitizeContextText(input.insight.summary, 240)
    : shouldRefreshSummary
      ? buildDeterministicSummary(nextMemory)
      : null;
  if (shouldRefreshSummary) {
    nextMemory.lastSummaryAt = new Date().toISOString();
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      notificationPrefs: {
        ...existingPrefs,
        aiMemory: nextMemory,
      },
    },
  });

  if (
    insightWeakAreas.length === 0 &&
    insightStrongAreas.length === 0 &&
    !refreshedSummary &&
    input.insight?.motivationScore == null &&
    !input.insight?.mentorPayload
  ) {
    return nextMemory;
  }

  const existingProfile = await prisma.studentLearningProfile.findUnique({
    where: { userId: input.userId },
    select: {
      weakAreas: true,
      strongAreas: true,
      aiSummary: true,
      totalQuestions: true,
      totalCorrect: true,
    },
  });

  await prisma.studentLearningProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      weakAreas: uniqLimited([...insightWeakAreas, ...inferredWeakTopics], MAX_PROFILE_TOPICS),
      strongAreas: uniqLimited(insightStrongAreas, MAX_PROFILE_TOPICS),
      aiSummary: refreshedSummary ?? currentMemory.keyObservation,
      totalQuestions: existingProfile?.totalQuestions ?? 0,
      totalCorrect: existingProfile?.totalCorrect ?? 0,
      motivationScore: input.insight?.motivationScore ?? null,
      mentorInsights: toJsonValue(input.insight?.mentorPayload),
      lastMentorChatAt: input.insight?.mentorPayload ? new Date() : undefined,
    },
    update: {
      weakAreas: uniqLimited([
        ...insightWeakAreas,
        ...inferredWeakTopics,
        ...toStringArray(existingProfile?.weakAreas).map(normalizeTopic),
      ], MAX_PROFILE_TOPICS),
      strongAreas: uniqLimited([
        ...insightStrongAreas,
        ...toStringArray(existingProfile?.strongAreas).map(normalizeTopic),
      ], MAX_PROFILE_TOPICS),
      aiSummary: refreshedSummary ?? existingProfile?.aiSummary ?? currentMemory.keyObservation,
      motivationScore: input.insight?.motivationScore ?? undefined,
      mentorInsights: toJsonValue(input.insight?.mentorPayload),
      lastMentorChatAt: input.insight?.mentorPayload ? new Date() : undefined,
      lastAnalyzedAt: new Date(),
    },
  });

  return nextMemory;
}

export async function rememberQuestionBankResults(input: {
  userId: string;
  results: Array<{
    subject?: string | null;
    difficulty?: string | null;
    isCorrect?: boolean | null;
  }>;
}) {
  const wrongSubjects = input.results
    .filter((item) => item.isCorrect === false && typeof item.subject === "string")
    .map((item) => normalizeTopic(item.subject ?? ""));
  const strongSubjects = input.results
    .filter((item) => item.isCorrect === true && typeof item.subject === "string")
    .map((item) => normalizeTopic(item.subject ?? ""));
  const hardMisses = input.results
    .filter((item) => item.isCorrect === false && (item.difficulty ?? "").toLowerCase() === "zor")
    .map((item) => normalizeTopic(item.subject ?? "Zor Sorular"));

  const summary =
    wrongSubjects.length > 0
      ? `Son soru bankasi oturumunda zorlandigi alanlar: ${uniqLimited([...hardMisses, ...wrongSubjects], 3).join(", ")}`
      : null;

  return rememberUserSignals({
    userId: input.userId,
    moduleName: "questions",
    insight: {
      weakAreas: uniqLimited([...hardMisses, ...wrongSubjects], 4),
      strongAreas: uniqLimited(strongSubjects, 3),
      studyFocus: uniqLimited([...wrongSubjects, ...strongSubjects], 4),
      summary,
      keyObservation: wrongSubjects.length > 0 ? "Son soru bankasi oturumunda ayni konularda tekrar hatalar goruldu." : null,
    },
  });
}
