"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { CANONICAL_PACKAGE_NAMES } from "@/constants";

async function checkAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers() {
  await checkAdmin();
  const users = await prisma.user.findMany({
    include: {
      package: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return users;
}

export async function updateUserRole(userId: string, role: string) {
  await checkAdmin();
  const supabase = await createClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) throw new Error(error.message);
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function updateUserPackage(userId: string, packageId: string) {
  await checkAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { packageId },
  });
  revalidatePath("/admin/users");
}

export async function createUser(data: {
  email: string;
  name: string;
  packageId: string;
  role: string;
  password: string;
}) {
  await checkAdmin();
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, role: data.role },
    });
  if (authError) throw new Error(authError.message);

  await prisma.user.create({
    data: {
      id: authData.user.id,
      email: data.email,
      name: data.name,
      packageId: data.packageId,
      role: data.role,
    },
  });
  revalidatePath("/admin/users");
}

// ─── User Modules ─────────────────────────────────────────────────────────────

export async function getUserModules(userId: string) {
  await checkAdmin();
  const userModules = await prisma.userModule.findMany({ where: { userId } });
  return userModules.map((um) => um.moduleId);
}

export async function updateUserModules(userId: string, moduleIds: string[]) {
  await checkAdmin();
  await prisma.userModule.deleteMany({ where: { userId } });
  if (moduleIds.length > 0) {
    await prisma.userModule.createMany({
      data: moduleIds.map((moduleId) => ({ userId, moduleId })),
    });
  }
  revalidatePath("/admin/users");
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export async function getPackages() {
  await checkAdmin();
  return prisma.package.findMany();
}

export async function getPackagesWithCount() {
  await checkAdmin();
  return prisma.package.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
  });
}

export async function createPackage(data: {
  name: string;
  dailyAiLimit: number;
  price: number;
  tokenGrant?: number;
}) {
  await checkAdmin();
  const normalizedName = data.name.trim();
  if (!CANONICAL_PACKAGE_NAMES.includes(normalizedName)) {
    throw new Error(
      `Sistem yalnızca sabit 4 paketi destekler: ${CANONICAL_PACKAGE_NAMES.join(", ")}`,
    );
  }

  const existing = await prisma.package.findUnique({ where: { name: normalizedName } });
  if (existing) {
    throw new Error("Bu sabit paket zaten mevcut. Düzenlemek için güncelleme alanını kullanın.");
  }

  await prisma.package.create({
    data: {
      name: normalizedName,
      dailyAiLimit: data.dailyAiLimit,
      price: data.price,
      tokenGrant: data.tokenGrant ?? 0,
    },
  });
  revalidatePath("/admin/packages");
}

export async function updatePackage(
  packageId: string,
  data: { dailyAiLimit: number; price: number },
) {
  await checkAdmin();
  await prisma.package.update({
    where: { id: packageId },
    data,
  });
  revalidatePath("/admin/packages");
}

export async function deletePackage(packageId: string) {
  await checkAdmin();
  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { _count: { select: { users: true } } },
  });
  if (!pkg) throw new Error("Paket bulunamadı");
  if (CANONICAL_PACKAGE_NAMES.includes(pkg.name)) {
    throw new Error("Sabit 4 paket silinemez.");
  }
  if (pkg._count.users > 0) {
    throw new Error(
      `Bu pakette ${pkg._count.users} kullanıcı var. Önce kullanıcıları başka pakete taşıyın.`,
    );
  }
  await prisma.package.delete({ where: { id: packageId } });
  revalidatePath("/admin/packages");
}

export async function getModulesForPackage(packageId: string) {
  await checkAdmin();
  const rows = await prisma.packageModule.findMany({
    where: { packageId },
    select: { moduleId: true },
  });
  return rows.map((r) => r.moduleId);
}

export async function updatePackageModules(
  packageId: string,
  moduleIds: string[],
) {
  await checkAdmin();
  await prisma.$transaction([
    prisma.packageModule.deleteMany({ where: { packageId } }),
    ...moduleIds.map((moduleId) =>
      prisma.packageModule.create({ data: { packageId, moduleId } }),
    ),
  ]);
  revalidatePath("/admin/packages");
}

// ─── Modules ──────────────────────────────────────────────────────────────────

export async function getModules() {
  await checkAdmin();
  return prisma.module.findMany({ orderBy: { name: "asc" } });
}

export async function getAllModules() {
  return getModules();
}

export async function createModule(data: {
  name: string;
  description: string;
}) {
  await checkAdmin();
  await prisma.module.create({
    data: { name: data.name, description: data.description },
  });
  revalidatePath("/admin/modules");
}

export async function deleteModule(moduleId: string) {
  await checkAdmin();
  const packageCount = await prisma.packageModule.count({
    where: { moduleId },
  });
  const userCount = await prisma.userModule.count({ where: { moduleId } });
  if (packageCount > 0 || userCount > 0) {
    throw new Error(
      `Bu modül ${packageCount} pakette ve ${userCount} kullanıcıda kullanılıyor.`,
    );
  }
  await prisma.module.delete({ where: { id: moduleId } });
  revalidatePath("/admin/modules");
}

export async function getModuleUsageStats() {
  await checkAdmin();
  const modules = await prisma.module.findMany({
    include: {
      _count: {
        select: { packageModules: true, userModules: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return modules.map((m) => ({
    moduleId: m.id,
    name: m.name,
    description: m.description,
    packageCount: m._count.packageModules,
    userCount: m._count.userModules,
  }));
}

// ─── Question / Flashcard Pool ────────────────────────────────────────────────

export async function getPoolStats(): Promise<{
  questions: number;
  flashcards: number;
  subjects: string[];
}> {
  await checkAdmin();

  const [questionCount, flashcardCount, questionSubjects, flashcardSubjects] =
    await Promise.all([
      prisma.poolQuestion.count(),
      prisma.poolFlashcard.count(),
      prisma.poolQuestion.findMany({
        select: { subject: true },
        distinct: ["subject"],
      }),
      prisma.poolFlashcard.findMany({
        select: { subject: true },
        distinct: ["subject"],
      }),
    ]);

  const subjects = Array.from(
    new Set([
      ...questionSubjects.map((q) => q.subject),
      ...flashcardSubjects.map((f) => f.subject),
    ]),
  ).sort();

  return { questions: questionCount, flashcards: flashcardCount, subjects };
}

export async function deletePoolItems(
  type: "questions" | "flashcards",
  subject?: string,
): Promise<{ deleted: number }> {
  await checkAdmin();

  if (type === "questions") {
    const result = await prisma.poolQuestion.deleteMany({
      where: subject ? { subject } : {},
    });
    revalidatePath("/admin/content");
    return { deleted: result.count };
  } else {
    const result = await prisma.poolFlashcard.deleteMany({
      where: subject ? { subject } : {},
    });
    revalidatePath("/admin/content");
    return { deleted: result.count };
  }
}
