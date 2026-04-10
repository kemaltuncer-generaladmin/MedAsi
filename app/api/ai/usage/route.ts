import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { package: true },
    });

    const dailyLimit = dbUser?.package?.dailyAiLimit ?? 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayCount, monthCount, monthData] = await Promise.all([
      prisma.session.count({
        where: { userId: user.id, createdAt: { gte: todayStart } },
      }),
      prisma.session.count({
        where: { userId: user.id, createdAt: { gte: monthStart } },
      }),
      // Son 12 ayın aylık kullanımı
      prisma.$queryRaw<Array<{ month: number; count: bigint }>>`
        SELECT EXTRACT(MONTH FROM "created_at")::int AS month, COUNT(*)::bigint AS count
        FROM sessions
        WHERE user_id = ${user.id}
          AND "created_at" >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `,
    ]);

    const monthlyArray: number[] = Array(12).fill(0);
    for (const row of monthData) {
      monthlyArray[row.month - 1] = Number(row.count);
    }

    // FAST (pro) vs EFFICIENT (flash) dağılımı
    const modelCounts = await prisma.session.groupBy({
      by: ["model"],
      where: { userId: user.id, createdAt: { gte: monthStart } },
      _count: { id: true },
    });

    const fastCount =
      modelCounts
        .filter((m) => m.model.includes("pro") || m.model.includes("2.5-pro"))
        .reduce((s, m) => s + m._count.id, 0);
    const efficientCount =
      modelCounts
        .filter((m) => !m.model.includes("pro") || m.model.includes("flash"))
        .reduce((s, m) => s + m._count.id, 0);

    return NextResponse.json({
      dailyLimit,
      dailyUsed: todayCount,
      monthlyUsed: monthCount,
      packageName: dbUser?.package?.name ?? "Bilinmiyor",
      modelUsage: { fast: fastCount, efficient: efficientCount },
      monthlyData: monthlyArray,
    });
  } catch (error) {
    console.error("AI Usage Error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
