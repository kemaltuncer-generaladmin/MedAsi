import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { ensureUsageTrackingSchema } from "@/lib/db/schema-guard";

const MODULE_PREFIXES: Array<{ prefix: string; module: string }> = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/account/support", module: "support" },
  { prefix: "/account", module: "account" },
  { prefix: "/ai-assistant/mentor", module: "ai_mentor" },
  { prefix: "/ai-assistant", module: "ai_assistant" },
  { prefix: "/ai-diagnosis", module: "ai_diagnosis" },
  { prefix: "/ai", module: "ai" },
  { prefix: "/questions", module: "questions" },
  { prefix: "/flashcards", module: "flashcards" },
  { prefix: "/materials", module: "materials" },
  { prefix: "/source", module: "source" },
  { prefix: "/clinic", module: "clinic" },
  { prefix: "/my-patients", module: "clinic" },
  { prefix: "/planners", module: "planners" },
  { prefix: "/pomodoro", module: "pomodoro" },
  { prefix: "/daily-briefing", module: "daily_briefing" },
  { prefix: "/community", module: "community" },
  { prefix: "/org-admin", module: "org_admin" },
];

export function resolveModuleKeyFromPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const matched = MODULE_PREFIXES.find(
    ({ prefix }) =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
  if (matched) return matched.module;

  const firstSegment = normalizedPath.split("/").filter(Boolean)[0];
  return firstSegment || "unknown";
}

export async function trackModuleActivity(input: {
  userId: string;
  path: string;
  action?: string;
  module?: string;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureUsageTrackingSchema();
  const module = input.module?.trim() || resolveModuleKeyFromPath(input.path);
  const action = input.action?.trim() || "page_view";

  await prisma.moduleActivity.create({
    data: {
      userId: input.userId,
      module,
      action,
      path: input.path,
      metadata:
        input.metadata == null
          ? undefined
          : (input.metadata as Prisma.InputJsonValue),
    },
  });

  await createSystemLog({
    level: "info",
    category: "usage",
    message: "MODULE_ACTIVITY_EVENT",
    userId: input.userId,
    details: JSON.stringify({
      module,
      action,
      path: input.path,
      metadata: input.metadata ?? null,
      loggedAt: new Date().toISOString(),
    }),
  });
}
