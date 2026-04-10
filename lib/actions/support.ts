"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { ensureSupportSchema } from "@/lib/db/schema-guard";
import { createSystemLog } from "@/lib/system-log";
import { trackModuleActivity } from "@/lib/telemetry/module-activity";

export const SUPPORT_STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed",
] as const;

export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["triaged", "in_progress", "waiting_user", "resolved", "closed"],
  triaged: ["open", "in_progress", "waiting_user", "resolved", "closed"],
  in_progress: ["open", "triaged", "waiting_user", "resolved", "closed"],
  waiting_user: ["open", "in_progress", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

function isSupportStatus(value: string): value is (typeof SUPPORT_STATUSES)[number] {
  return SUPPORT_STATUSES.includes(value as (typeof SUPPORT_STATUSES)[number]);
}

function isSupportPriority(value: string): value is (typeof SUPPORT_PRIORITIES)[number] {
  return SUPPORT_PRIORITIES.includes(value as (typeof SUPPORT_PRIORITIES)[number]);
}

function assertStatusTransition(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return;
  if (!isSupportStatus(currentStatus) || !isSupportStatus(nextStatus)) {
    throw new Error("Geçersiz destek talebi durumu.");
  }

  if (!ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    throw new Error(`Talep ${currentStatus} durumundan ${nextStatus} durumuna geçirilemez.`);
  }
}

async function requireUser() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) throw new Error("Unauthorized");
  return { user, role };
}

async function requireAdmin() {
  const { user, role } = await requireUser();
  if (role !== "admin") throw new Error("Unauthorized");
  return user;
}

function revalidateSupportSurfaces() {
  revalidatePath("/account/support");
  revalidatePath("/admin/support");
}

async function createSupportAuditLog(input: {
  ticketId: string;
  actorUserId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: string | null;
}) {
  await prisma.supportTicketAudit.create({
    data: {
      ticketId: input.ticketId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      details: input.details ?? null,
    },
  });
}

function getOverdueStatus(ticket: { status: string; updatedAt: Date; createdAt: Date }) {
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  const base = ticket.updatedAt ?? ticket.createdAt;
  return Date.now() - new Date(base).getTime() > 24 * 60 * 60 * 1000;
}

export async function getSupportAdmins() {
  await ensureSupportSchema();
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
}

export async function createSupportTicket(input: {
  subject: string;
  category?: string;
  priority?: string;
  message: string;
}) {
  await ensureSupportSchema();
  const { user } = await requireUser();
  const subject = input.subject.trim();
  const category = input.category?.trim() || null;
  const priority = input.priority?.trim() || "normal";
  const message = input.message.trim();

  if (!subject || !message) {
    throw new Error("Konu ve mesaj zorunludur.");
  }
  if (!isSupportPriority(priority)) {
    throw new Error("Geçersiz öncelik değeri.");
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject,
      category,
      priority,
      status: "open",
      messages: {
        create: {
          authorUserId: user.id,
          body: message,
          isAdmin: false,
        },
      },
      audits: {
        create: {
          actorUserId: user.id,
          action: "ticket_created",
          toStatus: "open",
          details: JSON.stringify({ category, priority }),
        },
      },
    },
  });

  await createSystemLog({
    level: "info",
    category: "support",
    message: "Yeni destek talebi oluşturuldu",
    userId: user.id,
    details: JSON.stringify({ ticketId: ticket.id, category, priority }),
  });
  await trackModuleActivity({
    userId: user.id,
    path: "/account/support",
    action: "support_ticket_created",
    module: "support",
    metadata: { ticketId: ticket.id },
  }).catch(() => {});

  revalidateSupportSurfaces();
  return ticket;
}

export async function getMySupportTickets() {
  await ensureSupportSchema();
  const { user } = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    include: {
      assignedAdmin: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      audits: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          actorUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return tickets.map((ticket) => ({
    ...ticket,
    isOverdue: getOverdueStatus(ticket),
  }));
}

export async function replyToMySupportTicket(ticketId: string, body: string) {
  await ensureSupportSchema();
  const { user } = await requireUser();
  const message = body.trim();
  if (!message) throw new Error("Mesaj boş olamaz.");

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!ticket) throw new Error("Talep bulunamadı.");
  if (ticket.status === "closed") {
    throw new Error("Kapalı talebe kullanıcı yanıtı eklenemez.");
  }

  const nextStatus = ticket.status === "waiting_user" || ticket.status === "resolved"
    ? "open"
    : ticket.status;

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: nextStatus,
      resolvedAt: nextStatus === "open" ? null : undefined,
      closedAt: null,
      closeReason: null,
      messages: {
        create: {
          authorUserId: user.id,
          body: message,
          isAdmin: false,
        },
      },
    },
  });

  await createSupportAuditLog({
    ticketId,
    actorUserId: user.id,
    action: "user_reply_added",
    fromStatus: ticket.status,
    toStatus: nextStatus,
    details: JSON.stringify({ reopened: nextStatus !== ticket.status }),
  });
  await createSystemLog({
    level: "info",
    category: "support",
    message: "Kullanıcı destek talebine yanıt ekledi",
    userId: user.id,
    details: JSON.stringify({ ticketId, nextStatus }),
  });
  await trackModuleActivity({
    userId: user.id,
    path: "/account/support",
    action: "support_ticket_reply",
    module: "support",
    metadata: { ticketId },
  }).catch(() => {});

  revalidateSupportSurfaces();
}

export async function getAdminSupportTickets() {
  await ensureSupportSchema();
  await requireAdmin();
  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedAdmin: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          authorUser: { select: { id: true, name: true, email: true } },
        },
      },
      audits: {
        orderBy: { createdAt: "desc" },
        include: {
          actorUser: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });

  return tickets.map((ticket) => ({
    ...ticket,
    isOverdue: getOverdueStatus(ticket),
  }));
}

export async function updateSupportTicketAdmin(input: {
  ticketId: string;
  status?: string;
  priority?: string;
  assignedAdminUserId?: string | null;
  closeReason?: string;
}) {
  await ensureSupportSchema();
  const admin = await requireAdmin();

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      status: true,
      priority: true,
      assignedAdminUserId: true,
      firstResponseAt: true,
      lastResponseAt: true,
      resolvedAt: true,
      closedAt: true,
      closeReason: true,
    },
  });

  if (!ticket) throw new Error("Talep bulunamadı.");

  const nextStatus =
    typeof input.status === "string" && input.status.trim().length > 0
      ? input.status.trim()
      : ticket.status;
  const nextPriority =
    typeof input.priority === "string" && input.priority.trim().length > 0
      ? input.priority.trim()
      : ticket.priority;
  const nextAssignedAdminUserId =
    input.assignedAdminUserId === "" ? null : input.assignedAdminUserId ?? ticket.assignedAdminUserId;
  const nextCloseReason = input.closeReason?.trim() || null;

  if (!isSupportStatus(nextStatus)) {
    throw new Error("Geçersiz destek talebi durumu.");
  }
  if (!isSupportPriority(nextPriority)) {
    throw new Error("Geçersiz öncelik değeri.");
  }

  assertStatusTransition(ticket.status, nextStatus);

  await prisma.supportTicket.update({
    where: { id: input.ticketId },
    data: {
      status: nextStatus,
      priority: nextPriority,
      assignedAdminUserId: nextAssignedAdminUserId,
      resolvedAt: nextStatus === "resolved" ? new Date() : nextStatus === "open" ? null : ticket.resolvedAt,
      closedAt: nextStatus === "closed" ? new Date() : nextStatus === "open" ? null : ticket.closedAt,
      closeReason: nextStatus === "closed" ? nextCloseReason : nextStatus === "open" ? null : ticket.closeReason,
    },
  });

  if (ticket.status !== nextStatus) {
    await createSupportAuditLog({
      ticketId: input.ticketId,
      actorUserId: admin.id,
      action: "status_changed",
      fromStatus: ticket.status,
      toStatus: nextStatus,
      details: nextCloseReason ? JSON.stringify({ closeReason: nextCloseReason }) : null,
    });
  }

  if (ticket.priority !== nextPriority) {
    await createSupportAuditLog({
      ticketId: input.ticketId,
      actorUserId: admin.id,
      action: "priority_changed",
      details: JSON.stringify({ from: ticket.priority, to: nextPriority }),
    });
  }

  if (ticket.assignedAdminUserId !== nextAssignedAdminUserId) {
    await createSupportAuditLog({
      ticketId: input.ticketId,
      actorUserId: admin.id,
      action: "assigned_admin_changed",
      details: JSON.stringify({ from: ticket.assignedAdminUserId, to: nextAssignedAdminUserId }),
    });
  }

  await createSystemLog({
    level: "info",
    category: "support",
    message: "Destek talebi admin tarafından güncellendi",
    userId: admin.id,
    details: JSON.stringify({
      ticketId: input.ticketId,
      status: nextStatus,
      priority: nextPriority,
      assignedAdminUserId: nextAssignedAdminUserId,
    }),
  });

  revalidateSupportSurfaces();
}

export async function addSupportTicketInternalNote(ticketId: string, body: string) {
  await ensureSupportSchema();
  const admin = await requireAdmin();
  const note = body.trim();
  if (!note) throw new Error("İç not boş olamaz.");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!ticket) throw new Error("Talep bulunamadı.");

  await prisma.supportTicketNote.create({
    data: {
      ticketId,
      authorUserId: admin.id,
      body: note,
    },
  });

  await createSupportAuditLog({
    ticketId,
    actorUserId: admin.id,
    action: "internal_note_added",
  });
  await createSystemLog({
    level: "info",
    category: "support",
    message: "Destek talebine iç not eklendi",
    userId: admin.id,
    details: JSON.stringify({ ticketId }),
  });

  revalidateSupportSurfaces();
}

export async function replyToSupportTicketAsAdmin(ticketId: string, body: string) {
  await ensureSupportSchema();
  const admin = await requireAdmin();
  const message = body.trim();
  if (!message) throw new Error("Mesaj boş olamaz.");

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      status: true,
      assignedAdminUserId: true,
      firstResponseAt: true,
    },
  });
  if (!ticket) throw new Error("Talep bulunamadı.");
  if (ticket.status === "closed") {
    throw new Error("Kapalı talebe admin yanıtı eklenemez. Önce yeniden açın.");
  }

  const nextStatus = "waiting_user";
  assertStatusTransition(ticket.status, nextStatus);
  const now = new Date();

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: nextStatus,
      assignedAdminUserId: ticket.assignedAdminUserId ?? admin.id,
      firstResponseAt: ticket.firstResponseAt ?? now,
      lastResponseAt: now,
      closedAt: null,
      closeReason: null,
      messages: {
        create: {
          authorUserId: admin.id,
          body: message,
          isAdmin: true,
        },
      },
    },
  });

  await createSupportAuditLog({
    ticketId,
    actorUserId: admin.id,
    action: "admin_reply_added",
    fromStatus: ticket.status,
    toStatus: nextStatus,
  });
  await createSystemLog({
    level: "info",
    category: "support",
    message: "Destek talebine admin yanıtı gönderildi",
    userId: admin.id,
    details: JSON.stringify({ ticketId, nextStatus }),
  });

  revalidateSupportSurfaces();
}
