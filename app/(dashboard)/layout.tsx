import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell, Sidebar, Topbar, AnnouncementBanner } from "@/components/layout";
import { ROUTES } from "@/constants";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsFromDb, getAnnouncementsFromDb } from "@/lib/system-settings";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(ROUTES.login);

  const [settings, allAnnouncements] = await Promise.all([
    getSystemSettingsFromDb(),
    getAnnouncementsFromDb(),
  ]);
  const activeAnnouncements = allAnnouncements.filter((a) => a.active);
  const role = user.user_metadata?.role as string | undefined;
  if (settings.maintenanceMode && role !== "admin") {
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
            {settings.maintenanceMessage}
          </p>
        </div>
      </div>
    );
  }

  let packageName: string | null = null;
  let dbUserData: {
    id: string;
    role: string;
    packageId: string | null;
    createdAt: Date;
    package: { id: string; name: string; dailyAiLimit: number; price: number } | null;
  } | null = null;

  if (role !== "admin" && role !== "org_admin") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        packageId: true,
        createdAt: true,
        onboardingCompleted: true,
        package: { select: { id: true, name: true, dailyAiLimit: true, price: true } },
      },
    });

    if (!dbUser?.onboardingCompleted) {
      redirect("/setup");
    }

    packageName = dbUser?.package?.name ?? null;
    dbUserData = dbUser ?? null;
  }

  return (
    <DashboardShell
      sidebar={<Sidebar packageName={packageName} />}
      banner={<AnnouncementBanner announcements={activeAnnouncements} />}
      topbar={
        <Topbar
          user={{
            id: user.id,
            email: user.email ?? "",
            name: user.user_metadata?.name ?? null,
            role: (dbUserData?.role ?? role ?? "user") as "user" | "admin",
            packageId: dbUserData?.packageId ?? "",
            package: dbUserData?.package ?? { id: "", name: "student", dailyAiLimit: 10, price: 0 },
            createdAt: dbUserData?.createdAt?.toISOString() ?? "",
          }}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
