import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return dbUser?.role === "admin" ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [coupons, packages] = await Promise.all([
    prisma.couponCode.findMany({
      include: { package: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      packageName: c.package.name,
      durationDays: c.durationDays,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      isActive: c.isActive,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      note: c.note,
      createdAt: c.createdAt.toISOString(),
    })),
    packages,
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code, packageId, durationDays, maxUses, expiresAt, note } = body;

  if (!code || !packageId) {
    return NextResponse.json({ error: "code ve packageId zorunludur" }, { status: 400 });
  }

  // Kod zaten var mı?
  const existing = await prisma.couponCode.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) {
    return NextResponse.json({ error: "Bu kod zaten kullanılıyor." }, { status: 409 });
  }

  const coupon = await prisma.couponCode.create({
    data: {
      code: code.toUpperCase(),
      packageId,
      durationDays: durationDays ?? null,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note: note ?? null,
    },
  });

  return NextResponse.json({ coupon }, { status: 201 });
}
