import { prisma } from "@/lib/prisma";

export type SystemLogLevel = "info" | "warn" | "error" | "success";
export type SystemLogCategory =
  | "auth"
  | "user"
  | "ai"
  | "system"
  | "payment"
  | "billing"
  | "admin"
  | "materials";

export interface CreateSystemLogInput {
  level: SystemLogLevel;
  category: SystemLogCategory;
  message: string;
  details?: string;
  userId?: string;
}

export interface SystemLogQuery {
  level?: SystemLogLevel | "all";
  category?: SystemLogCategory | "all";
  dateRange?: "today" | "7d" | "30d" | "all";
  search?: string;
  take?: number;
}

function dateRangeToGte(range: SystemLogQuery["dateRange"]): Date | undefined {
  const now = Date.now();
  if (range === "today") return new Date(now - 86_400_000);
  if (range === "7d") return new Date(now - 7 * 86_400_000);
  if (range === "30d") return new Date(now - 30 * 86_400_000);
  return undefined;
}

export async function createSystemLog(input: CreateSystemLogInput) {
  try {
    await prisma.systemLog.create({ data: input });
  } catch (error) {
    // Log write failures should never break the request path.
    console.error("System log write failed:", error);
  }
}

export async function querySystemLogs(query: SystemLogQuery = {}) {
  const take = Math.min(Math.max(query.take ?? 500, 1), 2000);
  const gte = dateRangeToGte(query.dateRange ?? "all");

  const logs = await prisma.systemLog.findMany({
    where: {
      ...(query.level && query.level !== "all" ? { level: query.level } : {}),
      ...(query.category && query.category !== "all"
        ? { category: query.category }
        : {}),
      ...(gte ? { createdAt: { gte } } : {}),
      ...(query.search
        ? {
            OR: [
              { message: { contains: query.search, mode: "insensitive" } },
              { details: { contains: query.search, mode: "insensitive" } },
              { userId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return logs;
}

export async function clearSystemLogs() {
  await prisma.systemLog.deleteMany({});
}
