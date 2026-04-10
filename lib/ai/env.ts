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

export type GeminiApiModule =
  | "ai-chat"
  | "mentor"
  | "akilli-asistan"
  | "osce-generate"
  | "osce-message"
  | "osce-evaluate"
  | "analyze-learning"
  | "embeddings"
  | "admin-ai";

export const GEMINI_API_MODULES: GeminiApiModule[] = [
  "ai-chat",
  "mentor",
  "akilli-asistan",
  "osce-generate",
  "osce-message",
  "osce-evaluate",
  "analyze-learning",
  "embeddings",
  "admin-ai",
];

const LEGACY_GLOBAL_ENV_KEYS = [
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

function normalizeModuleName(value?: string): GeminiApiModule | undefined {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "ai-chat":
    case "ai":
    case "general":
    case "daily-briefing":
    case "questions":
    case "question-factory":
    case "flashcards":
    case "source":
    case "terminal":
    case "ai-diagnosis":
    case "case-rpg":
      return "ai-chat";
    case "mentor":
      return "mentor";
    case "akilli-asistan":
      return "akilli-asistan";
    case "osce-generate":
      return "osce-generate";
    case "osce-message":
    case "exams-osce":
    case "exams-sozlu":
    case "exams-zilli":
      return "osce-message";
    case "osce-evaluate":
      return "osce-evaluate";
    case "analyze-learning":
      return "analyze-learning";
    case "embeddings":
      return "embeddings";
    case "admin-ai":
    case "admin":
      return "admin-ai";
    default:
      return undefined;
  }
}

function shouldAllowFallback(explicit?: boolean) {
  if (typeof explicit === "boolean") return explicit;
  const raw = (process.env.ALLOW_GLOBAL_GEMINI_KEY_FALLBACK ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return true;
}

export function getGeminiEnvKeysForModule(moduleName?: string): string[] {
  const normalized = normalizeModuleName(moduleName);
  if (!normalized) return [...LEGACY_GLOBAL_ENV_KEYS];
  return [...MODULE_ENV_KEYS[normalized]];
}

export function resolveGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean },
): {
  apiKey: string;
  envName: string | null;
  module: GeminiApiModule | null;
  usedFallback: boolean;
  fallbackAllowed: boolean;
  expectedKeys: string[];
} {
  const normalized = normalizeModuleName(moduleName);
  const moduleKeys = normalized ? [...MODULE_ENV_KEYS[normalized]] : [];
  const fallbackAllowed = shouldAllowFallback(options?.allowGlobalFallback);
  const expectedKeys = normalized
    ? (fallbackAllowed ? [...moduleKeys, ...LEGACY_GLOBAL_ENV_KEYS] : [...moduleKeys])
    : [...LEGACY_GLOBAL_ENV_KEYS];

  for (const key of moduleKeys) {
    const value = sanitizeEnvValue(process.env[key]);
    if (value) {
      return {
        apiKey: value,
        envName: key,
        module: normalized ?? null,
        usedFallback: false,
        fallbackAllowed,
        expectedKeys,
      };
    }
  }

  if (fallbackAllowed || !normalized) {
    for (const key of LEGACY_GLOBAL_ENV_KEYS) {
      const value = sanitizeEnvValue(process.env[key]);
      if (value) {
        return {
          apiKey: value,
          envName: key,
          module: normalized ?? null,
          usedFallback: true,
          fallbackAllowed,
          expectedKeys,
        };
      }
    }
  }

  return {
    apiKey: "",
    envName: null,
    module: normalized ?? null,
    usedFallback: false,
    fallbackAllowed,
    expectedKeys,
  };
}

export function getGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean },
) {
  return resolveGeminiApiKey(moduleName, options).apiKey;
}

export function requireGeminiApiKey(
  moduleName?: string,
  options?: { allowGlobalFallback?: boolean },
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
  options?: { allowGlobalFallback?: boolean },
) {
  return resolveGeminiApiKey(moduleName, options);
}

export function getGeminiModuleResolutionOverview(options?: { allowGlobalFallback?: boolean }) {
  return GEMINI_API_MODULES.map((moduleName) => {
    const resolved = resolveGeminiApiKey(moduleName, options);
    return {
      module: moduleName,
      hasKey: Boolean(resolved.apiKey),
      resolvedKey: resolved.envName,
      usedFallback: resolved.usedFallback,
      fallbackAllowed: resolved.fallbackAllowed,
      expectedKeys: resolved.expectedKeys,
    };
  });
}
