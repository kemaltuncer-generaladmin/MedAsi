import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  CANONICAL_PACKAGE_POLICIES,
  CANONICAL_PACKAGE_NAMES,
  normalizePackageTier,
  getPackagePolicyByTier,
} from "@/constants";
import {
  DEFAULT_SYSTEM_SETTINGS,
  SYSTEM_SETTING_KEYS,
  sanitizeSystemSettingValue,
  upsertSystemSetting,
} from "@/lib/system-settings";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = dbUser?.role ?? null;

  return role === "admin" ? user : null;
}

async function seedSystemSettings() {
  const existing = await prisma.systemSetting.findMany({
    select: { key: true },
    where: { key: { in: [...SYSTEM_SETTING_KEYS] } },
  });
  const existingSet = new Set(existing.map((row) => row.key));
  const missingKeys = SYSTEM_SETTING_KEYS.filter((key) => !existingSet.has(key));

  await Promise.all(
    missingKeys.map((key) =>
      upsertSystemSetting(
        key,
        sanitizeSystemSettingValue(
          key,
          DEFAULT_SYSTEM_SETTINGS[key] as string | number | boolean,
        ),
      ),
    ),
  );
}

async function initializeSystem() {
  await prisma.activePlan.upsert({
    where: { id: "user_active_plan" },
    update: {},
    create: {
      id: "user_active_plan",
      content: "Henüz bir plan oluşturulmadı.",
    },
  });

  const canonicalPackages = new Map<string, string>();
  for (const policy of CANONICAL_PACKAGE_POLICIES) {
    const tokenGrant =
      policy.tier === "ucretsiz"
        ? 100_000n
        : policy.tier === "giris"
          ? 300_000n
          : policy.tier === "pro"
            ? 500_000n
            : 1_000_000n;

    const pkg = await prisma.package.upsert({
      where: { name: policy.name },
      update: {
        dailyAiLimit: policy.dailyAiLimit,
        price: policy.monthlyPriceTry,
        tokenGrant,
      },
      create: {
        name: policy.name,
        dailyAiLimit: policy.dailyAiLimit,
        price: policy.monthlyPriceTry,
        tokenGrant,
      },
      select: { id: true, name: true },
    });
    canonicalPackages.set(pkg.name, pkg.id);
  }

  const legacyPackages = await prisma.package.findMany({
    where: { name: { notIn: [...CANONICAL_PACKAGE_NAMES] } },
    select: { id: true, name: true },
  });

  for (const legacyPkg of legacyPackages) {
    const targetTier = normalizePackageTier(legacyPkg.name);
    const targetName = getPackagePolicyByTier(targetTier).name;
    const targetPackageId = canonicalPackages.get(targetName);
    if (!targetPackageId) continue;

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { packageId: legacyPkg.id },
        data: { packageId: targetPackageId },
      });

      await tx.couponCode.updateMany({
        where: { packageId: legacyPkg.id },
        data: { packageId: targetPackageId },
      });

      const legacyModules = await tx.packageModule.findMany({
        where: { packageId: legacyPkg.id },
        select: { moduleId: true },
      });
      if (legacyModules.length > 0) {
        await tx.packageModule.createMany({
          data: legacyModules.map((mod) => ({
            packageId: targetPackageId,
            moduleId: mod.moduleId,
          })),
          skipDuplicates: true,
        });
      }
      await tx.packageModule.deleteMany({ where: { packageId: legacyPkg.id } });
      await tx.package.delete({ where: { id: legacyPkg.id } });
    });
  }

  const tokenPackageCount = await prisma.tokenPackage.count();
  if (tokenPackageCount === 0) {
    await prisma.tokenPackage.createMany({
      data: [
        {
          name: "Başlangıç Paketi",
          tokens: 100_000n,
          bonusPct: 0,
          priceTry: 79,
          priceUsd: 2.5,
          isActive: true,
          isPopular: false,
          sortOrder: 1,
        },
        {
          name: "Standart Paket",
          tokens: 300_000n,
          bonusPct: 10,
          priceTry: 199,
          priceUsd: 6.5,
          isActive: true,
          isPopular: true,
          sortOrder: 2,
        },
        {
          name: "Pro Paket",
          tokens: 800_000n,
          bonusPct: 20,
          priceTry: 449,
          priceUsd: 14.5,
          isActive: true,
          isPopular: false,
          sortOrder: 3,
        },
      ],
    });
  }

  await seedSystemSettings();
}

export async function GET() {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const [packageCount, tokenPackageCount, settingCount] = await Promise.all([
    prisma.package.count(),
    prisma.tokenPackage.count(),
    prisma.systemSetting.count(),
  ]);

  return NextResponse.json({
    success: true,
    status: "ready",
    packageCount,
    tokenPackageCount,
    settingCount,
  });
}

export async function POST() {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await initializeSystem();
    return NextResponse.json({
      success: true,
      message: "Sistem başarıyla başlatıldı ve temel veriler senkronlandı.",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Kurulum hatası." }, { status: 500 });
  }
}
