import {
  geminiErrorToResponsePayload,
  normalizeGeminiError,
  type GeminiErrorReason,
} from "@/lib/ai/google-errors";
import {
  createCentralAiRuntime,
  type AiModelType,
  type CentralAiRuntime,
} from "@/lib/ai/orchestrator";

type RuntimeParams = {
  moduleName?: string;
  requestedModel?: AiModelType;
  requestedMaxOutputTokens?: number;
  userPrefs?: { model?: unknown; responseLength?: unknown };
};

const RETRYABLE_REASONS: GeminiErrorReason[] = [
  "referrer_blocked",
  "invalid_key",
  "model_access_denied",
];

export function shouldRetryWithAlternateGeminiKey(error: unknown): boolean {
  const reason = normalizeGeminiError(error).reason;
  return RETRYABLE_REASONS.includes(reason);
}

export async function withCentralAiRuntimeFailover<T>(
  runtimeParams: RuntimeParams,
  operation: (runtime: CentralAiRuntime) => Promise<T>,
): Promise<{ value: T; runtime: CentralAiRuntime; retried: boolean; retryReason?: GeminiErrorReason }> {
  const primaryRuntime = await createCentralAiRuntime({
    ...runtimeParams,
    keyPreference: "server-first",
  });

  try {
    const value = await operation(primaryRuntime);
    return { value, runtime: primaryRuntime, retried: false };
  } catch (error) {
    const reason = normalizeGeminiError(error).reason;
    if (!shouldRetryWithAlternateGeminiKey(error)) {
      throw error;
    }

    const fallbackRuntime = await createCentralAiRuntime({
      ...runtimeParams,
      keyPreference: "module-first",
    });

    if (fallbackRuntime.keyName === primaryRuntime.keyName) {
      throw error;
    }

    try {
      const value = await operation(fallbackRuntime);
      return {
        value,
        runtime: fallbackRuntime,
        retried: true,
        retryReason: reason,
      };
    } catch {
      throw error;
    }
  }
}

export function geminiReasonFromError(error: unknown): GeminiErrorReason {
  return geminiErrorToResponsePayload(error).reason;
}
