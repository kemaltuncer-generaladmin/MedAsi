import { normalizePackageTier } from "@/constants";

export type NormalizedPackage =
  | "ucretsiz"
  | "giris"
  | "pro"
  | "kurumsal"
  | "unknown";

export type PackageAccessTier = Exclude<NormalizedPackage, "unknown">;

type PathAccessRule = {
  prefix: string;
  minimumTier: PackageAccessTier;
};

const PATH_ACCESS_RULES: readonly PathAccessRule[] = [
  { prefix: "/dashboard", minimumTier: "ucretsiz" },
  { prefix: "/account", minimumTier: "ucretsiz" },
  { prefix: "/settings", minimumTier: "ucretsiz" },
  { prefix: "/clinic/ai-assistan", minimumTier: "giris" },
  { prefix: "/ai-assistant/mentor", minimumTier: "giris" },
  { prefix: "/rag-admin", minimumTier: "pro" },
  { prefix: "/ai-assistant", minimumTier: "giris" },
  { prefix: "/ai-diagnosis", minimumTier: "pro" },
  { prefix: "/case-rpg", minimumTier: "pro" },
  { prefix: "/ai", minimumTier: "pro" },
  { prefix: "/terminal", minimumTier: "pro" },
  { prefix: "/patients", minimumTier: "pro" },
  { prefix: "/lab-viewing", minimumTier: "pro" },
  { prefix: "/cases", minimumTier: "pro" },
  { prefix: "/tools", minimumTier: "pro" },
  { prefix: "/exams", minimumTier: "pro" },
  { prefix: "/flashcards", minimumTier: "giris" },
  { prefix: "/questions", minimumTier: "giris" },
  { prefix: "/source", minimumTier: "giris" },
  { prefix: "/daily-briefing", minimumTier: "ucretsiz" },
  { prefix: "/materials", minimumTier: "ucretsiz" },
  { prefix: "/planners", minimumTier: "ucretsiz" },
  { prefix: "/notes", minimumTier: "ucretsiz" },
  { prefix: "/pomodoro", minimumTier: "ucretsiz" },
  { prefix: "/clinic", minimumTier: "ucretsiz" },
  { prefix: "/my-patients", minimumTier: "ucretsiz" },
] as const;

export const USER_APP_PREFIXES = PATH_ACCESS_RULES.map((rule) => rule.prefix);

function pathStartsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

function pathStartsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathStartsWithPrefix(pathname, prefix));
}

export function normalizePackageName(packageName: string | null | undefined): NormalizedPackage {
  return normalizePackageTier(packageName);
}

export function isUserAppPath(pathname: string): boolean {
  return pathStartsWithAny(pathname, USER_APP_PREFIXES);
}

export function getMinimumPackageTierForPath(
  pathname: string,
): PackageAccessTier | null {
  const rule = PATH_ACCESS_RULES.find((candidate) =>
    pathStartsWithPrefix(pathname, candidate.prefix),
  );
  return rule?.minimumTier ?? null;
}

export function canAccessPathForPackage(
  pathname: string,
  packageName: string | null | undefined,
): boolean {
  const minimumTier = getMinimumPackageTierForPath(pathname);
  if (!minimumTier) return true;

  const pkg = normalizePackageName(packageName);
  const packageRank: Record<PackageAccessTier, number> = {
    ucretsiz: 0,
    giris: 1,
    pro: 2,
    kurumsal: 3,
  };
  return packageRank[pkg === "unknown" ? "ucretsiz" : pkg] >= packageRank[minimumTier];
}
