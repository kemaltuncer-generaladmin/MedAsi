export type PackageTier = "ucretsiz" | "giris" | "pro" | "kurumsal";

export type ModuleAccessKey =
  | "dashboard"
  | "account"
  | "settings"
  | "planners"
  | "notes"
  | "pomodoro"
  | "clinic"
  | "my-patients"
  | "materials"
  | "daily-briefing"
  | "flashcards"
  | "questions"
  | "source"
  | "ai-assistant"
  | "ai"
  | "ai-diagnosis"
  | "case-rpg"
  | "terminal"
  | "patients"
  | "lab-viewing"
  | "cases"
  | "tools"
  | "exams"
  | "rag-admin";

export type PackagePolicy = {
  tier: PackageTier;
  displayName: string;
  aliases: string[];
  monthlyPrice: number;
  initialTokenGrant: number;
  questionBankMonthlyLimit: number | null;
  hasExamAccess: boolean;
  hasUnlimitedQuestionBank: boolean;
  baseModuleAccess: ModuleAccessKey[];
  canBuyAddons: boolean;
  aiLimits: {
    minBalanceToStart: number;
  };
};

const DEFAULT_COMMON_ACCESS: ModuleAccessKey[] = [
  "dashboard",
  "account",
  "settings",
  "planners",
  "notes",
  "pomodoro",
  "clinic",
  "my-patients",
  "materials",
  "daily-briefing",
];

export const DEFAULT_PACKAGE_POLICIES: Record<PackageTier, PackagePolicy> = {
  ucretsiz: {
    tier: "ucretsiz",
    displayName: "Ücretsiz",
    aliases: ["ucretsiz", "ücretsiz", "free", "student", "ogrenci", "öğrenci"],
    monthlyPrice: 0,
    initialTokenGrant: 75_000,
    questionBankMonthlyLimit: 150,
    hasExamAccess: false,
    hasUnlimitedQuestionBank: false,
    baseModuleAccess: DEFAULT_COMMON_ACCESS,
    canBuyAddons: true,
    aiLimits: { minBalanceToStart: 100 },
  },
  giris: {
    tier: "giris",
    displayName: "Giriş",
    aliases: ["giris", "giriş", "starter", "basic"],
    monthlyPrice: 149,
    initialTokenGrant: 250_000,
    questionBankMonthlyLimit: 500,
    hasExamAccess: false,
    hasUnlimitedQuestionBank: false,
    baseModuleAccess: [
      ...DEFAULT_COMMON_ACCESS,
      "flashcards",
      "questions",
      "source",
      "ai-assistant",
    ],
    canBuyAddons: true,
    aiLimits: { minBalanceToStart: 100 },
  },
  pro: {
    tier: "pro",
    displayName: "Pro",
    aliases: ["pro", "premium"],
    monthlyPrice: 399,
    initialTokenGrant: 500_000,
    questionBankMonthlyLimit: null,
    hasExamAccess: true,
    hasUnlimitedQuestionBank: true,
    baseModuleAccess: [
      ...DEFAULT_COMMON_ACCESS,
      "flashcards",
      "questions",
      "source",
      "ai-assistant",
      "ai",
      "ai-diagnosis",
      "case-rpg",
      "terminal",
      "patients",
      "lab-viewing",
      "cases",
      "tools",
      "exams",
      "rag-admin",
    ],
    canBuyAddons: true,
    aiLimits: { minBalanceToStart: 100 },
  },
  kurumsal: {
    tier: "kurumsal",
    displayName: "Kurumsal",
    aliases: ["kurumsal", "enterprise", "corporate"],
    monthlyPrice: 1299,
    initialTokenGrant: 500_000,
    questionBankMonthlyLimit: null,
    hasExamAccess: true,
    hasUnlimitedQuestionBank: true,
    baseModuleAccess: [
      ...DEFAULT_COMMON_ACCESS,
      "flashcards",
      "questions",
      "source",
      "ai-assistant",
      "ai",
      "ai-diagnosis",
      "case-rpg",
      "terminal",
      "patients",
      "lab-viewing",
      "cases",
      "tools",
      "exams",
      "rag-admin",
    ],
    canBuyAddons: true,
    aiLimits: { minBalanceToStart: 100 },
  },
};

const TIER_ORDER: PackageTier[] = ["ucretsiz", "giris", "pro", "kurumsal"];

export function normalizePackageTier(input: string | null | undefined): PackageTier {
  const normalized = (input ?? "").trim().toLowerCase();
  if (!normalized) return "ucretsiz";

  for (const tier of TIER_ORDER) {
    const policy = DEFAULT_PACKAGE_POLICIES[tier];
    if (policy.displayName.toLowerCase() === normalized) return tier;
    if (policy.aliases.includes(normalized)) return tier;
  }

  return "ucretsiz";
}

export function getDefaultPackagePolicyByTier(tier: PackageTier): PackagePolicy {
  return DEFAULT_PACKAGE_POLICIES[tier];
}

export function getAllDefaultPackagePolicies(): PackagePolicy[] {
  return TIER_ORDER.map((tier) => DEFAULT_PACKAGE_POLICIES[tier]);
}

export function getCanonicalPackageName(input: string | null | undefined): string {
  return getDefaultPackagePolicyByTier(normalizePackageTier(input)).displayName;
}
