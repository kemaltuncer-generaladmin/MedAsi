import {
  getAllDefaultPackagePolicies,
  getCanonicalPackageName,
  getDefaultPackagePolicyByTier,
  normalizePackageTier,
  type ModuleAccessKey,
  type PackagePolicy,
  type PackageTier,
} from "@/lib/packages/policy-defaults";

export type { ModuleAccessKey, PackagePolicy, PackageTier };

export type PackagePolicyOverride = Partial<
  Omit<PackagePolicy, "tier" | "aliases" | "displayName"> & {
    baseModuleAccess: ModuleAccessKey[];
  }
>;

export type PackagePolicyOverrideMap = Partial<Record<PackageTier, PackagePolicyOverride>>;

function isPackageTier(value: string): value is PackageTier {
  return ["ucretsiz", "giris", "pro", "kurumsal"].includes(value);
}

function sanitizeModuleAccess(value: unknown, fallback: ModuleAccessKey[]): ModuleAccessKey[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter((item): item is ModuleAccessKey => typeof item === "string");
  return next.length > 0 ? next : fallback;
}

function sanitizePolicyOverride(
  tier: PackageTier,
  value: unknown,
): PackagePolicyOverride | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const base = getDefaultPackagePolicyByTier(tier);

  return {
    monthlyPrice:
      typeof row.monthlyPrice === "number" && Number.isFinite(row.monthlyPrice)
        ? row.monthlyPrice
        : undefined,
    initialTokenGrant:
      typeof row.initialTokenGrant === "number" && Number.isFinite(row.initialTokenGrant)
        ? Math.max(0, Math.floor(row.initialTokenGrant))
        : undefined,
    questionBankMonthlyLimit:
      row.questionBankMonthlyLimit === null
        ? null
        : typeof row.questionBankMonthlyLimit === "number" &&
            Number.isFinite(row.questionBankMonthlyLimit)
          ? Math.max(0, Math.floor(row.questionBankMonthlyLimit))
          : undefined,
    hasExamAccess:
      typeof row.hasExamAccess === "boolean" ? row.hasExamAccess : undefined,
    hasUnlimitedQuestionBank:
      typeof row.hasUnlimitedQuestionBank === "boolean"
        ? row.hasUnlimitedQuestionBank
        : undefined,
    baseModuleAccess: row.baseModuleAccess
      ? sanitizeModuleAccess(row.baseModuleAccess, base.baseModuleAccess)
      : undefined,
    canBuyAddons:
      typeof row.canBuyAddons === "boolean" ? row.canBuyAddons : undefined,
    aiLimits:
      row.aiLimits &&
      typeof row.aiLimits === "object" &&
      !Array.isArray(row.aiLimits) &&
      typeof (row.aiLimits as Record<string, unknown>).minBalanceToStart === "number"
        ? {
            minBalanceToStart: Math.max(
              0,
              Math.floor((row.aiLimits as Record<string, number>).minBalanceToStart),
            ),
          }
        : undefined,
  };
}

export function parsePackagePolicyOverrides(
  raw: string | null | undefined,
): PackagePolicyOverrideMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: PackagePolicyOverrideMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isPackageTier(key)) continue;
      const override = sanitizePolicyOverride(key, value);
      if (override) next[key] = override;
    }
    return next;
  } catch {
    return {};
  }
}

export function applyPackagePolicyOverride(
  base: PackagePolicy,
  override?: PackagePolicyOverride | null,
): PackagePolicy {
  if (!override) return base;
  return {
    ...base,
    monthlyPrice: override.monthlyPrice ?? base.monthlyPrice,
    initialTokenGrant: override.initialTokenGrant ?? base.initialTokenGrant,
    questionBankMonthlyLimit:
      override.questionBankMonthlyLimit === undefined
        ? base.questionBankMonthlyLimit
        : override.questionBankMonthlyLimit,
    hasExamAccess: override.hasExamAccess ?? base.hasExamAccess,
    hasUnlimitedQuestionBank:
      override.hasUnlimitedQuestionBank ?? base.hasUnlimitedQuestionBank,
    baseModuleAccess: override.baseModuleAccess ?? base.baseModuleAccess,
    canBuyAddons: override.canBuyAddons ?? base.canBuyAddons,
    aiLimits: override.aiLimits ?? base.aiLimits,
  };
}

export async function getPackagePolicyOverridesFromDb(): Promise<PackagePolicyOverrideMap> {
  const { getSettingMap } = await import("@/lib/system-settings");
  const map = await getSettingMap(["packagePolicyOverrides"]);
  return parsePackagePolicyOverrides(map.packagePolicyOverrides);
}

export async function getResolvedPackagePolicyByTier(tier: PackageTier): Promise<PackagePolicy> {
  const overrides = await getPackagePolicyOverridesFromDb();
  return applyPackagePolicyOverride(getDefaultPackagePolicyByTier(tier), overrides[tier]);
}

export async function getResolvedPackagePolicies(): Promise<Record<PackageTier, PackagePolicy>> {
  const overrides = await getPackagePolicyOverridesFromDb();
  return {
    ucretsiz: applyPackagePolicyOverride(getDefaultPackagePolicyByTier("ucretsiz"), overrides.ucretsiz),
    giris: applyPackagePolicyOverride(getDefaultPackagePolicyByTier("giris"), overrides.giris),
    pro: applyPackagePolicyOverride(getDefaultPackagePolicyByTier("pro"), overrides.pro),
    kurumsal: applyPackagePolicyOverride(getDefaultPackagePolicyByTier("kurumsal"), overrides.kurumsal),
  };
}

export {
  getAllDefaultPackagePolicies,
  getCanonicalPackageName,
  getDefaultPackagePolicyByTier,
  normalizePackageTier,
};
