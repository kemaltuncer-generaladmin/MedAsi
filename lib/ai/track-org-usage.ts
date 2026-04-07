/**
 * Araştırma organizasyonu üyelerinin AI kullanımını maliyet bazında kaydeder.
 *
 * Kullanım: AI API çağrısı yapıldıktan sonra token sayılarıyla çağrılır.
 *
 * const cost = await trackOrgAiUsage({
 *   userId,
 *   model: 'claude-sonnet-4-6',
 *   inputTokens: 1200,
 *   outputTokens: 450,
 *   module: 'ai-diagnosis',
 * })
 */

import { prisma } from '@/lib/prisma'

export type TrackOrgUsageInput = {
  userId: string
  model: string
  inputTokens: number
  outputTokens: number
  module?: string
}

export type TrackOrgUsageResult =
  | { tracked: true; costUsd: number; orgId: string }
  | { tracked: false; reason: 'not_org_member' | 'org_inactive' | 'budget_exceeded' }

/**
 * Kullanıcının aktif bir organizasyon üyeliği varsa kullanımı kaydeder.
 * Normal (non-org) kullanıcılar için hiçbir şey yapmaz (tracked: false döner).
 */
export async function trackOrgAiUsage(input: TrackOrgUsageInput): Promise<TrackOrgUsageResult> {
  const { userId, model, inputTokens, outputTokens, module } = input

  // Kullanıcının aktif org üyeliğini bul
  const membership = await prisma.orgMember.findFirst({
    where: { userId, isActive: true },
    include: {
      org: true,
    },
  })

  if (!membership) return { tracked: false, reason: 'not_org_member' }

  const org = membership.org

  // Org aktif ve süresi dolmamış mı?
  if (org.status !== 'active' || org.expiresAt < new Date()) {
    return { tracked: false, reason: 'org_inactive' }
  }

  // Model fiyatını bul (DB'de yoksa varsayılan kullan)
  const pricing = await prisma.modelPricing.findUnique({ where: { model } })

  const inputPrice = pricing?.inputPricePer1k ?? DEFAULT_PRICES[model]?.input ?? 0.003
  const outputPrice = pricing?.outputPricePer1k ?? DEFAULT_PRICES[model]?.output ?? 0.015

  const costUsd = (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice

  // Aylık bütçe kontrolü
  if (org.monthlyBudgetUsd) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthlyUsage = await prisma.orgAiUsage.aggregate({
      where: { orgId: org.id, createdAt: { gte: monthStart } },
      _sum: { costUsd: true },
    })

    const usedUsd = monthlyUsage._sum.costUsd ?? 0
    if (usedUsd + costUsd > org.monthlyBudgetUsd) {
      return { tracked: false, reason: 'budget_exceeded' }
    }
  }

  // Kullanımı kaydet
  await prisma.orgAiUsage.create({
    data: {
      orgId: org.id,
      userId,
      module: module ?? null,
      model,
      inputTokens,
      outputTokens,
      costUsd,
    },
  })

  return { tracked: true, costUsd, orgId: org.id }
}

/**
 * Bir organizasyonun belirli dönemindeki toplam maliyetini ve
 * kâr marjıyla hesaplanan satış fiyatını döner.
 */
export async function getOrgBillingSummary(orgId: string, from?: Date, to?: Date) {
  const org = await prisma.researchOrganization.findUnique({ where: { id: orgId } })
  if (!org) throw new Error('Organizasyon bulunamadı.')

  const usage = await prisma.orgAiUsage.aggregate({
    where: {
      orgId,
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    _count: { id: true },
  })

  const totalCostUsd = usage._sum.costUsd ?? 0
  const totalInputTokens = usage._sum.inputTokens ?? 0
  const totalOutputTokens = usage._sum.outputTokens ?? 0
  const totalCalls = usage._count.id

  const revenueUsd = totalCostUsd * (1 + org.markupPct / 100)
  const profitUsd = revenueUsd - totalCostUsd

  return {
    totalCostUsd,
    revenueUsd,
    profitUsd,
    markupPct: org.markupPct,
    totalInputTokens,
    totalOutputTokens,
    totalCalls,
  }
}

/**
 * Bir org'un aylık bütçe kullanım yüzdesini döner.
 * Bütçe tanımlanmamışsa null döner.
 */
export async function getOrgBudgetUsage(
  orgId: string
): Promise<{ usedUsd: number; budgetUsd: number; pct: number } | null> {
  const org = await prisma.researchOrganization.findUnique({ where: { id: orgId } })
  if (!org?.monthlyBudgetUsd) return null

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const agg = await prisma.orgAiUsage.aggregate({
    where: { orgId, createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  })

  const usedUsd = agg._sum.costUsd ?? 0
  const pct = Math.min(100, Math.round((usedUsd / org.monthlyBudgetUsd) * 100))
  return { usedUsd, budgetUsd: org.monthlyBudgetUsd, pct }
}

// Fallback token fiyatları (DB'de ModelPricing yoksa)
const DEFAULT_PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':           { input: 0.015,   output: 0.075   },
  'claude-sonnet-4-6':         { input: 0.003,   output: 0.015   },
  'claude-haiku-4-5-20251001': { input: 0.00025, output: 0.00125 },
  'gpt-4o':                    { input: 0.005,   output: 0.015   },
  'gpt-4o-mini':               { input: 0.00015, output: 0.0006  },
}
