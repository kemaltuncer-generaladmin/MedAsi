import { NextRequest, NextResponse } from "next/server";
import { generateText, streamText } from "ai";
import { getResourceReport } from "@/lib/ai/resource-agent";
import { getModulePrompt } from "@/lib/ai/router";
import { buildBasePromptFromSnapshot } from "@/lib/ai/prompts/base";
import { getEnhancedContext } from "@/lib/ai/engine";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsFromDb } from "@/lib/system-settings";
import { createSystemLog } from "@/lib/system-log";
import { checkAndLogAiUsage, logAIUsage } from "@/lib/ai/check-limit";
import { getAiRefusalMessage } from "@/lib/ai/access";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";
import { canAccessModule } from "@/lib/access/entitlements";
import {
  AI_LIMITS,
  sanitizeContextText,
  sanitizeUserMessage,
} from "@/lib/ai/limits";
import {
  appendCentralSystemPrompt,
  createCentralAiRuntime,
  type AiModelType,
} from "@/lib/ai/orchestrator";
import { resolveAiModule } from "@/lib/ai/module-registry";
import { withCentralAiRuntimeFailover } from "@/lib/ai/failover";
import { rememberUserSignals } from "@/lib/ai/personalization";
import {
  geminiErrorToResponsePayload,
  isGeminiErrorLike,
} from "@/lib/ai/google-errors";
import { maskGeminiEnvName } from "@/lib/ai/env";

const AI_STREAM_TIMEOUT_MS = 60_000;
const AI_STREAM_CHUNK_TIMEOUT_MS = 15_000;
const AI_TEXT_TIMEOUT_MS = 45_000;

type UserLearningProfileSnapshot = {
  weakAreas?: unknown;
  strongAreas?: unknown;
  aiSummary?: string | null;
  totalQuestions?: number | null;
  totalCorrect?: number | null;
} | null;

type UserSnapshot = {
  name: string | null;
  role: string | null;
  goals: unknown;
  notificationPrefs: unknown;
  learningProfile: UserLearningProfileSnapshot;
} | null;

type LimitResult = Awaited<ReturnType<typeof checkAndLogAiUsage>>;

function isErrorLike(error: unknown): error is Error | DOMException {
  return error instanceof Error || error instanceof DOMException;
}

function getErrorName(error: unknown): string | undefined {
  return isErrorLike(error) ? error.name : undefined;
}

function getErrorCause(error: unknown): unknown {
  return isErrorLike(error) && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
}

function isAbortLikeError(error: unknown): boolean {
  const errorName = getErrorName(error);
  const cause = getErrorCause(error);
  return (
    (errorName === "AbortError" || errorName === "ResponseAborted") ||
    (error instanceof Error && /aborted|abort|cancel/i.test(error.message)) ||
    (cause !== undefined && isAbortLikeError(cause))
  );
}

function isTimeoutLikeError(error: unknown): boolean {
  const errorName = getErrorName(error);
  const cause = getErrorCause(error);
  return (
    (errorName === "TimeoutError") ||
    (error instanceof Error && /timeout|timed out/i.test(error.message)) ||
    (cause !== undefined && isTimeoutLikeError(cause))
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error || error instanceof DOMException) return error.message;
  return "Unknown error";
}

function normalizeRequestedModel(model: unknown): AiModelType {
  const value = typeof model === "string" ? model.trim().toUpperCase() : "";
  return value === "FAST" ? "FAST" : "EFFICIENT";
}

function normalizeRequestedMaxOutputTokens(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

async function persistAiTelemetry(params: {
  userId: string;
  modelId: string;
  keyName?: string | null;
  moduleName?: string;
  limitResult: LimitResult;
  source?: "generateText" | "streamText";
  usage: Promise<{ inputTokens?: number; outputTokens?: number }> | { inputTokens?: number; outputTokens?: number };
}) {
  const usage = await Promise.resolve(params.usage).catch(() => null);
  if (!usage) return;

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const tokenTotal = inputTokens + outputTokens;
  const hasOrgTelemetry =
    "isOrgMember" in params.limitResult &&
    params.limitResult.isOrgMember &&
    typeof params.limitResult.orgId === "string";

  await Promise.allSettled([
    logAIUsage(params.userId, params.modelId, tokenTotal, params.moduleName),
    recordAiUsageTelemetry({
      userId: params.userId,
      route: "/api/ai/chat",
      model: params.modelId,
      keyName: params.keyName,
      inputTokens,
      outputTokens,
      module: params.moduleName,
      source: params.source ?? "generateText",
      trackOrg: hasOrgTelemetry,
    }),
    createSystemLog({
      level: "info",
      category: "ai",
      message: `AI sorgusu işlendi (${params.moduleName ?? "genel"})`,
      details: `Model: ${params.modelId} | Input: ${inputTokens} | Output: ${outputTokens}`,
      userId: params.userId,
    }),
  ]);
}

function buildSystemPrompt(params: {
  basePrompt: string;
  modulePrompt: string;
  context: { userState: string };
  libraryData: string;
}): string {
  const sections = [
    sanitizeContextText(params.basePrompt),
    sanitizeContextText(params.modulePrompt),
    `[KULLANICI DURUMU]:\n${sanitizeContextText(params.context.userState, 1_600)}`,
    params.libraryData
      ? `[KÜTÜPHANE KAYNAKLARI]:\n${sanitizeContextText(
          params.libraryData,
          AI_LIMITS.MAX_RAG_CONTEXT_CHARS,
        )}`
      : null,
    `EK KURALLAR:
1. Kullanıcının zayıf alanlarını ve aktif planını bilerek yanıt ver.
2. Modül talimatlarına kesinlikle uy.
3. Kütüphane verisi varsa mutlaka referans ver.`,
  ].filter(Boolean);

  return sanitizeContextText(sections.join("\n\n"));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSnapshotPromise = prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        role: true,
        goals: true,
        notificationPrefs: true,
        learningProfile: {
          select: {
            weakAreas: true,
            strongAreas: true,
            aiSummary: true,
            totalQuestions: true,
            totalCorrect: true,
          },
        },
      },
    });

    // Sistem ayarları + limit kontrolü paralel
    const [settings, limitResult] = await Promise.all([
      getSystemSettingsFromDb(),
      checkAndLogAiUsage(),
    ]);

    if (!settings.aiEnabled) {
      return NextResponse.json(
        { error: "Yapay zeka özellikleri geçici olarak devre dışı." },
        { status: 403 },
      );
    }

    if (!limitResult.canProceed) {
      const refusalMessage = getAiRefusalMessage(limitResult.reason);
      await createSystemLog({
        level: "warn",
        category: "ai",
        message: `AI isteği reddedildi (${limitResult.reason})`,
        userId: user.id,
      });
      return NextResponse.json(
        { error: refusalMessage, reason: limitResult.reason },
        { status: 403 },
      );
    }

    const body = await req.json();
    const message = sanitizeUserMessage(body.message);
    const requestedModuleName =
      typeof body.module === "string" && body.module.trim() ? body.module.trim() : undefined;
    const moduleResolution = resolveAiModule(requestedModuleName);
    const moduleName = moduleResolution.canonicalModuleId;
    const requiredModule = moduleResolution.config.accessModule;
    if (moduleResolution.usedFallback && moduleResolution.requestedModuleId) {
      await createSystemLog({
        level: "warn",
        category: "ai",
        message: "Bilinmeyen AI modülü fallback ile çözüldü",
        details: `requested=${moduleResolution.requestedModuleId} | canonical=${moduleName}`,
        userId: user.id,
      }).catch(() => {});
    }
    if (requiredModule && !(await canAccessModule(user.id, requiredModule))) {
      return NextResponse.json(
        { error: getAiRefusalMessage("package_blocked"), reason: "package_blocked" },
        { status: 403 },
      );
    }
    const modelTypeFromReq = normalizeRequestedModel(body.model);
    const requestedMaxOutputTokens = normalizeRequestedMaxOutputTokens(body.maxOutputTokens);
    const shouldStream = body.stream === true || body.stream === "true";

    if (!message) {
      return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    }

    // Kullanıcı bağlamı + RAG paralel
    const libraryDataPromise = getResourceReport(message, user.id).catch(() => "");
    const [context, basePrompt, libraryData, userSnapshot] = await Promise.all([
      userSnapshotPromise.then(async (snapshot) =>
        getEnhancedContext(message, user.id, {
          profile: snapshot?.learningProfile ?? null,
          notificationPrefs: (snapshot?.notificationPrefs as Record<string, unknown> | null) ?? null,
        }),
      ),
      userSnapshotPromise.then((snapshot) => buildBasePromptFromSnapshot(snapshot)),
      libraryDataPromise,
      userSnapshotPromise,
    ]);

    const userAiPrefs = (
      userSnapshot?.notificationPrefs as Record<string, unknown> | null
    )?.aiPrefs as { model?: "FAST" | "EFFICIENT"; responseLength?: "short" | "medium" | "long" } | null;

    const aiRuntime = await createCentralAiRuntime({
      moduleName,
      requestedModel: modelTypeFromReq,
      requestedMaxOutputTokens,
      userPrefs: userAiPrefs ?? undefined,
      keyPreference: "server-first",
    });
    if (!aiRuntime.settings.globalEnabled) {
      return NextResponse.json(
        { error: "Merkezi AI şu anda devre dışı." },
        { status: 403 },
      );
    }

    const modulePrompt = getModulePrompt(moduleName);
    const systemPrompt = appendCentralSystemPrompt(
      buildSystemPrompt({
        basePrompt,
        modulePrompt,
        context,
        libraryData,
      }),
      aiRuntime.settings,
    );

    const generationOptions = {
      model: aiRuntime.model,
      system: systemPrompt,
      prompt: message,
      temperature: aiRuntime.temperature,
      maxOutputTokens: aiRuntime.maxOutputTokens,
      maxRetries: 0,
      abortSignal: req.signal,
    } as const;

    if (shouldStream && !aiRuntime.settings.streamingEnabled) {
      const result = await generateText({
        ...generationOptions,
        timeout: AI_TEXT_TIMEOUT_MS,
      });

      await persistAiTelemetry({
        userId: user.id,
        modelId: aiRuntime.modelId,
        keyName: aiRuntime.keyName,
        moduleName: aiRuntime.moduleId,
        limitResult,
        source: "generateText",
        usage: Promise.resolve(result.usage),
      });
      void rememberUserSignals({
        userId: user.id,
        moduleName: aiRuntime.moduleId,
        userMessage: message,
        assistantText: result.text,
      }).catch(() => {});

      return NextResponse.json({
        response: { text: result.text },
        model: aiRuntime.modelId,
      });
    }

    if (shouldStream) {
      void rememberUserSignals({
        userId: user.id,
        moduleName: aiRuntime.moduleId,
        userMessage: message,
      }).catch(() => {});

      const result = streamText({
        ...generationOptions,
        timeout: {
          totalMs: AI_STREAM_TIMEOUT_MS,
          chunkMs: AI_STREAM_CHUNK_TIMEOUT_MS,
        },
        onError: (error) => {
          if (isAbortLikeError(error) || isTimeoutLikeError(error)) return;
          const geminiReason = isGeminiErrorLike(error)
            ? geminiErrorToResponsePayload(error).reason
            : "upstream_error";
          void createSystemLog({
            level: "error",
            category: "ai",
            message: "AI stream hatası",
            details:
              `module=${aiRuntime.moduleId} | model=${aiRuntime.modelId} | ` +
              `key=${maskGeminiEnvName(aiRuntime.keyName)} (${aiRuntime.keySource ?? "unknown"}) | ` +
              `reason=${geminiReason} | error=${getErrorMessage(error)}`,
            userId: user.id,
          }).catch(() => {});
        },
        onAbort: ({ steps }) => {
          void createSystemLog({
            level: "warn",
            category: "ai",
            message: "AI akışı abort edildi",
            details: `Adım sayısı: ${steps.length}`,
            userId: user.id,
          }).catch(() => {});
        },
        onFinish: ({ usage }) => {
          void persistAiTelemetry({
            userId: user.id,
            modelId: aiRuntime.modelId,
            keyName: aiRuntime.keyName,
            moduleName: aiRuntime.moduleId,
            limitResult,
            source: "streamText",
            usage: Promise.resolve(usage),
          }).catch(() => {});
        },
      });

      return result.toTextStreamResponse({
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    // Non-streaming
    const runtimeResult = await withCentralAiRuntimeFailover(
      {
        moduleName,
        requestedModel: modelTypeFromReq,
        requestedMaxOutputTokens,
        userPrefs: userAiPrefs ?? undefined,
      },
      async (runtime) =>
        generateText({
          ...generationOptions,
          model: runtime.model,
          temperature: runtime.temperature,
          maxOutputTokens: runtime.maxOutputTokens,
          timeout: AI_TEXT_TIMEOUT_MS,
        }),
    );
    if (runtimeResult.retried) {
      await createSystemLog({
        level: "warn",
        category: "ai",
        message: "AI key failover uygulandı",
        details:
          `module=${moduleName} | reason=${runtimeResult.retryReason ?? "unknown"} | ` +
          `activeKey=${maskGeminiEnvName(runtimeResult.runtime.keyName)} (${runtimeResult.runtime.keySource ?? "unknown"})`,
        userId: user.id,
      }).catch(() => {});
    }
    const runtimeUsed = runtimeResult.runtime;
    const result = runtimeResult.value;

    await persistAiTelemetry({
      userId: user.id,
      modelId: runtimeUsed.modelId,
      keyName: runtimeUsed.keyName,
      moduleName: runtimeUsed.moduleId,
      limitResult,
      source: "generateText",
      usage: Promise.resolve(result.usage),
    });
    void rememberUserSignals({
      userId: user.id,
      moduleName: aiRuntime.moduleId,
      userMessage: message,
      assistantText: result.text,
    }).catch(() => {});

    return NextResponse.json({
      response: { text: result.text },
      model: runtimeUsed.modelId,
    });
  } catch (error) {
    console.error("AI Chat Hatası:", error);

    if (isGeminiErrorLike(error)) {
      const geminiError = geminiErrorToResponsePayload(error);
      await createSystemLog({
        level: "error",
        category: "ai",
        message: `Gemini hatası (${geminiError.reason})`,
        details: `module=chat | reason=${geminiError.reason} | error=${geminiError.message}`,
      }).catch(() => {});
      return NextResponse.json(
        { error: geminiError.message, reason: geminiError.reason },
        { status: geminiError.status },
      );
    }

    const status = isTimeoutLikeError(error) ? 504 : isAbortLikeError(error) ? 499 : 500;
    const message = isTimeoutLikeError(error)
      ? "AI isteği zaman aşımına uğradı."
      : isAbortLikeError(error)
        ? "AI isteği iptal edildi."
        : "Beyin bağlantı hatası.";

    await createSystemLog({
      level: status === 500 ? "error" : "warn",
      category: "ai",
      message: "AI route hatası",
      details: getErrorMessage(error),
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status });
  }
}
