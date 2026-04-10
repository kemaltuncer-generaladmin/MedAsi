"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";

// ─── Guard: Yalnızca super admin çağırabilir ─────────────────────────────────
async function requireAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "admin") {
    throw new Error("Yetkisiz erişim.");
  }
  return user;
}

// ─── Guard: org_admin kendi orgunu alabilir ───────────────────────────────────
async function requireOrgAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "org_admin") {
    throw new Error("Yetkisiz erişim.");
  }
  // Org admin'in bağlı olduğu organizasyonu bul
  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, role: "org_admin", isActive: true },
    include: { org: true },
  });
  if (!membership) throw new Error("Organizasyon bulunamadı.");
  return { user, org: membership.org };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUPER ADMIN — Organizasyon CRUD
// ─────────────────────────────────────────────────────────────────────────────

type CreateOrgInput = {
  name: string;
  slug: string;
  adminEmail: string; // Bu e-posta sahibi org_admin olacak
  adminName: string;
  adminPassword: string; // Geçici şifre
  startsAt: string; // ISO date string
  expiresAt: string;
  markupPct: number;
  monthlyBudgetUsd?: number;
  alertThresholdPct?: number;
  moduleIds: string[]; // İzin verilen modül ID'leri
  notes?: string;
};

export async function createOrganization(input: CreateOrgInput) {
  await requireAdmin();

  const supabase = createAdminClient();

  // 1) Supabase'de org_admin kullanıcısı oluştur
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: input.adminEmail,
      password: input.adminPassword,
      email_confirm: true,
      user_metadata: {
        name: input.adminName,
        role: "org_admin",
      },
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Kullanıcı oluşturulamadı.");
  }

  const authUserId = authData.user.id;

  // 2) Prisma'da User kaydı oluştur
  // org_admin'in de geçerli bir packageId'ye ihtiyacı var — "student" paketini bul
  const defaultPkg = await prisma.package.findFirst({
    orderBy: { price: "asc" },
  });
  if (!defaultPkg) throw new Error("Varsayılan paket bulunamadı.");

  const dbUser = await prisma.user.create({
    data: {
      id: authUserId,
      email: input.adminEmail,
      name: input.adminName,
      packageId: defaultPkg.id,
      role: "org_admin",
    },
  });

  // 3) Organizasyonu oluştur
  const org = await prisma.researchOrganization.create({
    data: {
      name: input.name,
      slug: input.slug,
      adminUserId: dbUser.id,
      status: "active",
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      markupPct: input.markupPct,
      monthlyBudgetUsd: input.monthlyBudgetUsd ?? null,
      alertThresholdPct: input.alertThresholdPct ?? 80,
      notes: input.notes ?? null,
    },
  });

  // 4) Org admin'i OrgMember olarak ekle
  await prisma.orgMember.create({
    data: {
      orgId: org.id,
      userId: dbUser.id,
      role: "org_admin",
    },
  });

  // 5) Modülleri ekle
  if (input.moduleIds.length > 0) {
    await prisma.orgModule.createMany({
      data: input.moduleIds.map((moduleId) => ({ orgId: org.id, moduleId })),
    });
  }

  revalidatePath("/admin/organizations");
  redirect(`/admin/organizations/${org.id}`);
}

export async function updateOrganization(
  orgId: string,
  data: Partial<{
    name: string;
    status: string;
    expiresAt: string;
    markupPct: number;
    monthlyBudgetUsd: number | null;
    alertThresholdPct: number;
    notes: string;
    moduleIds: string[];
  }>,
) {
  await requireAdmin();

  const { moduleIds, expiresAt, ...rest } = data;

  await prisma.researchOrganization.update({
    where: { id: orgId },
    data: {
      ...rest,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    },
  });

  // Modülleri güncelle (önce sil, sonra ekle)
  if (moduleIds !== undefined) {
    await prisma.orgModule.deleteMany({ where: { orgId } });
    if (moduleIds.length > 0) {
      await prisma.orgModule.createMany({
        data: moduleIds.map((moduleId) => ({ orgId, moduleId })),
      });
    }
  }

  revalidatePath(`/admin/organizations/${orgId}`);
}

export async function suspendOrganization(orgId: string) {
  await requireAdmin();
  await prisma.researchOrganization.update({
    where: { id: orgId },
    data: { status: "suspended" },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
}

export async function activateOrganization(orgId: string) {
  await requireAdmin();
  await prisma.researchOrganization.update({
    where: { id: orgId },
    data: { status: "active" },
  });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORG ADMIN — Üye yönetimi
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteResearcher(formData: FormData) {
  const { org } = await requireOrgAdmin();

  const email = formData.get("email") as string;
  if (!email) throw new Error("E-posta zorunludur.");

  // Zaten üye mi?
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: existing.id } },
    });
    if (member) throw new Error("Bu kullanıcı zaten organizasyonun üyesi.");
  }

  // Bekleyen davet var mı?
  const pendingInvite = await prisma.orgInvitation.findFirst({
    where: {
      orgId: org.id,
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingInvite)
    throw new Error("Bu e-postaya zaten aktif bir davet gönderilmiş.");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün

  await prisma.orgInvitation.create({
    data: {
      orgId: org.id,
      email,
      token,
      role: "researcher",
      expiresAt,
    },
  });

  // TODO: E-posta gönderim entegrasyonu eklenecek
  // Şimdilik token admin panelinden görülebilir

  revalidatePath("/org-admin/members");
}

export async function deactivateOrgMember(memberId: string) {
  const { org } = await requireOrgAdmin();

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== org.id) throw new Error("Üye bulunamadı.");
  if (member.role === "org_admin")
    throw new Error("Org admin kendi hesabını devre dışı bırakamaz.");

  await prisma.orgMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });
  revalidatePath("/org-admin/members");
}

export async function reactivateOrgMember(memberId: string) {
  const { org } = await requireOrgAdmin();

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== org.id) throw new Error("Üye bulunamadı.");

  await prisma.orgMember.update({
    where: { id: memberId },
    data: { isActive: true },
  });
  revalidatePath("/org-admin/members");
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUPER ADMIN — Model fiyatlandırması yönetimi
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertModelPricing(
  model: string,
  inputPricePer1k: number,
  outputPricePer1k: number,
) {
  await requireAdmin();
  await prisma.modelPricing.upsert({
    where: { model },
    update: { inputPricePer1k, outputPricePer1k },
    create: {
      model,
      displayName: model,
      inputPricePer1k,
      outputPricePer1k,
    },
  });
  revalidatePath("/admin/organizations");
}
