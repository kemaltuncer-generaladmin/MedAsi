import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { normalizePackageTier } from "@/constants";

export const dynamic = "force-dynamic";

const QUOTA_MAP: Record<string, number> = {
  ucretsiz: 100 * 1024 * 1024,
  giris: 500 * 1024 * 1024,
  pro: 2048 * 1024 * 1024,
  kurumsal: 2048 * 1024 * 1024,
};

const DEFAULT_QUOTA = 100 * 1024 * 1024;

/** GET /api/materials/quota */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Kullanıcının paket adını çek
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { package: { select: { name: true } } },
  });

  const packageName = dbUser?.package?.name ?? "Ücretsiz";
  const packageTier = normalizePackageTier(packageName);
  const quotaBytes = QUOTA_MAP[packageTier] ?? DEFAULT_QUOTA;

  // Kullanılan depolama alanını hesapla
  const result = await prisma.$queryRaw<[{ used: bigint }]>`
    SELECT COALESCE(SUM(size_bytes), 0) AS used
    FROM user_materials
    WHERE user_id = ${user.id}
  `;

  const usedBytes = Number(result[0]?.used ?? 0);
  const quotaPct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

  return NextResponse.json({
    usedBytes,
    quotaBytes,
    quotaPct,
    plan: dbUser?.package?.name ?? "free",
  });
}
