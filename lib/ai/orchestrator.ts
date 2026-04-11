import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  getResolvedGeminiConfig,
  type GeminiApiModule,
  type GeminiKeyPreference,
  type GeminiKeySource,
} from "@/lib/ai/env";
import { resolveAiModule } from "@/lib/ai/module-registry";
import { getSettingMap } from "@/lib/system-settings";
import { AI_LIMITS, clampOutputTokens } from "@/lib/ai/limits";

export type AiModelType = "FAST" | "EFFICIENT";
export type OrchestrationMode = "balanced" | "cost" | "quality";
export type UserResponseLength = "short" | "medium" | "long";

type AiModelMap = Record<AiModelType, string>;

const MODEL_MAP: AiModelMap = {
  FAST: "gemini-2.5-pro",
  EFFICIENT: "gemini-2.5-flash",
};

const CENTRAL_AI_SETTING_KEYS = [
  "ai_global_enabled",
  "ai_streaming_enabled",
  "ai_moderation_enabled",
  "ai_active_model",
  "ai_temperature",
  "ai_max_tokens",
  "ai_orchestration_mode",
  "ai_module_model_overrides",
  "ai_module_output_overrides",
  "ai_history_items_limit",
  "ai_history_item_chars",
  "ai_rag_context_chars",
  "ai_system_prompt_addon",
] as const;

type UserAiPrefsLike = {
  model?: unknown;
  responseLength?: unknown;
};

export type CentralAiSettings = {
  globalEnabled: boolean;
  streamingEnabled: boolean;
  moderationEnabled: boolean;
  activeModel: AiModelType;
  temperaturePreset: "conservative" | "balanced" | "creative";
  maxTokensPerRequest: number;
  orchestrationMode: OrchestrationMode;
  moduleModelOverrides: Record<string, AiModelType>;
  moduleOutputOverrides: Record<string, number>;
  historyItemsLimit: number;
  historyItemChars: number;
  ragContextChars: number;
  systemPromptAddon: string;
};

export type CentralAiRuntime = {
  settings: CentralAiSettings;
  moduleId: string;
  modelType: AiModelType;
  modelId: string;
  keyName: string | null;
  keyModule: GeminiApiModule | null;
  keySource: GeminiKeySource | null;
  model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
  temperature: number;
  maxOutputTokens: number;
};

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value: unknown, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized);
  } catch {
    return undefined;
  }
}

function parseModel(value: unknown, fallback: AiModelType): AiModelType {
  return value === "FAST" || value === "EFFICIENT" ? value : fallback;
}

function parseMode(value: unknown, fallback: OrchestrationMode): OrchestrationMode {
  return value === "balanced" || value === "cost" || value === "quality" ? value : fallback;
}

function parseTemperaturePreset(
  value: unknown,
  fallback: CentralAiSettings["temperaturePreset"],
): CentralAiSettings["temperaturePreset"] {
  return value === "conservative" || value === "balanced" || value === "creative" ? value : fallback;
}

function sanitizeModuleModelOverrides(value: unknown): Record<string, AiModelType> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value)
    .map(([moduleName, model]) => [moduleName.trim().toLowerCase(), parseModel(model, "EFFICIENT")] as const)
    .filter(([moduleName]) => moduleName.length > 0);
  return Object.fromEntries(entries);
}

function sanitizeModuleOutputOverrides(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value)
    .map(([moduleName, maxTokens]) => {
      const normalizedName = moduleName.trim().toLowerCase();
      const normalizedTokens = clampOutputTokens(maxTokens, AI_LIMITS.DEFAULT_OUTPUT_TOKENS);
      return [normalizedName, normalizedTokens] as const;
    })
    .filter(([moduleName]) => moduleName.length > 0);
  return Object.fromEntries(entries);
}

function readUserModelPreference(userPrefs?: UserAiPrefsLike): AiModelType | undefined {
  return userPrefs?.model === "FAST" || userPrefs?.model === "EFFICIENT" ? userPrefs.model : undefined;
}

function readUserResponseLength(userPrefs?: UserAiPrefsLike): UserResponseLength | undefined {
  return userPrefs?.responseLength === "short" ||
    userPrefs?.responseLength === "medium" ||
    userPrefs?.responseLength === "long"
    ? userPrefs.responseLength
    : undefined;
}

function getTemperatureFromPreset(preset: CentralAiSettings["temperaturePreset"]): number {
  switch (preset) {
    case "conservative":
      return 0.35;
    case "creative":
      return 0.95;
    case "balanced":
    default:
      return 0.65;
  }
}

function adjustTokensByLength(maxOutputTokens: number, responseLength?: UserResponseLength): number {
  if (!responseLength) return maxOutputTokens;
  if (responseLength === "short") return clampOutputTokens(Math.round(maxOutputTokens * 0.7), 256, maxOutputTokens);
  if (responseLength === "long") return clampOutputTokens(Math.round(maxOutputTokens * 1.3), maxOutputTokens, AI_LIMITS.MAX_OUTPUT_TOKENS_HARD_CAP);
  return maxOutputTokens;
}

export async function getCentralAiSettings(): Promise<CentralAiSettings> {
  const map = await getSettingMap([...CENTRAL_AI_SETTING_KEYS]);
  const moduleModelOverrides = sanitizeModuleModelOverrides(parseJson(map.ai_module_model_overrides));
  const moduleOutputOverrides = sanitizeModuleOutputOverrides(parseJson(map.ai_module_output_overrides));

  return {
    globalEnabled: parseBoolean(map.ai_global_enabled, true),
    streamingEnabled: parseBoolean(map.ai_streaming_enabled, true),
    moderationEnabled: parseBoolean(map.ai_moderation_enabled, true),
    activeModel: "EFFICIENT",
    temperaturePreset: parseTemperaturePreset(map.ai_temperature, "balanced"),
    maxTokensPerRequest: clampOutputTokens(map.ai_max_tokens, 384),
    orchestrationMode: parseMode(map.ai_orchestration_mode, "balanced"),
    moduleModelOverrides,
    moduleOutputOverrides,
    historyItemsLimit: 4,
    historyItemChars: parseInteger(map.ai_history_item_chars, AI_LIMITS.MAX_HISTORY_ITEM_CHARS, 200, 2_000),
    ragContextChars: parseInteger(map.ai_rag_context_chars, AI_LIMITS.MAX_RAG_CONTEXT_CHARS, 400, 6_000),
    systemPromptAddon: typeof map.ai_system_prompt_addon === "string" ? map.ai_system_prompt_addon.trim() : "",
  };
}

export function resolveModelType(params: {
  settings: CentralAiSettings;
  moduleName?: string;
  requestedModel?: AiModelType;
  userPrefs?: UserAiPrefsLike;
}): AiModelType {
  const resolvedModule = resolveAiModule(params.moduleName);
  const moduleName = resolvedModule.canonicalModuleId;
  const fromModuleOverride = moduleName ? params.settings.moduleModelOverrides[moduleName] : undefined;
  if (fromModuleOverride) return fromModuleOverride;
  if (params.requestedModel) return params.requestedModel;

  const userModel = readUserModelPreference(params.userPrefs);
  if (userModel) return userModel;

  if (params.settings.orchestrationMode === "quality") return "FAST";
  if (params.settings.orchestrationMode === "cost") return "EFFICIENT";
  return resolvedModule.config.defaultModel;
}

export function resolveMaxOutputTokens(params: {
  settings: CentralAiSettings;
  moduleName?: string;
  requestedMaxOutputTokens?: number;
  userPrefs?: UserAiPrefsLike;
}): number {
  const resolvedModule = resolveAiModule(params.moduleName);
  const moduleName = resolvedModule.canonicalModuleId;
  const moduleOverride = moduleName ? params.settings.moduleOutputOverrides[moduleName] : undefined;

  const baseMax = moduleOverride
    ?? (typeof params.requestedMaxOutputTokens === "number"
      ? clampOutputTokens(params.requestedMaxOutputTokens, params.settings.maxTokensPerRequest)
      : params.settings.maxTokensPerRequest);

  return adjustTokensByLength(baseMax, readUserResponseLength(params.userPrefs));
}

function resolveModelId(modelType: AiModelType, moduleName?: string) {
  const normalized = resolveAiModule(moduleName).canonicalModuleId;
  if (normalized === "osce-generate" || normalized === "osce-evaluate") {
    return "gemini-2.5-pro";
  }
  return MODEL_MAP[modelType];
}

export async function createCentralAiRuntime(params: {
  moduleName?: string;
  requestedModel?: AiModelType;
  requestedMaxOutputTokens?: number;
  userPrefs?: UserAiPrefsLike;
  keyPreference?: GeminiKeyPreference;
}): Promise<CentralAiRuntime> {
  const settings = await getCentralAiSettings();
  const resolvedModule = resolveAiModule(params.moduleName);
  const modelType = resolveModelType({
    settings,
    moduleName: resolvedModule.canonicalModuleId,
    requestedModel: params.requestedModel,
    userPrefs: params.userPrefs,
  });

  const modelId = resolveModelId(modelType, resolvedModule.canonicalModuleId);
  // Always permit legacy global-key fallback in runtime to avoid module-key misconfiguration outages.
  const resolvedKey = getResolvedGeminiConfig(resolvedModule.canonicalModuleId, {
    allowGlobalFallback: true,
    keyPreference: params.keyPreference ?? "server-first",
  });
  if (!resolvedKey.apiKey) {
    throw new Error(
      `Gemini API key eksik (module=${resolvedModule.canonicalModuleId}). ` +
      `Beklenen anahtarlar: ${resolvedKey.expectedKeys.join(" / ")}. ` +
      `Global fallback: ${resolvedKey.fallbackAllowed ? "acik" : "kapali"}.`,
    );
  }
  const google = createGoogleGenerativeAI({ apiKey: resolvedKey.apiKey });

  return {
    settings,
    moduleId: resolvedModule.canonicalModuleId,
    modelType,
    modelId,
    keyName: resolvedKey.envName,
    keyModule: resolvedKey.module,
    keySource: resolvedKey.keySource,
    model: google(modelId),
    temperature: getTemperatureFromPreset(settings.temperaturePreset),
    maxOutputTokens: resolveMaxOutputTokens({
      settings,
      moduleName: resolvedModule.canonicalModuleId,
      requestedMaxOutputTokens: params.requestedMaxOutputTokens,
      userPrefs: params.userPrefs,
    }),
  };
}

export function appendCentralSystemPrompt(basePrompt: string, settings: CentralAiSettings): string {
  if (!settings.systemPromptAddon) return basePrompt;
  return `${basePrompt.trim()}\n\n[MERKEZI AI POLITIKASI]\n${settings.systemPromptAddon}`;
}
