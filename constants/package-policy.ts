import {
  getAllDefaultPackagePolicies,
  getCanonicalPackageName,
  getDefaultPackagePolicyByTier,
  normalizePackageTier,
  type PackagePolicy,
  type PackageTier,
} from "@/lib/packages/policy-defaults";

export type CanonicalPackageTier = PackageTier;
export type CanonicalPackagePolicy = PackagePolicy;

export const CANONICAL_PACKAGE_POLICIES = getAllDefaultPackagePolicies();
export const CANONICAL_PACKAGE_NAMES = CANONICAL_PACKAGE_POLICIES.map(
  (policy) => policy.displayName,
);

export function getPackagePolicyByTier(
  tier: CanonicalPackageTier,
): CanonicalPackagePolicy {
  return getDefaultPackagePolicyByTier(tier);
}

export function estimateMonthlyAiCostTry(
  packageName: string | null | undefined,
): number {
  return getDefaultPackagePolicyByTier(normalizePackageTier(packageName)).monthlyPrice;
}

export function getMonthlyAiCostRangeTry(): { min: number; max: number } | null {
  return null;
}

export function isCanonicalPackageName(packageName: string): boolean {
  return CANONICAL_PACKAGE_NAMES.includes(packageName);
}

export { getCanonicalPackageName, normalizePackageTier };
