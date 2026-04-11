"use client";

import type { ReactNode } from "react";
import { MedicalAmbientDecor } from "./MedicalAmbientDecor";
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
      <div className="relative flex min-h-screen bg-[var(--color-background)] overflow-hidden">
        <MedicalAmbientDecor variant="dashboard" className="z-0" />
        {sidebar}
        <div className="pointer-events-none absolute inset-0 medasi-grid-bg opacity-40" />
        <div className="relative z-10 flex min-h-screen flex-1 min-w-0 flex-col overflow-hidden lg:ml-[var(--sidebar-width)]">
          {topbar}
          {banner}

          <main
            className="medasi-scrollbar flex-1 overflow-y-auto"
            style={{ marginTop: "var(--topbar-height)" }}
          >
            <div className="mx-auto w-full max-w-[var(--content-max-width)] px-4 pb-10 pt-5 md:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
