import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creditTokens } from "@/lib/ai/token-wallet";
import { createSystemLog } from "@/lib/system-log";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/wallet/grant
 * Admin: belirli bir kullanıcıya manuel token yükle.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const role = dbUser?.role ?? null;

  // Sadece admin
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { targetUserId: string; amount: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const MAX_SINGLE_GRANT = 10_000_000;
  if (!body.targetUserId || !body.amount || body.amount <= 0 || body.amount > MAX_SINGLE_GRANT) {
    return NextResponse.json({
      error: `targetUserId ve pozitif amount gerekli (max: ${MAX_SINGLE_GRANT.toLocaleString("tr-TR")} token).`,
    }, { status: 400 });
  }

  const amount = BigInt(Math.floor(body.amount));
  const newBalance = await creditTokens(
    body.targetUserId,
    amount,
    "admin_adjust",
    body.reason ?? `Admin tarafından ${amount.toLocaleString()} token yüklendi`,
    `admin:${user.id}`,
  );

  createSystemLog({
    level: "info",
    category: "admin",
    message: "Manuel token grant",
    details: `Admin: ${user.id} → User: ${body.targetUserId} | ${amount} token | Sebep: ${body.reason ?? "-"}`,
    userId: user.id,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    targetUserId: body.targetUserId,
    tokensGranted: amount.toString(),
    newBalance: newBalance.toString(),
  });
}
