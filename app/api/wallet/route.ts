import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWalletStats,
  getTransactionHistory,
  getTokenPackages,
} from "@/lib/ai/token-wallet";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet
 * Kullanıcının cüzdan durumu, işlem geçmişi ve satın alma paketleri.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "30"));

  const [stats, transactions, packages] = await Promise.all([
    getWalletStats(user.id),
    getTransactionHistory(user.id, limit, page * limit),
    getTokenPackages(),
  ]);

  // BigInt JSON'a doğrudan serialize edilemiyor — stringe çevir
  return NextResponse.json({
    purchaseEnabled:
      process.env.WALLET_PURCHASES_ENABLED === "true" &&
      process.env.NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED === "true",
    wallet: {
      balance: stats.balance.toString(),
      totalEarned: stats.totalEarned.toString(),
      totalSpent: stats.totalSpent.toString(),
      updatedAt: stats.updatedAt,
      moduleBreakdown: stats.moduleBreakdown.map((m) => ({
        module: m.module,
        spent: m.spent.toString(),
      })),
      last30days: stats.last30days.map((d) => ({
        day: d.day,
        spent: d.spent.toString(),
      })),
    },
    transactions: transactions.map((t) => ({
      ...t,
      amount: t.amount.toString(),
      balanceAfter: t.balanceAfter.toString(),
    })),
    packages: packages.map((p) => ({
      ...p,
      tokens: p.tokens.toString(),
    })),
    pagination: { page, limit },
  });
}
