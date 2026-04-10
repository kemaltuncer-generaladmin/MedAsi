"use client";

import Link from "next/link";
import { Bell, Settings, Menu } from "lucide-react";
import type { User } from "@/types";
import { useMobileSidebar } from "./MobileSidebarContext";

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

  return (
    <header className="h-topbar border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 lg:left-sidebar right-0 z-40">
      <div className="flex items-center gap-2">
        {/* Hamburger — sadece mobile/tablet */}
        <button
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-150 mr-1"
          aria-label="Menüyü aç"
          onClick={toggle}
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
          {greeting},
        </h1>
        <span className="text-base font-semibold text-[var(--color-primary)] hidden sm:inline">
          {user?.name || "Kullanıcı"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-150 relative"
          aria-label="Bildirimler"
        >
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-[var(--color-surface)]"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </button>

        <Link
          href="/dashboard/account/system"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-150"
          aria-label="Ayarlar"
        >
          <Settings size={18} />
        </Link>

        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-pointer hover:opacity-85 transition-opacity"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
          }}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
