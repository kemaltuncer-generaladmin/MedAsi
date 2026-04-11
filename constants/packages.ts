import { getAllDefaultPackagePolicies, type PackageTier } from "@/lib/packages/policy-defaults";

export type NormalizedPackageTier = PackageTier;

export const PACKAGES = Object.fromEntries(
  getAllDefaultPackagePolicies().map((policy) => [
    policy.tier,
    {
      label: policy.displayName,
      dailyAiLimit: policy.aiLimits.minBalanceToStart,
      price: policy.monthlyPrice,
      tokenGrant: policy.initialTokenGrant,
      questionBankMonthlyLimit: policy.questionBankMonthlyLimit,
      hasExamAccess: policy.hasExamAccess,
    },
  ]),
) as Record<
  NormalizedPackageTier,
  {
    label: string;
    dailyAiLimit: number;
    price: number;
    tokenGrant: number;
    questionBankMonthlyLimit: number | null;
    hasExamAccess: boolean;
  }
>;
