import { prisma } from '@/lib/prisma'

export async function checkAILimit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { package: true }
  })

  if (!user) return false
  if (user.package.dailyAiLimit === -1) return true

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const count = await prisma.session.count({
    where: {
      userId,
      createdAt: { gte: today }
    }
  })

  return count < user.package.dailyAiLimit
}

export async function logAIUsage(userId: string, model: string, tokensUsed: number, caseId?: string) {
  await prisma.session.create({
    data: {
      userId,
      model,
      tokensUsed,
      caseId
    }
  })
}
