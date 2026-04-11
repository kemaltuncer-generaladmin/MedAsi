"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { createSystemLog } from "@/lib/system-log";
import { getSettingMap, upsertSystemSetting } from "@/lib/system-settings";
import {
  getAllDefaultPackagePolicies,
  getResolvedPackagePolicies,
  parsePackagePolicyOverrides,
  type ModuleAccessKey,
  type PackagePolicyOverrideMap,
  type PackageTier,
} from "@/lib/packages/policy";

async function checkAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getAdminPackagePolicies() {
  await checkAdmin();
  const [resolved, rawSettings] = await Promise.all([
    getResolvedPackagePolicies(),
    getSettingMap(["packagePolicyOverrides"]),
  ]);

  return {
    policies: Object.values(resolved),
    overrides: parsePackagePolicyOverrides(rawSettings.packagePolicyOverrides),
    defaults: getAllDefaultPackagePolicies(),
  };
}

export async function savePackagePolicyOverrides(
  overrides: PackagePolicyOverrideMap,
): Promise<void> {
  const admin = await checkAdmin();
  await upsertSystemSetting("packagePolicyOverrides", JSON.stringify(overrides));
  await createSystemLog({
    level: "success",
    category: "admin",
    message: "Paket policy override güncellendi",
    details: JSON.stringify(overrides),
    userId: admin.id,
  });
  revalidatePath("/admin/packages");
  revalidatePath("/pricing");
  revalidatePath("/upgrade");
}

export async function getUserAddonAccesses(userId: string) {
  await checkAdmin();
  return prisma.userAddonAccess.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertUserAddonAccess(input: {
  userId: string;
  moduleKey: ModuleAccessKey;
  reason?: string;
  expiresAt?: string | null;
}) {
  const admin = await checkAdmin();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  await prisma.userAddonAccess.upsert({
    where: {
      userId_moduleKey: {
        userId: input.userId,
        moduleKey: input.moduleKey,
      },
    },
    update: {
      reason: input.reason?.trim() || null,
      expiresAt,
      grantedByUserId: admin.id,
    },
    create: {
      userId: input.userId,
      moduleKey: input.moduleKey,
      reason: input.reason?.trim() || null,
      expiresAt,
      grantedByUserId: admin.id,
    },
  });

  await createSystemLog({
    level: "info",
    category: "admin",
    message: `Kullanıcı addon erişimi verildi: ${input.moduleKey}`,
    details: JSON.stringify(input),
    userId: admin.id,
  });

  revalidatePath("/admin/users");
}

export async function revokeUserAddonAccess(id: string) {
  const admin = await checkAdmin();
  const record = await prisma.userAddonAccess.delete({ where: { id } });
  await createSystemLog({
    level: "info",
    category: "admin",
    message: `Kullanıcı addon erişimi kaldırıldı: ${record.moduleKey}`,
    details: JSON.stringify(record),
    userId: admin.id,
  });
  revalidatePath("/admin/users");
}

export async function seedCanonicalPackagesFromPolicy(): Promise<void> {
  await checkAdmin();
  const resolved = await getResolvedPackagePolicies();
  await prisma.$transaction(
    (Object.keys(resolved) as PackageTier[]).map((tier) =>
      prisma.package.upsert({
        where: { name: resolved[tier].displayName },
        update: {
          price: resolved[tier].monthlyPrice,
          tokenGrant: BigInt(resolved[tier].initialTokenGrant),
          dailyAiLimit: resolved[tier].aiLimits.minBalanceToStart,
        },
        create: {
          name: resolved[tier].displayName,
          price: resolved[tier].monthlyPrice,
          tokenGrant: BigInt(resolved[tier].initialTokenGrant),
          dailyAiLimit: resolved[tier].aiLimits.minBalanceToStart,
        },
      }),
    ),
  );
}
