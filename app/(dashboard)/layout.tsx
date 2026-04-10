import { redirect } from "next/navigation";
import { DashboardShell, Sidebar, Topbar, AnnouncementBanner } from "@/components/layout";
import { PACKAGES, ROUTES } from "@/constants";
import type { Package as UserPackage } from "@/types";
import type { ReactNode } from "react";
import { getPublicSystemConfigFromDb } from "@/lib/system-settings";
import { normalizePackageName } from "@/lib/access/package-access";
import { getCurrentUserContext } from "@/lib/auth/current-user-role";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [{ user, role, dbUser }, publicConfig] = await Promise.all([
    getCurrentUserContext(),
    getPublicSystemConfigFromDb(),
  ]);

  if (!user) redirect(ROUTES.login);

  if (publicConfig.maintenanceMode && role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div
          className="max-w-lg w-full rounded-xl p-6"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h1
            className="text-xl font-bold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Sistem Bakımda
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {publicConfig.maintenanceMessage}
          </p>
        </div>
      </div>
    );
  }

  let packageName: string | null = null;
  let dbUserData = dbUser;

  if (role !== "admin" && role !== "org_admin") {
    if (!dbUserData?.onboardingCompleted) {
      redirect("/setup");
    }

    packageName = dbUserData?.package?.name ?? null;
  }

  const normalizedPackageName = normalizePackageName(dbUserData?.package?.name);
  const resolvedPackageName =
    normalizedPackageName === "unknown" ? "ucretsiz" : normalizedPackageName;
  const fallbackPackageMeta = PACKAGES[resolvedPackageName];
  const userName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  const resolvedPackage: UserPackage = dbUserData?.package
    ? {
        ...dbUserData.package,
        name: dbUserData.package.name,
      }
    : {
        id: "",
        name: resolvedPackageName,
        dailyAiLimit: fallbackPackageMeta.dailyAiLimit,
        price: fallbackPackageMeta.price,
      };

  return (
    <DashboardShell
      sidebar={
        <Sidebar
          packageName={packageName}
          moduleToggles={publicConfig.moduleToggles}
        />
      }
      banner={<AnnouncementBanner announcements={publicConfig.announcements} />}
      topbar={
        <Topbar
          user={{
            id: user.id,
            email: user.email ?? "",
            name: userName,
            role: (dbUserData?.role ?? role ?? "user") as "user" | "admin",
            packageId: dbUserData?.packageId ?? "",
            package: resolvedPackage,
            createdAt: dbUserData?.createdAt?.toISOString() ?? "",
          }}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
