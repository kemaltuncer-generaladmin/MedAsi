/**
 * AI Kullanım Kontrolü & Loglama
 * ────────────────────────────────
 * Token cüzdanı tabanlı sistem.
 * Her AI çağrısı önce bakiye kontrol eder, sonra gerçek token sayısını düşer.
 */

import { prisma } from "@/lib/prisma";
import {
  getWalletBalance,
  deductTokens,
  creditTokens,
  getOrCreateWallet,
} from "./token-wallet";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";

export type CheckLimitResult =
  | { canProceed: true; isOrgMember: boolean; orgId?: string }
  | {
      canProceed: false;
      reason:
        | "limit_exceeded"
        | "no_package"
        | "org_inactive"
        | "budget_exceeded"
        | "insufficient_tokens";
      balance?: bigint;
    };

// ─── Ön kontrol: AI çağrısına izin var mı? ───────────────────────────────
export async function checkAndLogAiUsage(): Promise<CheckLimitResult> {
  const { user, role } = await getCurrentUserWithRole();

  if (!user) throw new Error("Authentication required.");

  // Super admin: kısıtsız
  if (role === "admin") {
    return { canProceed: true, isOrgMember: false };
  }

  // Araştırmacı: org bütçe kontrolü
  if (role === "researcher" || role === "org_admin") {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: { org: true },
    });
    if (!membership) return { canProceed: false, reason: "limit_exceeded" };

    const org = membership.org;
    if (org.status !== "active" || org.expiresAt < new Date()) {
      return { canProceed: false, reason: "org_inactive" };
    }

    if (org.monthlyBudgetUsd) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const agg = await prisma.orgAiUsage.aggregate({
        where: { orgId: org.id, createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
      });
      if ((agg._sum.costUsd ?? 0) >= org.monthlyBudgetUsd) {
        return { canProceed: false, reason: "budget_exceeded" };
      }
    }

    return { canProceed: true, isOrgMember: true, orgId: org.id };
  }

  // Normal kullanıcı: token cüzdanı kontrolü (minimum 100 token gerekli)
  const balance = await getWalletBalance(user.id);
  if (balance < 100n) {
    return { canProceed: false, reason: "insufficient_tokens", balance };
  }

  return { canProceed: true, isOrgMember: false };
}

// ─── Eski uyumluluk: basit boolean kontrol ───────────────────────────────
export async function checkAILimit(userId: string): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance >= 100n;
}

// ─── Token düş + session kaydet ──────────────────────────────────────────
export async function logAIUsage(
  userId: string,
  model: string,
  tokens: number,
  module?: string,
  caseId?: string,
): Promise<void> {
  const tokenAmount = BigInt(Math.max(tokens, 0));

  await Promise.allSettled([
    // 1. Cüzdandan düş
    tokenAmount > 0n
      ? deductTokens(userId, tokenAmount, model, module ?? "ai", `${model} — ${module ?? "ai"}`)
      : Promise.resolve(),

    // 2. Session tablosuna ham kayıt (mevcut analitik için korunuyor)
    prisma.session.create({
      data: {
        userId,
        model,
        tokensUsed: tokens,
        ...(caseId ? { caseId } : {}),
      },
    }),
  ]);
}

// ─── Org kullanımı kaydet (araştırmacılar için ayrı) ─────────────────────
export async function logOrgAiUsage(
  userId: string,
  orgId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  module?: string,
): Promise<void> {
  // Model fiyatını bul
  const pricing = await prisma.modelPricing.findUnique({ where: { model } });
  const inputPrice = pricing?.inputPricePer1k ?? 0;
  const outputPrice = pricing?.outputPricePer1k ?? 0;

  const costUsd =
    (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;

  // Org markup uygula
  const org = await prisma.researchOrganization.findUnique({
    where: { id: orgId },
    select: { markupPct: true },
  });
  const markupMultiplier = 1 + (org?.markupPct ?? 0) / 100;

  await prisma.orgAiUsage.create({
    data: {
      orgId,
      userId,
      module: module ?? null,
      model,
      inputTokens,
      outputTokens,
      costUsd: costUsd * markupMultiplier,
    },
  });
}

type SignupPackageGrantSource = {
  packageId?: string;
  packageName?: string;
};

async function resolveSignupPackageGrant(
  userId: string,
  source?: SignupPackageGrantSource,
): Promise<{ name: string; tokenGrant: bigint } | null> {
  if (source?.packageId) {
    return prisma.package.findUnique({
      where: { id: source.packageId },
      select: { name: true, tokenGrant: true },
    });
  }

  if (source?.packageName) {
    return prisma.package.findUnique({
      where: { name: source.packageName },
      select: { name: true, tokenGrant: true },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      package: {
        select: { name: true, tokenGrant: true },
      },
    },
  });

  return user?.package ?? null;
}

// ─── İlk kayıtta paket bazlı token grant ─────────────────────────────────
export async function grantFreeTokensOnSignup(
  userId: string,
  source?: SignupPackageGrantSource,
): Promise<void> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM token_wallets WHERE user_id = ${userId} LIMIT 1
  `;

  // Wallet zaten varsa ilk grant'i tekrar verme.
  if (rows.length > 0) return;

  const pkg = await resolveSignupPackageGrant(userId, source);
  const grant = pkg?.tokenGrant ?? 0n;
  if (grant <= 0n) {
    await getOrCreateWallet(userId);
    return;
  }

  await creditTokens(
    userId,
    grant,
    "grant",
    `Hoş geldiniz! ${pkg?.name ?? "paketiniz"} için ${grant.toLocaleString()} token hediyesi.`,
  );
}
