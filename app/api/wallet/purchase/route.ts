import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { creditTokens } from "@/lib/ai/token-wallet";
import { createSystemLog } from "@/lib/system-log";

/**
 * POST /api/wallet/purchase
 * Token paketi satın alma.
 *
 * Şu an mock ödeme (gerçek Stripe entegrasyonu için `paymentIntentId` alanı rezerve edildi).
 * Production'da: Stripe webhook confirm sonrası bu endpoint çağrılır.
 */
export async function POST(req: NextRequest) {
  const purchasesEnabled = process.env.WALLET_PURCHASES_ENABLED === "true";
  if (!purchasesEnabled) {
    return NextResponse.json(
      {
        error: "Satın alma bakım/kapalı modda.",
        reason: "purchase_disabled_maintenance",
      },
      { status: 503 },
    );
  }

  const purchaseSecret = process.env.WALLET_PURCHASE_SECRET;
  if (!purchaseSecret) {
    return NextResponse.json(
      { error: "Satın alma yapılandırması eksik." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("x-wallet-purchase-secret");
  if (signature !== purchaseSecret) {
    return NextResponse.json(
      { error: "Unauthorized purchase source." },
      { status: 401 },
    );
  }

  const supabase = await createClient();

  let body: { packageId: string; paymentIntentId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const paymentIntentId =
    typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

  const bodyUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  let effectiveUserId = bodyUserId;

  if (!effectiveUserId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Kullanıcı bilgisi gerekli (userId)." }, { status: 400 });
    }
    effectiveUserId = user.id;
  }

  if (!body.packageId || !paymentIntentId || !effectiveUserId) {
    return NextResponse.json(
      { error: "packageId, paymentIntentId ve userId gerekli." },
      { status: 400 },
    );
  }

  // Paketi bul
  const pkgRows = await prisma.$queryRaw<{
    id: string; name: string; tokens: bigint; bonusPct: number; priceTry: number; priceUsd: number;
  }[]>`
    SELECT id, name, tokens, bonus_pct AS "bonusPct", price_try AS "priceTry", price_usd AS "priceUsd"
    FROM token_packages WHERE id = ${body.packageId} AND is_active = true LIMIT 1
  `;
  const pkg = pkgRows[0] ?? null;

  if (!pkg) {
    return NextResponse.json({ error: "Paket bulunamadı." }, { status: 404 });
  }

  // Bonus hesapla
  const bonusTokens = pkg.bonusPct > 0
    ? (pkg.tokens * BigInt(pkg.bonusPct)) / 100n
    : 0n;
  const totalTokens = pkg.tokens + bonusTokens;

  const duplicateRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM token_transactions
    WHERE user_id = ${effectiveUserId}
      AND type = 'purchase'
      AND ref_id = ${paymentIntentId}
    LIMIT 1
  `;
  if (duplicateRows.length > 0) {
    return NextResponse.json(
      { error: "Bu ödeme zaten işlenmiş." },
      { status: 409 },
    );
  }

  // Token yükle
  let newBalance: bigint;
  try {
    newBalance = await creditTokens(
      effectiveUserId,
      totalTokens,
      "purchase",
      `${pkg.name} satın alındı — ${totalTokens.toLocaleString()} token`,
      paymentIntentId,
    );
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2010") {
      return NextResponse.json(
        { error: "Bu ödeme zaten işlenmiş." },
        { status: 409 },
      );
    }
    throw error;
  }

  // Log
  createSystemLog({
    level: "info",
    category: "billing",
    message: `Token satın alındı: ${pkg.name}`,
    details: `User: ${effectiveUserId} | Paket: ${pkg.id} | Token: ${totalTokens} | Fiyat: ₺${pkg.priceTry}`,
    userId: effectiveUserId,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    tokensAdded: totalTokens.toString(),
    bonusTokens: bonusTokens.toString(),
    newBalance: newBalance.toString(),
    package: {
      name: pkg.name,
      tokens: pkg.tokens.toString(),
      priceTry: pkg.priceTry,
    },
  });
}
