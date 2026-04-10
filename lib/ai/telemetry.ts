import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { getFallbackModelPricing } from "@/lib/ai/pricing";
import { trackOrgAiUsage } from "@/lib/ai/track-org-usage";

type TelemetrySource = "generateText" | "streamText" | "background";

export type AiUsageEvent = {
  kind: "ai_usage_v1";
  route: string;
  module: string | null;
  model: string;
  keyName: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  source: TelemetrySource;
  orgTracked: boolean;
  orgId: string | null;
  loggedAt: string;
};

type RecordAiUsageTelemetryInput = {
  userId: string;
  route: string;
  model: string;
  keyName?: string | null;
  inputTokens: number;
  outputTokens: number;
  module?: string;
  source?: TelemetrySource;
  trackOrg?: boolean;
};

type SystemLogRecord = {
  createdAt: Date;
  details: string | null;
  userId: string | null;
  message: string;
};

export async function calculateAiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const pricing = await prisma.modelPricing.findUnique({
    where: { model },
    select: {
      inputPricePer1k: true,
      outputPricePer1k: true,
    },
  });
  const fallback = getFallbackModelPricing(model);
  const inputPrice = pricing?.inputPricePer1k ?? fallback?.inputPricePer1k ?? 0;
  const outputPrice = pricing?.outputPricePer1k ?? fallback?.outputPricePer1k ?? 0;
  return (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
}

export async function recordAiUsageTelemetry(
  input: RecordAiUsageTelemetryInput,
): Promise<AiUsageEvent> {
  const source = input.source ?? "generateText";
  const module = input.module?.trim() || null;
  const inputTokens = Math.max(0, input.inputTokens);
  const outputTokens = Math.max(0, input.outputTokens);
  const totalTokens = inputTokens + outputTokens;
  const costUsd = await calculateAiCostUsd(input.model, inputTokens, outputTokens);

  const orgUsage =
    input.trackOrg === false
      ? { tracked: false as const, reason: "not_org_member" as const }
      : await trackOrgAiUsage({
          userId: input.userId,
          model: input.model,
          inputTokens,
          outputTokens,
          module: module ?? undefined,
        });

  const event: AiUsageEvent = {
    kind: "ai_usage_v1",
    route: input.route,
    module,
    model: input.model,
    keyName: input.keyName ?? null,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
    source,
    orgTracked: orgUsage.tracked,
    orgId: orgUsage.tracked ? orgUsage.orgId : null,
    loggedAt: new Date().toISOString(),
  };

  await createSystemLog({
    level: "info",
    category: "ai",
    message: "AI_USAGE_EVENT",
    details: JSON.stringify(event),
    userId: input.userId,
  });

  return event;
}

export function parseAiUsageEventFromLog(log: SystemLogRecord): AiUsageEvent | null {
  if (!log.details) return null;

  if (log.message === "AI_USAGE_EVENT") {
    try {
      const parsed = JSON.parse(log.details) as Partial<AiUsageEvent>;
      if (parsed.kind !== "ai_usage_v1" || typeof parsed.model !== "string") return null;
      return {
        kind: "ai_usage_v1",
        route: typeof parsed.route === "string" ? parsed.route : "unknown",
        module: typeof parsed.module === "string" ? parsed.module : null,
        model: parsed.model,
        keyName: typeof parsed.keyName === "string" ? parsed.keyName : null,
        inputTokens: Number(parsed.inputTokens ?? 0),
        outputTokens: Number(parsed.outputTokens ?? 0),
        totalTokens: Number(parsed.totalTokens ?? 0),
        costUsd: Number(parsed.costUsd ?? 0),
        source:
          parsed.source === "streamText" || parsed.source === "background"
            ? parsed.source
            : "generateText",
        orgTracked: Boolean(parsed.orgTracked),
        orgId: typeof parsed.orgId === "string" ? parsed.orgId : null,
        loggedAt:
          typeof parsed.loggedAt === "string"
            ? parsed.loggedAt
            : log.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  if (log.message.startsWith("AI sorgusu işlendi")) {
    const details = log.details.match(
      /Model:\s*([^|]+)\s*\|\s*Input:\s*(\d+)\s*\|\s*Output:\s*(\d+)/i,
    );
    if (!details) return null;

    const model = details[1].trim();
    const inputTokens = Number(details[2]);
    const outputTokens = Number(details[3]);
    const totalTokens = inputTokens + outputTokens;

    return {
      kind: "ai_usage_v1",
      route: "/api/ai/chat",
      module: extractLegacyModuleName(log.message),
      model,
      keyName: null,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd: 0,
      source: "generateText",
      orgTracked: false,
      orgId: null,
      loggedAt: log.createdAt.toISOString(),
    };
  }

  return null;
}

function extractLegacyModuleName(message: string): string | null {
  const match = message.match(/\(([^)]+)\)/);
  return match?.[1]?.trim() || null;
}
