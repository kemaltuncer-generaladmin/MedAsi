"use client";

import Link from "next/link";
import { Bell, Command, Menu, Search, Sparkles, Stethoscope } from "lucide-react";
import type { User } from "@/types";
import { useMobileSidebar } from "./MobileSidebarContext";
import { ThemeToggle } from "./ThemeToggle";

interface TopbarProps {
  user?: User | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export function Topbar({ user }: TopbarProps) {
  const greeting = getGreeting();
  const initial = user?.name?.charAt(0).toUpperCase() || "D";
  const { toggle } = useMobileSidebar();
  const packageLabel = (user?.package?.name ?? "ucretsiz").replace(/_/g, " ");
  const roleLabel = user?.role === "admin" ? "Admin" : "Learner";

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[var(--topbar-height)] items-center px-4 md:px-6 lg:left-[var(--sidebar-width)] lg:px-8">
      <div className="glass-panel flex w-full items-center justify-between rounded-3xl px-3 py-2.5 md:px-5 md:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-3">
          <button
            className="mr-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-text-secondary)] transition-all duration-150 hover:bg-white/5 hover:text-[var(--color-text-primary)] lg:hidden"
            aria-label="Menüyü aç"
            onClick={toggle}
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0 shrink-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-disabled)]">
              {greeting}
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h1 className="max-w-[160px] truncate text-base font-semibold text-[var(--color-text-primary)] md:max-w-[220px] md:text-lg">
                {user?.name || "Kullanıcı"}
              </h1>
              <span className="hidden rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] sm:inline-flex">
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="hidden h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 text-left text-sm transition-all duration-150 hover:border-[var(--color-border-strong)] hover:bg-white/10 md:flex md:max-w-[420px]"
            aria-label="Global arama"
          >
            <Search size={16} className="text-[var(--color-text-secondary)]" />
            <span className="flex-1 text-sm text-[var(--color-text-secondary)]">
              Modül, hasta, not veya admin araması
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text-disabled)]">
              <Command size={12} />
              K
            </span>
          </button>
        </div>

        <div className="ml-2 flex items-center gap-2 md:gap-2.5">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/5 text-[var(--color-text-secondary)] md:hidden"
            aria-label="Arama"
          >
            <Search size={18} />
          </button>

          <div className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/5 px-3 xl:flex">
            <Stethoscope size={15} className="text-[var(--color-primary)]" />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-disabled)]">
                Aktif Paket
              </p>
              <p className="text-xs font-semibold capitalize text-[var(--color-text-primary)]">{packageLabel}</p>
            </div>
          </div>

          <div className="hidden h-7 w-px bg-[var(--color-border-subtle)] lg:block" />

          <Link
            href="/ai-assistant"
            className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 text-sm font-medium text-[var(--color-text-primary)] transition-all duration-150 hover:-translate-y-[1px] hover:border-[var(--color-primary)] lg:inline-flex"
          >
            <Sparkles size={15} className="text-[var(--color-primary)]" />
            Hızlı AI
          </Link>

          <ThemeToggle />

          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/5 text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            aria-label="Bildirimler"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)]" />
          </button>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 font-bold text-sm text-[var(--color-text-inverse)]"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
            }}
            title={user?.name || "Kullanıcı"}
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
