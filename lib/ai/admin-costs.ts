import { prisma } from "@/lib/prisma";
import { calculateAiCostUsd, parseAiUsageEventFromLog, type AiUsageEvent } from "@/lib/ai/telemetry";
import { getFallbackModelPricing } from "@/lib/ai/pricing";

type UserLite = {
  id: string;
  email: string;
  name: string | null;
};

export type AdminAiCostEvent = AiUsageEvent & {
  userId: string | null;
  createdAt: Date;
  user: UserLite | null;
};

export async function getAdminAiCostEvents(): Promise<AdminAiCostEvent[]> {
  const logs = await prisma.systemLog.findMany({
    where: {
      category: "ai",
      OR: [
        { message: "AI_USAGE_EVENT" },
        { message: { startsWith: "AI sorgusu işlendi" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      details: true,
      userId: true,
      message: true,
    },
    take: 5000,
  });

  const parsedBase = logs
    .map((log) => {
      const parsed = parseAiUsageEventFromLog(log);
      if (!parsed) return null;
      return {
        ...parsed,
        userId: log.userId,
        createdAt: log.createdAt,
      };
    })
    .filter((item): item is (AiUsageEvent & { userId: string | null; createdAt: Date }) => item !== null);

  const normalized = await Promise.all(
    parsedBase.map(async (event) => {
      const costUsd =
        event.costUsd > 0
          ? event.costUsd
          : await calculateAiCostUsd(event.model, event.inputTokens, event.outputTokens);
      return {
        ...event,
        costUsd,
      };
    }),
  );

  const userIds = normalized
    .map((event) => event.userId)
    .filter((userId): userId is string => Boolean(userId));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(new Set(userIds)) } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  return normalized.map((event) => ({
    ...event,
    user: event.userId ? userMap.get(event.userId) ?? null : null,
  }));
}

export async function getAdminModelPricingRows() {
  const rows = await prisma.modelPricing.findMany({
    orderBy: { model: "asc" },
  });

  if (rows.length > 0) return rows;

  return Array.from(new Set(["gemini-2.5-flash", "gemini-2.5-pro", "gpt-4o", "gpt-4o-mini"]))
    .map((model) => {
      const fallback = getFallbackModelPricing(model);
      return fallback
        ? {
            id: model,
            model,
            displayName: fallback.displayName,
            inputPricePer1k: fallback.inputPricePer1k,
            outputPricePer1k: fallback.outputPricePer1k,
            updatedAt: new Date(0),
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
