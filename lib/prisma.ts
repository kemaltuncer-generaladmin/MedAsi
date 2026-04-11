import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();

  if (
    databaseUrl &&
    !databaseUrl.includes("[YOUR-PASSWORD]") &&
    !databaseUrl.includes("YOUR_PASSWORD")
  ) {
    return databaseUrl;
  }

  if (directUrl) {
    return directUrl;
  }

  return databaseUrl;
}

const resolvedDatabaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    resolvedDatabaseUrl
      ? {
          datasources: {
            db: {
              url: resolvedDatabaseUrl,
            },
          },
        }
      : undefined,
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
