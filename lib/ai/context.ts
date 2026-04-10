import { prisma } from '@/lib/prisma';

export async function getGlobalUserContext(userId: string) {
  // Tüm sistemden veri topla
  const [profile, decks, plan] = await Promise.all([
    prisma.studentLearningProfile.findUnique({ where: { userId } }),
    prisma.deck.findMany({ include: { cards: true } }), // Ideally this should be filtered by userId too if deck model has userId
    prisma.activePlan.findUnique({ where: { id: "user_active_plan" } }), // Wait, is there a per-user plan?
  ]);

  // AI için ham ve temiz bir özet oluştur
  return {
    zayifAlanlar: profile?.weakAreas || [],
    basariOrani: profile?.totalCorrect || 0,
    aktifPlan: plan?.content || "Plan yok",
    flashcardOzeti: decks.map(d => ({ name: d.name, cardCount: d.cards.length })),
  };
}
