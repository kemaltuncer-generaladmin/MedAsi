"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { CANONICAL_PACKAGE_NAMES } from "@/constants";
import { creditTokens, getWalletBalance } from "@/lib/ai/token-wallet";
import { sendPasswordResetEmail } from "@/lib/email";
import { ensureUsageTrackingSchema } from "@/lib/db/schema-guard";
import { parseAiUsageEventFromLog } from "@/lib/ai/telemetry";

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
  await ensureUsageTrackingSchema();
  const users = await prisma.user.findMany({
    include: {
      package: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (users.length === 0) return users;

  const userIds = users.map((user) => user.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [aiLogs, moduleActivities] = await Promise.all([
    prisma.systemLog.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: since },
        message: "AI_USAGE_EVENT",
      },
      select: {
        userId: true,
        createdAt: true,
        details: true,
        message: true,
      },
    }),
    prisma.moduleActivity.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: since },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  const usageByUser = new Map<
    string,
    {
      aiCalls: number;
      aiTokens: number;
      moduleEvents: number;
      lastActivityAt: Date | null;
    }
  >();

  for (const log of aiLogs) {
    if (!log.userId) continue;
    const parsed = parseAiUsageEventFromLog({
      createdAt: log.createdAt,
      details: log.details,
      userId: log.userId,
      message: log.message,
    });
    if (!parsed) continue;

    const current = usageByUser.get(log.userId) ?? {
      aiCalls: 0,
      aiTokens: 0,
      moduleEvents: 0,
      lastActivityAt: null,
    };
    current.aiCalls += 1;
    current.aiTokens += parsed.totalTokens;
    if (!current.lastActivityAt || log.createdAt > current.lastActivityAt) {
      current.lastActivityAt = log.createdAt;
    }
    usageByUser.set(log.userId, current);
  }

  for (const entry of moduleActivities) {
    const current = usageByUser.get(entry.userId) ?? {
      aiCalls: 0,
      aiTokens: 0,
      moduleEvents: 0,
      lastActivityAt: null,
    };
    current.moduleEvents += 1;
    if (!current.lastActivityAt || entry.createdAt > current.lastActivityAt) {
      current.lastActivityAt = entry.createdAt;
    }
    usageByUser.set(entry.userId, current);
  }

  return users.map((user) => ({
    ...user,
    usage30d: usageByUser.get(user.id) ?? {
      aiCalls: 0,
      aiTokens: 0,
      moduleEvents: 0,
      lastActivityAt: user.lastLoginAt ?? null,
    },
  }));
}

export async function updateUserRole(userId: string, role: string) {
  await checkAdmin();
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();

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
      accountApprovedAt: new Date(),
    },
  });
  revalidatePath("/admin/users");
}

export async function approveUserAccount(userId: string) {
  const admin = await checkAdmin();
  await ensureUsageTrackingSchema();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, accountApprovedAt: true },
  });
  if (!user) throw new Error("Kullanıcı bulunamadı.");
  if (user.accountApprovedAt) return { alreadyApproved: true };

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountApprovedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await prisma.systemLog.create({
    data: {
      level: "info",
      category: "admin.account_approval",
      message: `Admin kullanıcı hesabını onayladı: ${userId}`,
      details: JSON.stringify({ userId, email: user.email, adminId: admin.id }),
      userId: admin.id,
    },
  });

  revalidatePath("/admin/users");
  return { alreadyApproved: false };
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

// ─── Pool Browse / Management Actions ────────────────────────────────────────

export async function getPoolQuestions(filters: {
  subject?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: {
    id: string;
    subject: string;
    difficulty: string | null;
    questionText: string;
    options: unknown;
    correctAnswer: string;
    explanation: string | null;
    tags: unknown;
    source: string | null;
    isActive: boolean;
    createdAt: Date;
  }[];
  total: number;
}> {
  await checkAdmin();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (filters.subject) where.subject = filters.subject;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.search) {
    where.questionText = { contains: filters.search, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.poolQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.poolQuestion.count({ where }),
  ]);

  return { items, total };
}

export async function getPoolFlashcards(filters: {
  subject?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: {
    id: string;
    subject: string;
    front: string;
    back: string;
    tags: unknown;
    source: string | null;
    isActive: boolean;
    createdAt: Date;
  }[];
  total: number;
}> {
  await checkAdmin();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (filters.subject) where.subject = filters.subject;
  if (filters.search) {
    where.front = { contains: filters.search, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.poolFlashcard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.poolFlashcard.count({ where }),
  ]);

  return { items, total };
}

export async function deletePoolQuestion(id: string): Promise<void> {
  await checkAdmin();
  await prisma.poolQuestion.delete({ where: { id } });
  revalidatePath("/admin/content");
}

export async function deletePoolFlashcard(id: string): Promise<void> {
  await checkAdmin();
  await prisma.poolFlashcard.delete({ where: { id } });
  revalidatePath("/admin/content");
}

export async function bulkDeletePoolQuestions(ids: string[]): Promise<void> {
  await checkAdmin();
  await prisma.poolQuestion.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/admin/content");
}

export async function bulkDeletePoolFlashcards(ids: string[]): Promise<void> {
  await checkAdmin();
  await prisma.poolFlashcard.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/admin/content");
}

export async function getPoolBatches(): Promise<
  {
    source: string;
    questionCount: number;
    flashcardCount: number;
    createdAt: Date;
  }[]
> {
  await checkAdmin();

  // Get distinct sources from questions and flashcards
  const [qSources, fSources] = await Promise.all([
    prisma.poolQuestion.groupBy({
      by: ["source"],
      _count: { id: true },
      _min: { createdAt: true },
      where: { source: { not: null } },
    }),
    prisma.poolFlashcard.groupBy({
      by: ["source"],
      _count: { id: true },
      _min: { createdAt: true },
      where: { source: { not: null } },
    }),
  ]);

  // Merge by source
  const sourceMap = new Map<
    string,
    { questionCount: number; flashcardCount: number; createdAt: Date }
  >();

  for (const row of qSources) {
    if (!row.source) continue;
    const existing = sourceMap.get(row.source) ?? {
      questionCount: 0,
      flashcardCount: 0,
      createdAt: row._min.createdAt ?? new Date(),
    };
    existing.questionCount += row._count.id;
    sourceMap.set(row.source, existing);
  }

  for (const row of fSources) {
    if (!row.source) continue;
    const existing = sourceMap.get(row.source) ?? {
      questionCount: 0,
      flashcardCount: 0,
      createdAt: row._min.createdAt ?? new Date(),
    };
    existing.flashcardCount += row._count.id;
    sourceMap.set(row.source, existing);
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deletePoolBatch(source: string): Promise<void> {
  await checkAdmin();
  await Promise.all([
    prisma.poolQuestion.deleteMany({ where: { source } }),
    prisma.poolFlashcard.deleteMany({ where: { source } }),
  ]);
  revalidatePath("/admin/content");
}

export async function verifyUserEmail(userId: string) {
  await checkAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw new Error(`E-posta onaylanamadı: ${error.message}`);
  await prisma.systemLog.create({
    data: {
      level: 'info',
      category: 'admin.email_verify',
      message: `Admin tarafından e-posta doğrulandı: ${userId}`,
      details: JSON.stringify({ userId }),
    },
  });
  revalidatePath('/admin/users');
}

export async function sendUserPasswordResetLink(userId: string) {
  const admin = await checkAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const redirectTo = `${origin.replace(/\/$/, "")}/api/auth/callback?next=/reset-password`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(`Şifre sıfırlama bağlantısı oluşturulamadı: ${error?.message ?? "Unknown error"}`);
  }

  await sendPasswordResetEmail(user.email, data.properties.action_link);

  await prisma.systemLog.create({
    data: {
      level: "info",
      category: "admin.password_reset",
      message: `Admin şifre sıfırlama bağlantısı gönderdi: ${user.id}`,
      details: JSON.stringify({ userId: user.id, email: user.email, adminId: admin.id }),
      userId: admin.id,
    },
  });

  revalidatePath("/admin/users");
  return { email: user.email, name: user.name };
}

export async function giftTokens(
  userId: string,
  amount: number,
  description: string,
): Promise<{ newBalance: bigint }> {
  const adminUser = await checkAdmin();
  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("Token miktarı pozitif bir tam sayı olmalıdır.");
  }
  if (!description.trim()) {
    throw new Error("Açıklama zorunludur.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  const newBalance = await creditTokens(
    userId,
    BigInt(amount),
    "admin_adjust",
    description.trim(),
    `admin:${adminUser.id}`,
  );

  await prisma.systemLog.create({
    data: {
      level: 'info',
      category: 'admin.token_gift',
      message: `Admin token hediye etti: ${userId} → ${amount} token`,
      details: JSON.stringify({ userId, email: user.email, amount, description, adminId: adminUser.id }),
    },
  });

  revalidatePath('/admin/users');
  return { newBalance };
}

export async function getUserTokenBalance(userId: string): Promise<bigint> {
  await checkAdmin();
  return getWalletBalance(userId);
}

export async function deleteUser(userId: string) {
  await checkAdmin();
  return await deleteUserInternal(userId);
}

export async function deleteUserInternal(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
  if (!user) throw new Error('Kullanıcı bulunamadı');

  const orgAdminCount = await prisma.researchOrganization.count({ where: { adminUserId: userId } });
  if (orgAdminCount > 0) {
    throw new Error('Kullanıcı bir organizasyonun yöneticisi olarak atanmış. Lütfen önce yönetici atamasını değiştirin.');
  }

  // Audit: log start
  await prisma.systemLog.create({
    data: {
      level: 'info',
      category: 'admin.user_delete',
      message: `Başlatılıyor: Kullanıcı silme ${userId}`,
      details: JSON.stringify({ userId, email: user.email, name: user.name }),
    },
  });

  try {
    await prisma.$transaction([
      prisma.orgAiUsage.deleteMany({ where: { userId } }),
      prisma.orgMember.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.tokenTransaction.deleteMany({ where: { userId } }),
      prisma.tokenWallet.deleteMany({ where: { userId } }),
      prisma.supportTicketMessage.deleteMany({ where: { authorUserId: userId } }),
      prisma.supportTicket.deleteMany({ where: { userId } }),
      prisma.userAddonAccess.deleteMany({ where: { OR: [{ userId }, { grantedByUserId: userId }] } }),
      prisma.studentLearningProfile.deleteMany({ where: { userId } }),
      prisma.dashboardPreferences.deleteMany({ where: { userId } }),
      prisma.questionAttempt.deleteMany({ where: { userId } }),
      prisma.pomodoroLog.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.case.deleteMany({ where: { userId } }),
      prisma.patient.deleteMany({ where: { userId } }),
      prisma.userModule.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  } catch (err) {
    await prisma.systemLog.create({
      data: {
        level: 'error',
        category: 'admin.user_delete',
        message: `Hata: Kullanıcı verileri silinirken hata ${userId}`,
        details: String(err),
      },
    });
    throw new Error(`Kullanıcı verileri silinirken hata oluştu: ${String(err)}`);
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      await prisma.systemLog.create({
        data: {
          level: 'error',
          category: 'admin.user_delete',
          message: `Hata: Supabase auth silinemedi ${userId}`,
          details: error.message,
        },
      });
      throw new Error(`Supabase auth silinemedi: ${error.message}`);
    }
  } catch (err) {
    await prisma.systemLog.create({
      data: {
        level: 'error',
        category: 'admin.user_delete',
        message: `Hata: Auth silinirken hata ${userId}`,
        details: String(err),
      },
    });
    throw new Error(`Auth silinirken hata: ${String(err)}`);
  }

  await prisma.systemLog.create({
    data: {
      level: 'info',
      category: 'admin.user_delete',
      message: `Tamamlandı: Kullanıcı silindi ${userId}`,
      details: JSON.stringify({ userId, email: user.email, name: user.name }),
    },
  });

  revalidatePath('/admin/users');
}
