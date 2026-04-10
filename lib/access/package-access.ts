import {
  normalizePackageTier,
  type ModuleAccessKey,
} from "@/lib/packages/policy-defaults";

export type NormalizedPackage = "ucretsiz" | "giris" | "pro" | "kurumsal";
export type PackageAccessTier = NormalizedPackage;

const PATH_MODULE_MAP: ReadonlyArray<{
  prefix: string;
  moduleKey: ModuleAccessKey;
}> = [
  { prefix: "/dashboard", moduleKey: "dashboard" },
  { prefix: "/account", moduleKey: "account" },
  { prefix: "/settings", moduleKey: "settings" },
  { prefix: "/planners", moduleKey: "planners" },
  { prefix: "/notes", moduleKey: "notes" },
  { prefix: "/pomodoro", moduleKey: "pomodoro" },
  { prefix: "/clinic", moduleKey: "clinic" },
  { prefix: "/my-patients", moduleKey: "my-patients" },
  { prefix: "/materials", moduleKey: "materials" },
  { prefix: "/daily-briefing", moduleKey: "daily-briefing" },
  { prefix: "/flashcards", moduleKey: "flashcards" },
  { prefix: "/questions", moduleKey: "questions" },
  { prefix: "/source", moduleKey: "source" },
  { prefix: "/ai-assistant", moduleKey: "ai-assistant" },
  { prefix: "/ai", moduleKey: "ai" },
  { prefix: "/ai-diagnosis", moduleKey: "ai-diagnosis" },
  { prefix: "/case-rpg", moduleKey: "case-rpg" },
  { prefix: "/terminal", moduleKey: "terminal" },
  { prefix: "/patients", moduleKey: "patients" },
  { prefix: "/lab-viewing", moduleKey: "lab-viewing" },
  { prefix: "/cases", moduleKey: "cases" },
  { prefix: "/tools", moduleKey: "tools" },
  { prefix: "/exams", moduleKey: "exams" },
  { prefix: "/rag-admin", moduleKey: "rag-admin" },
] as const;

export const USER_APP_PREFIXES = PATH_MODULE_MAP.map((entry) => entry.prefix);

function pathStartsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getModuleKeyForPath(pathname: string): ModuleAccessKey | null {
  const match = PATH_MODULE_MAP.find((entry) => pathStartsWithPrefix(pathname, entry.prefix));
  return match?.moduleKey ?? null;
}

export function normalizePackageName(packageName: string | null | undefined): NormalizedPackage {
  return normalizePackageTier(packageName);
}

export function isUserAppPath(pathname: string): boolean {
  return USER_APP_PREFIXES.some((prefix) => pathStartsWithPrefix(pathname, prefix));
}

export function getMinimumPackageTierForPath(pathname: string): PackageAccessTier | null {
  const moduleKey = getModuleKeyForPath(pathname);
  if (!moduleKey) return null;
  if (["dashboard", "account", "settings", "planners", "notes", "pomodoro", "clinic", "my-patients", "materials", "daily-briefing"].includes(moduleKey)) {
    return "ucretsiz";
  }
  if (["flashcards", "questions", "source", "ai-assistant"].includes(moduleKey)) {
    return "giris";
  }
  return "pro";
}

export function canAccessPathForPackage(
  pathname: string,
  packageName: string | null | undefined,
): boolean {
  const minimumTier = getMinimumPackageTierForPath(pathname);
  if (!minimumTier) return true;

  const packageRank: Record<PackageAccessTier, number> = {
    ucretsiz: 0,
    giris: 1,
    pro: 2,
    kurumsal: 3,
  };
  return packageRank[normalizePackageName(packageName)] >= packageRank[minimumTier];
}
