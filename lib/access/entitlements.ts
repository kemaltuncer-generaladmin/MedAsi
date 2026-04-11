import { prisma } from "@/lib/prisma";
import { ensureAddonAccessSchema } from "@/lib/db/schema-guard";
import {
  getResolvedPackagePolicyByTier,
  normalizePackageTier,
  type ModuleAccessKey,
  type PackagePolicy,
  type PackageTier,
} from "@/lib/packages/policy";

export const PATH_MODULE_MAP: ReadonlyArray<{
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

export type ResolvedUserPolicy = {
  userId: string;
  packageTier: PackageTier;
  packageName: string;
  packagePolicy: PackagePolicy;
  addonModuleKeys: ModuleAccessKey[];
};

function pathStartsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getModuleKeyForPath(pathname: string): ModuleAccessKey | null {
  const match = PATH_MODULE_MAP.find((entry) => pathStartsWithPrefix(pathname, entry.prefix));
  return match?.moduleKey ?? null;
}

function normalizeAddonModuleKey(value: string): ModuleAccessKey | null {
  return PATH_MODULE_MAP.some((entry) => entry.moduleKey === value)
    ? (value as ModuleAccessKey)
    : null;
}

export async function getAddonModuleKeys(userId: string): Promise<ModuleAccessKey[]> {
  await ensureAddonAccessSchema();
  const now = new Date();
  const rows = await prisma.userAddonAccess.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { moduleKey: true },
  });
  return rows
    .map((row) => normalizeAddonModuleKey(row.moduleKey))
    .filter((row): row is ModuleAccessKey => row !== null);
}

export async function getResolvedUserPolicy(userId: string): Promise<ResolvedUserPolicy | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { package: { select: { name: true } } },
  });
  if (!user) return null;

  const packageTier = normalizePackageTier(user.package?.name);
  const packagePolicy = await getResolvedPackagePolicyByTier(packageTier);
  const addonModuleKeys = await getAddonModuleKeys(userId);

  return {
    userId,
    packageTier,
    packageName: user.package?.name ?? packagePolicy.displayName,
    packagePolicy,
    addonModuleKeys,
  };
}

export function hasModuleAccess(
  resolved: ResolvedUserPolicy,
  moduleKey: ModuleAccessKey,
): boolean {
  return (
    resolved.packagePolicy.baseModuleAccess.includes(moduleKey) ||
    resolved.addonModuleKeys.includes(moduleKey)
  );
}

export async function canAccessModule(
  userId: string,
  moduleKey: ModuleAccessKey,
): Promise<boolean> {
  const resolved = await getResolvedUserPolicy(userId);
  return resolved ? hasModuleAccess(resolved, moduleKey) : false;
}

export async function canAccessPath(
  userId: string,
  pathname: string,
): Promise<boolean> {
  const moduleKey = getModuleKeyForPath(pathname);
  if (!moduleKey) return true;
  return canAccessModule(userId, moduleKey);
}

export async function getQuestionBankUsageSummary(userId: string): Promise<{
  limit: number | null;
  used: number;
  remaining: number | null;
}> {
  const resolved = await getResolvedUserPolicy(userId);
  if (!resolved) {
    return { limit: 0, used: 0, remaining: 0 };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const used = await prisma.questionAttempt.count({
    where: { userId, attemptedAt: { gte: monthStart } },
  });
  const limit = resolved.packagePolicy.questionBankMonthlyLimit;

  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
  };
}

export async function consumeQuestionBankQuota(
  userId: string,
  count: number,
): Promise<
  | { ok: true; used: number; limit: number | null; remaining: number | null }
  | { ok: false; code: "question_limit_reached" | "package_blocked"; used: number; limit: number | null; remaining: number | null }
> {
  const resolved = await getResolvedUserPolicy(userId);
  if (!resolved || !hasModuleAccess(resolved, "questions")) {
    return { ok: false, code: "package_blocked", used: 0, limit: 0, remaining: 0 };
  }

  const summary = await getQuestionBankUsageSummary(userId);
  if (summary.limit !== null && summary.used + count > summary.limit) {
    return {
      ok: false,
      code: "question_limit_reached",
      used: summary.used,
      limit: summary.limit,
      remaining: summary.remaining,
    };
  }

  return {
    ok: true,
    used: summary.used,
    limit: summary.limit,
    remaining: summary.limit === null ? null : Math.max(summary.limit - summary.used - count, 0),
  };
}
