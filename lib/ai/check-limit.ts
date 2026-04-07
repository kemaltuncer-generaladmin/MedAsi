import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type CheckLimitResult =
  | { canProceed: true; isOrgMember: boolean; orgId?: string }
  | { canProceed: false; reason: 'limit_exceeded' | 'no_package' | 'org_inactive' | 'budget_exceeded' }

export async function checkAndLogAiUsage(): Promise<CheckLimitResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication required to use AI features.')
  }

  const role = user.user_metadata?.role as string | undefined

  // Super admin: kısıtsız
  if (role === 'admin') {
    return { canProceed: true, isOrgMember: false }
  }

  // Araştırmacı: org kontrolü yap
  if (role === 'researcher' || role === 'org_admin') {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id, isActive: true },
      include: { org: true },
    })

    if (!membership) return { canProceed: false, reason: 'limit_exceeded' }

    const org = membership.org
    if (org.status !== 'active' || org.expiresAt < new Date()) {
      return { canProceed: false, reason: 'org_inactive' }
    }

    // Aylık bütçe kontrolü
    if (org.monthlyBudgetUsd) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const agg = await prisma.orgAiUsage.aggregate({
        where: { orgId: org.id, createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
      })
      const usedUsd = agg._sum.costUsd ?? 0
      if (usedUsd >= org.monthlyBudgetUsd) {
        return { canProceed: false, reason: 'budget_exceeded' }
      }
    }

    return { canProceed: true, isOrgMember: true, orgId: org.id }
  }

  // Normal kullanıcı: paket kotası kontrolü
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { package: true },
  })

  if (!dbUser?.package) {
    return { canProceed: false, reason: 'no_package' }
  }

  const dailyLimit = dbUser.package.dailyAiLimit
  if (dailyLimit === -1) {
    return { canProceed: true, isOrgMember: false }
  }

  // Günlük kullanım sayacı (sessions tablosundan)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await prisma.session.count({
    where: { userId: user.id, createdAt: { gte: todayStart } },
  })

  if (todayCount >= dailyLimit) {
    return { canProceed: false, reason: 'limit_exceeded' }
  }

  return { canProceed: true, isOrgMember: false }
}

export async function checkAILimit(userId: string): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { package: true },
  })

  if (!dbUser?.package) return false

  const dailyLimit = dbUser.package.dailyAiLimit
  if (dailyLimit === -1) return true

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await prisma.session.count({
    where: { userId, createdAt: { gte: todayStart } },
  })

  return todayCount < dailyLimit
}

export async function logAIUsage(
  userId: string,
  model: string,
  tokens: number,
  caseId?: string
): Promise<void> {
  await prisma.session.create({
    data: {
      userId,
      model,
      tokensUsed: tokens,
      ...(caseId ? { caseId } : {}),
    },
  })
}
