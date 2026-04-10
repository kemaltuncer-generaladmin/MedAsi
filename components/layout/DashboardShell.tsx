"use client";

import type { ReactNode } from "react";
import { MobileSidebarProvider } from "./MobileSidebarContext";

interface DashboardShellProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  sidebar,
  topbar,
  banner,
  children,
}: DashboardShellProps) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
        {sidebar}

        {/* Main content: on mobile no left margin (sidebar overlays), on lg use sidebar width */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:ml-[var(--sidebar-width)]">
          {topbar}
          {banner}

          <main
            className="flex-1 overflow-y-auto"
            style={{ marginTop: "var(--topbar-height)" }}
          >
            <div className="p-4 md:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
