import type { ModuleAccessKey } from "@/lib/packages/policy";

export type AiKeyFamily =
  | "ai-chat"
  | "mentor"
  | "akilli-asistan"
  | "osce-generate"
  | "osce-message"
  | "osce-evaluate"
  | "analyze-learning"
  | "embeddings"
  | "admin-ai";

export type AiPromptId =
  | "general"
  | "ai-assistant"
  | "ai-diagnosis"
  | "case-rpg"
  | "daily-briefing"
  | "lab-viewing"
  | "exams-sozlu"
  | "exams-zilli"
  | "clinic-assistant"
  | "flashcards-ai"
  | "planners-akilli"
  | "questions-fabrika"
  | "source-ai-notlar";

export type AiDefaultModel = "FAST" | "EFFICIENT";

export type AiModuleConfig = {
  publicModuleId: string;
  aliases: readonly string[];
  keyFamily: AiKeyFamily;
  accessModule: ModuleAccessKey | null;
  promptId: AiPromptId;
  defaultModel: AiDefaultModel;
  supportsStreaming?: boolean;
  expectsJson?: boolean;
  usesRag?: boolean;
};

const AI_MODULES: readonly AiModuleConfig[] = [
  {
    publicModuleId: "general",
    aliases: ["general", "ai", "ai-chat", "terminal"],
    keyFamily: "ai-chat",
    accessModule: null,
    promptId: "general",
    defaultModel: "EFFICIENT",
    supportsStreaming: true,
    usesRag: true,
  },
  {
    publicModuleId: "ai-assistant",
    aliases: ["ai-assistant"],
    keyFamily: "ai-chat",
    accessModule: "ai-assistant",
    promptId: "ai-assistant",
    defaultModel: "EFFICIENT",
    supportsStreaming: true,
    usesRag: true,
  },
  {
    publicModuleId: "daily-briefing",
    aliases: ["daily-briefing"],
    keyFamily: "ai-chat",
    accessModule: "daily-briefing",
    promptId: "daily-briefing",
    defaultModel: "EFFICIENT",
    supportsStreaming: true,
    usesRag: true,
  },
  {
    publicModuleId: "ai-diagnosis",
    aliases: ["ai-diagnosis"],
    keyFamily: "ai-chat",
    accessModule: "ai-diagnosis",
    promptId: "ai-diagnosis",
    defaultModel: "FAST",
    expectsJson: true,
    usesRag: true,
  },
  {
    publicModuleId: "case-rpg",
    aliases: ["case-rpg"],
    keyFamily: "ai-chat",
    accessModule: "case-rpg",
    promptId: "case-rpg",
    defaultModel: "FAST",
    expectsJson: true,
  },
  {
    publicModuleId: "questions-fabrika",
    aliases: ["questions-fabrika", "question-factory", "questions"],
    keyFamily: "ai-chat",
    accessModule: "questions",
    promptId: "questions-fabrika",
    defaultModel: "FAST",
    usesRag: true,
  },
  {
    publicModuleId: "flashcards-ai",
    aliases: ["flashcards-ai", "flashcard", "flashcards"],
    keyFamily: "ai-chat",
    accessModule: "flashcards",
    promptId: "flashcards-ai",
    defaultModel: "EFFICIENT",
    usesRag: true,
  },
  {
    publicModuleId: "source-ai-notlar",
    aliases: ["source-ai-notlar", "ai-notlar", "source"],
    keyFamily: "ai-chat",
    accessModule: "source",
    promptId: "source-ai-notlar",
    defaultModel: "EFFICIENT",
    usesRag: true,
  },
  {
    publicModuleId: "clinic-assistant",
    aliases: ["clinic-assistant"],
    keyFamily: "ai-chat",
    accessModule: "clinic",
    promptId: "clinic-assistant",
    defaultModel: "FAST",
    supportsStreaming: true,
  },
  {
    publicModuleId: "lab-viewing",
    aliases: ["lab-viewing"],
    keyFamily: "ai-chat",
    accessModule: "lab-viewing",
    promptId: "lab-viewing",
    defaultModel: "EFFICIENT",
  },
  {
    publicModuleId: "planners-akilli",
    aliases: ["planners-akilli", "akilli-planlayici"],
    keyFamily: "ai-chat",
    accessModule: "planners",
    promptId: "planners-akilli",
    defaultModel: "EFFICIENT",
  },
  {
    publicModuleId: "exams-sozlu",
    aliases: ["exams-sozlu"],
    keyFamily: "ai-chat",
    accessModule: "exams",
    promptId: "exams-sozlu",
    defaultModel: "FAST",
    supportsStreaming: true,
  },
  {
    publicModuleId: "exams-zilli",
    aliases: ["exams-zilli"],
    keyFamily: "ai-chat",
    accessModule: "exams",
    promptId: "exams-zilli",
    defaultModel: "EFFICIENT",
    expectsJson: true,
  },
  {
    publicModuleId: "mentor",
    aliases: ["mentor"],
    keyFamily: "mentor",
    accessModule: "ai",
    promptId: "general",
    defaultModel: "EFFICIENT",
  },
  {
    publicModuleId: "akilli-asistan",
    aliases: ["akilli-asistan"],
    keyFamily: "akilli-asistan",
    accessModule: "ai-assistant",
    promptId: "general",
    defaultModel: "EFFICIENT",
    usesRag: true,
  },
  {
    publicModuleId: "osce-generate",
    aliases: ["osce-generate"],
    keyFamily: "osce-generate",
    accessModule: "exams",
    promptId: "general",
    defaultModel: "FAST",
    expectsJson: true,
  },
  {
    publicModuleId: "osce-message",
    aliases: ["osce-message", "exams-osce"],
    keyFamily: "osce-message",
    accessModule: "exams",
    promptId: "general",
    defaultModel: "EFFICIENT",
    supportsStreaming: true,
  },
  {
    publicModuleId: "osce-evaluate",
    aliases: ["osce-evaluate"],
    keyFamily: "osce-evaluate",
    accessModule: "exams",
    promptId: "general",
    defaultModel: "FAST",
  },
  {
    publicModuleId: "analyze-learning",
    aliases: ["analyze-learning"],
    keyFamily: "analyze-learning",
    accessModule: "ai",
    promptId: "general",
    defaultModel: "EFFICIENT",
    expectsJson: true,
  },
  {
    publicModuleId: "embeddings",
    aliases: ["embeddings"],
    keyFamily: "embeddings",
    accessModule: null,
    promptId: "general",
    defaultModel: "EFFICIENT",
  },
  {
    publicModuleId: "admin-ai",
    aliases: ["admin-ai", "admin"],
    keyFamily: "admin-ai",
    accessModule: null,
    promptId: "general",
    defaultModel: "EFFICIENT",
  },
] as const;

type RegistryEntry = AiModuleConfig;

const AI_MODULE_FALLBACK = AI_MODULES[0];

const MODULE_ALIAS_MAP = new Map<string, RegistryEntry>();
for (const entry of AI_MODULES) {
  MODULE_ALIAS_MAP.set(entry.publicModuleId, entry);
  for (const alias of entry.aliases) {
    MODULE_ALIAS_MAP.set(alias, entry);
  }
}

export function listAiModules(): readonly AiModuleConfig[] {
  return AI_MODULES;
}

export function getAiModuleById(moduleId: string): AiModuleConfig | null {
  return AI_MODULES.find((entry) => entry.publicModuleId === moduleId) ?? null;
}

export function resolveAiModule(moduleName?: string): {
  requestedModuleId: string | null;
  canonicalModuleId: string;
  config: AiModuleConfig;
  usedFallback: boolean;
  matchedAlias: string | null;
} {
  const normalized = typeof moduleName === "string" ? moduleName.trim().toLowerCase() : "";
  if (!normalized) {
    return {
      requestedModuleId: null,
      canonicalModuleId: AI_MODULE_FALLBACK.publicModuleId,
      config: AI_MODULE_FALLBACK,
      usedFallback: false,
      matchedAlias: null,
    };
  }

  const match = MODULE_ALIAS_MAP.get(normalized);
  if (match) {
    return {
      requestedModuleId: normalized,
      canonicalModuleId: match.publicModuleId,
      config: match,
      usedFallback: false,
      matchedAlias: normalized,
    };
  }

  return {
    requestedModuleId: normalized,
    canonicalModuleId: AI_MODULE_FALLBACK.publicModuleId,
    config: AI_MODULE_FALLBACK,
    usedFallback: true,
    matchedAlias: null,
  };
}

export function getAiModuleRegistryOverview() {
  return AI_MODULES.map((entry) => ({
    module: entry.publicModuleId,
    aliases: [...entry.aliases],
    keyFamily: entry.keyFamily,
    accessModule: entry.accessModule,
    promptId: entry.promptId,
    defaultModel: entry.defaultModel,
    supportsStreaming: entry.supportsStreaming ?? false,
    expectsJson: entry.expectsJson ?? false,
    usesRag: entry.usesRag ?? false,
  }));
}
