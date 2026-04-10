export type CanonicalPackageTier = "ucretsiz" | "giris" | "pro" | "kurumsal";

export type CanonicalPackagePolicy = {
  tier: CanonicalPackageTier;
  name: string;
  aliases: string[];
  dailyAiLimit: number;
  monthlyPriceTry: number;
  monthlyAiCostTry: number;
  monthlyAiCostRangeTry?: { min: number; max: number };
};

export const CANONICAL_PACKAGE_POLICIES: readonly CanonicalPackagePolicy[] = [
  {
    tier: "ucretsiz",
    name: "Ücretsiz",
    aliases: ["ucretsiz", "ücretsiz", "free", "student", "ogrenci", "öğrenci"],
    dailyAiLimit: 25,
    monthlyPriceTry: 0,
    monthlyAiCostTry: 8,
    monthlyAiCostRangeTry: { min: 5, max: 10 },
  },
  {
    tier: "giris",
    name: "Giriş",
    aliases: ["giris", "giriş", "basic", "starter", "klinik pro", "clinic pro", "clinic_pro"],
    dailyAiLimit: 100,
    monthlyPriceTry: 149,
    monthlyAiCostTry: 50,
  },
  {
    tier: "pro",
    name: "Pro",
    aliases: ["pro", "premium"],
    dailyAiLimit: 400,
    monthlyPriceTry: 399,
    monthlyAiCostTry: 95,
  },
  {
    tier: "kurumsal",
    name: "Kurumsal",
    aliases: ["kurumsal", "enterprise", "admin"],
    dailyAiLimit: 2000,
    monthlyPriceTry: 1299,
    monthlyAiCostTry: 220,
  },
];

const POLICY_BY_TIER = new Map(
  CANONICAL_PACKAGE_POLICIES.map((policy) => [policy.tier, policy]),
);
const POLICY_BY_NAME = new Map(
  CANONICAL_PACKAGE_POLICIES.map((policy) => [policy.name.toLowerCase(), policy]),
);

export const CANONICAL_PACKAGE_NAMES = CANONICAL_PACKAGE_POLICIES.map(
  (policy) => policy.name,
);

export function normalizePackageTier(packageName: string | null | undefined): CanonicalPackageTier {
  const normalized = (packageName ?? "").toLowerCase().trim();
  if (!normalized) return "ucretsiz";

  const exact = POLICY_BY_NAME.get(normalized);
  if (exact) return exact.tier;

  for (const policy of CANONICAL_PACKAGE_POLICIES) {
    if (policy.aliases.includes(normalized)) return policy.tier;
  }

  return "ucretsiz";
}

export function getPackagePolicyByTier(tier: CanonicalPackageTier): CanonicalPackagePolicy {
  return POLICY_BY_TIER.get(tier)!;
}

export function getCanonicalPackageName(packageName: string | null | undefined): string {
  const tier = normalizePackageTier(packageName);
  return getPackagePolicyByTier(tier).name;
}

export function estimateMonthlyAiCostTry(packageName: string | null | undefined): number {
  const tier = normalizePackageTier(packageName);
  return getPackagePolicyByTier(tier).monthlyAiCostTry;
}

export function getMonthlyAiCostRangeTry(
  packageName: string | null | undefined,
): { min: number; max: number } | null {
  const tier = normalizePackageTier(packageName);
  return getPackagePolicyByTier(tier).monthlyAiCostRangeTry ?? null;
}

export function isCanonicalPackageName(packageName: string): boolean {
  return CANONICAL_PACKAGE_NAMES.includes(packageName);
}
