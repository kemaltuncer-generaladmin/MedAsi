import { prisma } from "@/lib/prisma";

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  onboardingRequired: boolean;
  adminLoginEnabled: boolean;
  orgAdminLoginEnabled: boolean;
  emailVerificationRequired?: boolean;
  twoFactorRequired?: boolean;
  passwordResetEnabled?: boolean;
  maxUsersPerDay: number;
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts?: number;
  lockoutMinutes?: number;
  passwordMinLength?: number;
  accountApprovalRequired?: boolean;
  requireProfileCompletion?: boolean;
  aiEnabled: boolean;
  aiModerationEnabled?: boolean;
  aiTemperature?: number;
  aiMaxTokens?: number;
  aiResponseStyle?: string;
  aiSystemPrompt?: string;
  aiOrchestrationMode?: string;
  aiHistoryItemsLimit?: number;
  aiHistoryItemChars?: number;
  aiRagContextChars?: number;
  aiSystemPromptAddon?: string;
  debugMode: boolean;
  allowedEmailDomains: string;
  maintenanceMessage: string;
  usdTryRate: number;
  appVersion: string;
}

export type SystemSettingKey = keyof SystemSettings;

export interface AdminModuleToggle {
  [moduleId: string]: boolean;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  target: "all" | "student" | "pro" | "admin";
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  onboardingRequired: true,
  adminLoginEnabled: true,
  orgAdminLoginEnabled: true,
  emailVerificationRequired: true,
  twoFactorRequired: false,
  passwordResetEnabled: true,
  maxUsersPerDay: 0,
  sessionTimeoutMinutes: 60,
  maxFailedLoginAttempts: 5,
  lockoutMinutes: 15,
  passwordMinLength: 8,
  accountApprovalRequired: false,
  requireProfileCompletion: false,
  aiEnabled: true,
  aiModerationEnabled: true,
  aiTemperature: 0.7,
  aiMaxTokens: 512,
  aiResponseStyle: "balanced",
  aiSystemPrompt: "",
  aiOrchestrationMode: "balanced",
  aiHistoryItemsLimit: 4,
  aiHistoryItemChars: 700,
  aiRagContextChars: 1600,
  aiSystemPromptAddon: "",
  debugMode: false,
  allowedEmailDomains: "",
  maintenanceMessage:
    "Sistemimiz şu anda bakım modundadır. Lütfen daha sonra tekrar deneyiniz.",
  usdTryRate: 39,
  appVersion: "1.0.0",
};

const SYSTEM_SETTINGS_DEFAULTS = DEFAULT_SYSTEM_SETTINGS as Required<SystemSettings>;

export const SYSTEM_SETTING_KEYS: readonly SystemSettingKey[] = [
  "maintenanceMode",
  "registrationEnabled",
  "onboardingRequired",
  "adminLoginEnabled",
  "orgAdminLoginEnabled",
  "emailVerificationRequired",
  "twoFactorRequired",
  "passwordResetEnabled",
  "maxUsersPerDay",
  "sessionTimeoutMinutes",
  "maxFailedLoginAttempts",
  "lockoutMinutes",
  "passwordMinLength",
  "accountApprovalRequired",
  "requireProfileCompletion",
  "aiEnabled",
  "aiModerationEnabled",
  "aiTemperature",
  "aiMaxTokens",
  "aiResponseStyle",
  "aiSystemPrompt",
  "aiOrchestrationMode",
  "aiHistoryItemsLimit",
  "aiHistoryItemChars",
  "aiRagContextChars",
  "aiSystemPromptAddon",
  "debugMode",
  "allowedEmailDomains",
  "maintenanceMessage",
  "usdTryRate",
  "appVersion",
];

const SYSTEM_SETTING_KEY_SET = new Set<string>(SYSTEM_SETTING_KEYS);
const DEFAULT_MODULE_TOGGLES: AdminModuleToggle = {};
const DEFAULT_ANNOUNCEMENTS: AdminAnnouncement[] = [];

async function getCachedSettingMap() {
  const rows = await prisma.systemSetting.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseInteger(
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  if (options?.min !== undefined && parsed < options.min) return fallback;
  if (options?.max !== undefined && parsed > options.max) return fallback;
  return parsed;
}

function parseFloatValue(
  value: unknown,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  if (options?.min !== undefined && parsed < options.min) return fallback;
  if (options?.max !== undefined && parsed > options.max) return fallback;
  return parsed;
}

function parseText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.trim().length > 0 ? value : fallback;
}

function parseDateTime(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  if (!normalized) return fallback;
  return Number.isNaN(Date.parse(normalized)) ? fallback : normalized;
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

function sanitizeModuleToggles(value: unknown): AdminModuleToggle {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_MODULE_TOGGLES;
  }

  const entries = Object.entries(value).filter(
    ([moduleId, enabled]) =>
      typeof moduleId === "string" &&
      moduleId.trim().length > 0 &&
      typeof enabled === "boolean",
  );

  return Object.fromEntries(entries) as AdminModuleToggle;
}

function isAnnouncementType(
  value: unknown,
): value is AdminAnnouncement["type"] {
  return (
    value === "info" ||
    value === "warning" ||
    value === "success" ||
    value === "error"
  );
}

function isAnnouncementTarget(
  value: unknown,
): value is AdminAnnouncement["target"] {
  return (
    value === "all" ||
    value === "student" ||
    value === "pro" ||
    value === "admin"
  );
}

function sanitizeAnnouncement(value: unknown): AdminAnnouncement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = parseText(row.id, "");
  const title = parseText(row.title, "");
  const message = parseText(row.message, "");

  if (!id || !title || !message) {
    return null;
  }

  const createdAt = parseDateTime(row.createdAt, new Date().toISOString());
  const expiresAt =
    typeof row.expiresAt === "string" && row.expiresAt.trim().length > 0
      ? row.expiresAt
      : null;

  return {
    id,
    title,
    message,
    type: isAnnouncementType(row.type) ? row.type : "info",
    target: isAnnouncementTarget(row.target) ? row.target : "all",
    active: typeof row.active === "boolean" ? row.active : false,
    createdAt,
    expiresAt,
  };
}

function sanitizeAnnouncements(value: unknown): AdminAnnouncement[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ANNOUNCEMENTS;
  }

  return value
    .map((item) => sanitizeAnnouncement(item))
    .filter((item): item is AdminAnnouncement => item !== null);
}

export function isSystemSettingKey(key: string): key is SystemSettingKey {
  return SYSTEM_SETTING_KEY_SET.has(key);
}

export function sanitizeSystemSettingValue(
  key: SystemSettingKey,
  value: unknown,
): string {
  switch (key) {
    case "maintenanceMode":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.maintenanceMode),
      );
    case "registrationEnabled":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.registrationEnabled),
      );
    case "onboardingRequired":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.onboardingRequired),
      );
    case "adminLoginEnabled":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.adminLoginEnabled),
      );
    case "orgAdminLoginEnabled":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.orgAdminLoginEnabled),
      );
    case "emailVerificationRequired":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.emailVerificationRequired),
      );
    case "twoFactorRequired":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.twoFactorRequired),
      );
    case "passwordResetEnabled":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.passwordResetEnabled),
      );
    case "maxUsersPerDay":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.maxUsersPerDay, {
          min: 0,
        }),
      );
    case "sessionTimeoutMinutes":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.sessionTimeoutMinutes, {
          min: 1,
        }),
      );
    case "maxFailedLoginAttempts":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.maxFailedLoginAttempts, {
          min: 1,
        }),
      );
    case "lockoutMinutes":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.lockoutMinutes, {
          min: 1,
        }),
      );
    case "passwordMinLength":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.passwordMinLength, {
          min: 6,
        }),
      );
    case "accountApprovalRequired":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.accountApprovalRequired),
      );
    case "requireProfileCompletion":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.requireProfileCompletion),
      );
    case "aiEnabled":
      return String(parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.aiEnabled));
    case "aiModerationEnabled":
      return String(
        parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.aiModerationEnabled),
      );
    case "aiTemperature":
      return String(
        parseFloatValue(value, SYSTEM_SETTINGS_DEFAULTS.aiTemperature, {
          min: 0,
          max: 2,
        }),
      );
    case "aiMaxTokens":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.aiMaxTokens, { min: 1 }),
      );
    case "aiResponseStyle":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.aiResponseStyle);
    case "aiSystemPrompt":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.aiSystemPrompt);
    case "aiOrchestrationMode":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.aiOrchestrationMode);
    case "aiHistoryItemsLimit":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.aiHistoryItemsLimit, {
          min: 1,
          max: 20,
        }),
      );
    case "aiHistoryItemChars":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.aiHistoryItemChars, {
          min: 200,
          max: 2000,
        }),
      );
    case "aiRagContextChars":
      return String(
        parseInteger(value, SYSTEM_SETTINGS_DEFAULTS.aiRagContextChars, {
          min: 400,
          max: 6000,
        }),
      );
    case "aiSystemPromptAddon":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.aiSystemPromptAddon);
    case "debugMode":
      return String(parseBoolean(value, SYSTEM_SETTINGS_DEFAULTS.debugMode));
    case "allowedEmailDomains":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.allowedEmailDomains);
    case "maintenanceMessage":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.maintenanceMessage);
    case "usdTryRate":
      return String(
        parseFloatValue(value, SYSTEM_SETTINGS_DEFAULTS.usdTryRate, {
          min: 0.1,
          max: 1000,
        }),
      );
    case "appVersion":
      return parseText(value, SYSTEM_SETTINGS_DEFAULTS.appVersion);
    default:
      return String(SYSTEM_SETTINGS_DEFAULTS[key]);
  }
}

export async function getSettingMap(keys?: string[]) {
  const map = await getCachedSettingMap();
  if (!keys) return map;

  return Object.fromEntries(
    keys
      .filter((key) => typeof map[key] === "string")
      .map((key) => [key, map[key]]),
  );
}

export async function getSystemSettingsFromDb(): Promise<SystemSettings> {
  const map = await getSettingMap();
  return {
    maintenanceMode: parseBoolean(
      map.maintenanceMode,
      SYSTEM_SETTINGS_DEFAULTS.maintenanceMode,
    ),
    registrationEnabled: parseBoolean(
      map.registrationEnabled,
      SYSTEM_SETTINGS_DEFAULTS.registrationEnabled,
    ),
    onboardingRequired: parseBoolean(
      map.onboardingRequired,
      SYSTEM_SETTINGS_DEFAULTS.onboardingRequired,
    ),
    adminLoginEnabled: parseBoolean(
      map.adminLoginEnabled,
      SYSTEM_SETTINGS_DEFAULTS.adminLoginEnabled,
    ),
    orgAdminLoginEnabled: parseBoolean(
      map.orgAdminLoginEnabled,
      SYSTEM_SETTINGS_DEFAULTS.orgAdminLoginEnabled,
    ),
    emailVerificationRequired: parseBoolean(
      map.emailVerificationRequired,
      SYSTEM_SETTINGS_DEFAULTS.emailVerificationRequired,
    ),
    twoFactorRequired: parseBoolean(
      map.twoFactorRequired,
      SYSTEM_SETTINGS_DEFAULTS.twoFactorRequired,
    ),
    passwordResetEnabled: parseBoolean(
      map.passwordResetEnabled,
      SYSTEM_SETTINGS_DEFAULTS.passwordResetEnabled,
    ),
    maxUsersPerDay: parseInteger(
      map.maxUsersPerDay,
      SYSTEM_SETTINGS_DEFAULTS.maxUsersPerDay,
      { min: 0 },
    ),
    sessionTimeoutMinutes: parseInteger(
      map.sessionTimeoutMinutes,
      SYSTEM_SETTINGS_DEFAULTS.sessionTimeoutMinutes,
      { min: 1 },
    ),
    maxFailedLoginAttempts: parseInteger(
      map.maxFailedLoginAttempts,
      SYSTEM_SETTINGS_DEFAULTS.maxFailedLoginAttempts,
      { min: 1 },
    ),
    lockoutMinutes: parseInteger(
      map.lockoutMinutes,
      SYSTEM_SETTINGS_DEFAULTS.lockoutMinutes,
      { min: 1 },
    ),
    passwordMinLength: parseInteger(
      map.passwordMinLength,
      SYSTEM_SETTINGS_DEFAULTS.passwordMinLength,
      { min: 6 },
    ),
    accountApprovalRequired: parseBoolean(
      map.accountApprovalRequired,
      SYSTEM_SETTINGS_DEFAULTS.accountApprovalRequired,
    ),
    requireProfileCompletion: parseBoolean(
      map.requireProfileCompletion,
      SYSTEM_SETTINGS_DEFAULTS.requireProfileCompletion,
    ),
    aiEnabled: parseBoolean(map.aiEnabled, SYSTEM_SETTINGS_DEFAULTS.aiEnabled),
    aiModerationEnabled: parseBoolean(
      map.aiModerationEnabled,
      SYSTEM_SETTINGS_DEFAULTS.aiModerationEnabled,
    ),
    aiTemperature: parseFloatValue(
      map.aiTemperature,
      SYSTEM_SETTINGS_DEFAULTS.aiTemperature,
      { min: 0, max: 2 },
    ),
    aiMaxTokens: parseInteger(
      map.aiMaxTokens,
      SYSTEM_SETTINGS_DEFAULTS.aiMaxTokens,
      { min: 1 },
    ),
    aiResponseStyle: parseText(
      map.aiResponseStyle,
      SYSTEM_SETTINGS_DEFAULTS.aiResponseStyle,
    ),
    aiSystemPrompt: parseText(
      map.aiSystemPrompt,
      SYSTEM_SETTINGS_DEFAULTS.aiSystemPrompt,
    ),
    aiOrchestrationMode: parseText(
      map.aiOrchestrationMode ?? map.ai_orchestration_mode,
      SYSTEM_SETTINGS_DEFAULTS.aiOrchestrationMode,
    ),
    aiHistoryItemsLimit: parseInteger(
      map.aiHistoryItemsLimit ?? map.ai_history_items_limit,
      SYSTEM_SETTINGS_DEFAULTS.aiHistoryItemsLimit,
      { min: 1, max: 20 },
    ),
    aiHistoryItemChars: parseInteger(
      map.aiHistoryItemChars ?? map.ai_history_item_chars,
      SYSTEM_SETTINGS_DEFAULTS.aiHistoryItemChars,
      { min: 200, max: 2000 },
    ),
    aiRagContextChars: parseInteger(
      map.aiRagContextChars ?? map.ai_rag_context_chars,
      SYSTEM_SETTINGS_DEFAULTS.aiRagContextChars,
      { min: 400, max: 6000 },
    ),
    aiSystemPromptAddon: parseText(
      map.aiSystemPromptAddon ?? map.ai_system_prompt_addon,
      SYSTEM_SETTINGS_DEFAULTS.aiSystemPromptAddon,
    ),
    debugMode: parseBoolean(map.debugMode, SYSTEM_SETTINGS_DEFAULTS.debugMode),
    allowedEmailDomains: parseText(
      map.allowedEmailDomains,
      SYSTEM_SETTINGS_DEFAULTS.allowedEmailDomains,
    ),
    maintenanceMessage: parseText(
      map.maintenanceMessage,
      SYSTEM_SETTINGS_DEFAULTS.maintenanceMessage,
    ),
    usdTryRate: parseFloatValue(
      map.usdTryRate,
      SYSTEM_SETTINGS_DEFAULTS.usdTryRate,
      { min: 0.1, max: 1000 },
    ),
    appVersion: parseText(map.appVersion, SYSTEM_SETTINGS_DEFAULTS.appVersion),
  };
}

export async function getModuleTogglesFromDb(): Promise<AdminModuleToggle> {
  const map = await getSettingMap(["moduleToggles"]);
  return sanitizeModuleToggles(parseJson(map.moduleToggles));
}

export async function getAnnouncementsFromDb(): Promise<AdminAnnouncement[]> {
  const map = await getSettingMap(["announcements"]);
  return sanitizeAnnouncements(parseJson(map.announcements));
}

export async function getPublicSystemConfigFromDb() {
  const [settings, moduleToggles, announcements] = await Promise.all([
    getSystemSettingsFromDb(),
    getModuleTogglesFromDb(),
    getAnnouncementsFromDb(),
  ]);

  return {
    maintenanceMode: settings.maintenanceMode,
    registrationEnabled: settings.registrationEnabled,
    emailVerificationRequired: settings.emailVerificationRequired,
    aiEnabled: settings.aiEnabled,
    maintenanceMessage: settings.maintenanceMessage,
    allowedEmailDomains: settings.allowedEmailDomains,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    requireProfileCompletion: settings.requireProfileCompletion,
    usdTryRate: settings.usdTryRate,
    moduleToggles,
    announcements: announcements.filter((item) => item.active),
  };
}

export async function upsertSystemSetting(
  key: string,
  value: string,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
