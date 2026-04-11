import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getResolvedUserPolicy, getQuestionBankUsageSummary } from "@/lib/access/entitlements";
import { getWalletStats } from "@/lib/ai/token-wallet";

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

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [resolvedPolicy, walletStats, questionUsage, monthTokenRows] = await Promise.all([
      getResolvedUserPolicy(user.id),
      getWalletStats(user.id),
      getQuestionBankUsageSummary(user.id),
      // Son 12 ayın aylık kullanımı
      prisma.$queryRaw<Array<{ month: number; count: bigint }>>`
        SELECT EXTRACT(MONTH FROM "created_at")::int AS month, COALESCE(ABS(SUM(amount)), 0)::bigint AS count
        FROM token_transactions
        WHERE user_id = ${user.id}
          AND type = 'deduct'
          AND "created_at" >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `,
    ]);

    const monthlyArray: number[] = Array(12).fill(0);
    for (const row of monthTokenRows) {
      monthlyArray[row.month - 1] = Number(row.count);
    }

    const tokenRows = await prisma.tokenTransaction.findMany({
      where: {
        userId: user.id,
        type: "deduct",
        createdAt: { gte: monthStart },
      },
      select: { model: true, amount: true },
    });
    const monthTokenSpend = tokenRows.reduce(
      (sum, row) => sum + Math.abs(Number(row.amount)),
      0,
    );
    const fastCount = tokenRows
      .filter((row) => row.model?.includes("pro"))
      .reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
    const efficientCount = tokenRows
      .filter((row) => !row.model?.includes("pro"))
      .reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);

    const walletPurchaseEnabled = process.env.WALLET_PURCHASES_ENABLED === "true";
    const walletClientPurchaseEnabled =
      process.env.NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED === "true";

    return NextResponse.json({
      dailyLimit: resolvedPolicy?.packagePolicy.aiLimits.minBalanceToStart ?? 0,
      dailyUsed: 0,
      monthlyUsed: monthTokenSpend,
      packageName: resolvedPolicy?.packageName ?? "Bilinmiyor",
      packageTier: resolvedPolicy?.packageTier ?? "ucretsiz",
      balance: Number(walletStats.balance),
      totalSpent: Number(walletStats.totalSpent),
      totalEarned: Number(walletStats.totalEarned),
      questionBank: questionUsage,
      modelUsage: { fast: fastCount, efficient: efficientCount },
      monthlyData: monthlyArray,
      walletPurchase: {
        serverEnabled: walletPurchaseEnabled,
        clientEnabled: walletClientPurchaseEnabled,
        status: walletPurchaseEnabled && walletClientPurchaseEnabled ? "enabled" : "maintenance",
        detail:
          walletPurchaseEnabled && walletClientPurchaseEnabled
            ? "Satın alma aktif"
            : "Satın alma bakım/kapalı modda",
      },
    });
  } catch (error) {
    console.error("AI Usage Error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
