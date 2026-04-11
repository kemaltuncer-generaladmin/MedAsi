import {
  listAiModules,
  resolveAiModule,
  type AiKeyFamily,
} from "@/lib/ai/module-registry";

function sanitizeEnvValue(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.toUpperCase();
  if (
    normalized.startsWith("YOUR_") ||
    normalized.startsWith("CHANGE_ME") ||
    normalized.startsWith("ROTATE_ME") ||
    normalized.startsWith("REDACTED") ||
    normalized.startsWith("<") ||
    normalized.includes("${")
  ) {
    return "";
  }
  return trimmed;
}

function getFirstValidEnv(keys: string[]): string {
  for (const key of keys) {
    const value = sanitizeEnvValue(process.env[key]);
    if (value) return value;
  }
  return "";
}

export type GeminiApiModule = AiKeyFamily;
export type GeminiKeyPreference = "server-first" | "module-first";
export type GeminiKeySource = "server" | "module";

export const GEMINI_API_MODULES: GeminiApiModule[] = Array.from(
  new Set(listAiModules().map((item) => item.keyFamily)),
);

const SERVER_PRIMARY_ENV_KEYS = [
  "GEMINI_SERVER_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
] as const;

const MODULE_ENV_KEYS: Record<GeminiApiModule, readonly string[]> = {
  "ai-chat": ["GEMINI_KEY_AI_CHAT"],
  "mentor": ["GEMINI_KEY_MENTOR"],
  "akilli-asistan": ["GEMINI_KEY_AKILLI_ASISTAN"],
  "osce-generate": ["GEMINI_KEY_OSCE_GENERATE"],
  "osce-message": ["GEMINI_KEY_OSCE_MESSAGE"],
  "osce-evaluate": ["GEMINI_KEY_OSCE_EVALUATE"],
  "analyze-learning": ["GEMINI_KEY_ANALYZE_LEARNING"],
  "embeddings": ["GEMINI_KEY_EMBEDDINGS"],
  "admin-ai": ["GEMINI_KEY_ADMIN_AI"],
};

function shouldAllowFallback(explicit?: boolean) {
  if (typeof explicit === "boolean") return explicit;
  const raw = (process.env.ALLOW_GLOBAL_GEMINI_KEY_FALLBACK ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return true;
}

export function getGeminiEnvKeysForModule(moduleName?: string): string[] {
  const resolvedModule = resolveAiModule(moduleName);
  return [...MODULE_ENV_KEYS[resolvedModule.config.keyFamily]];
}

export function resolveGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean; keyPreference?: GeminiKeyPreference },
): {
  apiKey: string;
  envName: string | null;
  module: GeminiApiModule | null;
  usedFallback: boolean;
  fallbackAllowed: boolean;
  expectedKeys: string[];
  keySource: GeminiKeySource | null;
} {
  const resolvedModule = resolveAiModule(moduleName);
  const moduleKeys = [...MODULE_ENV_KEYS[resolvedModule.config.keyFamily]];
  const fallbackAllowed = shouldAllowFallback(options?.allowGlobalFallback);
  const preference = options?.keyPreference ?? "server-first";
  const firstPassKeys =
    preference === "module-first" ? [...moduleKeys] : [...SERVER_PRIMARY_ENV_KEYS];
  const secondPassKeys =
    preference === "module-first" ? [...SERVER_PRIMARY_ENV_KEYS] : [...moduleKeys];
  const expectedKeys = fallbackAllowed
    ? [...firstPassKeys, ...secondPassKeys]
    : [...moduleKeys];

  for (const key of firstPassKeys) {
    const value = sanitizeEnvValue(process.env[key as keyof NodeJS.ProcessEnv]);
    if (value) {
      return {
        apiKey: value,
        envName: key,
        module: resolvedModule.config.keyFamily,
        usedFallback: key.startsWith("GEMINI_KEY_"),
        fallbackAllowed,
        expectedKeys,
        keySource: key.startsWith("GEMINI_KEY_") ? "module" : "server",
      };
    }
  }

  if (fallbackAllowed) {
    for (const key of secondPassKeys) {
      const value = sanitizeEnvValue(process.env[key as keyof NodeJS.ProcessEnv]);
      if (value) {
        return {
          apiKey: value,
          envName: key,
          module: resolvedModule.config.keyFamily,
          usedFallback: true,
          fallbackAllowed,
          expectedKeys,
          keySource: key.startsWith("GEMINI_KEY_") ? "module" : "server",
        };
      }
    }
  }

  return {
    apiKey: "",
    envName: null,
    module: resolvedModule.config.keyFamily,
    usedFallback: false,
    fallbackAllowed,
    expectedKeys,
    keySource: null,
  };
}

export function getGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean; keyPreference?: GeminiKeyPreference },
) {
  return resolveGeminiApiKey(moduleName, options).apiKey;
}

export function requireGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean; keyPreference?: GeminiKeyPreference },
) {
  const resolved = resolveGeminiApiKey(moduleName, options);
  const apiKey = resolved.apiKey;
  if (!apiKey) {
    throw new Error(
      `Gemini API key eksik. Beklenen anahtarlar: ${resolved.expectedKeys.join(" / ")}.`,
    );
  }
  return apiKey;
}

export function getResolvedGeminiConfig(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean; keyPreference?: GeminiKeyPreference },
) {
  return resolveGeminiApiKey(moduleName, options);
}

export function maskGeminiEnvName(envName: string | null | undefined): string {
  const raw = (envName ?? "").trim();
  if (!raw) return "unknown";
  if (raw.length <= 6) return `${raw[0] ?? "*"}***`;
  return `${raw.slice(0, 4)}***${raw.slice(-3)}`;
}

export function getGeminiModuleResolutionOverview(options?: {
  allowGlobalFallback?: boolean;
  keyPreference?: GeminiKeyPreference;
}) {
  return listAiModules().map((moduleConfig) => {
    const resolved = resolveGeminiApiKey(moduleConfig.publicModuleId, options);
    return {
      module: moduleConfig.publicModuleId,
      keyFamily: moduleConfig.keyFamily,
      hasKey: Boolean(resolved.apiKey),
      resolvedKey: resolved.envName,
      usedFallback: resolved.usedFallback,
      fallbackAllowed: resolved.fallbackAllowed,
      expectedKeys: resolved.expectedKeys,
      keySource: resolved.keySource,
    };
  });
}
