"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Brain,
  BarChart3,
  LogOut,
  FlaskConical,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

const navItems = [
  {
    href: "/org-admin",
    icon: LayoutDashboard,
    label: "Genel Bakış",
    exact: true,
  },
  { href: "/org-admin/members", icon: Users, label: "Araştırmacılar" },
  { href: "/org-admin/usage", icon: Brain, label: "AI Kullanımı" },
  { href: "/org-admin/reports", icon: BarChart3, label: "Raporlar" },
];

export function OrgAdminSidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 h-screen sticky top-0 flex-shrink-0 flex flex-col"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center gap-2.5 px-5 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <FlaskConical size={18} style={{ color: "var(--color-primary)" }} />
        <div className="min-w-0">
          <p
            className="text-sm font-bold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {orgName}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Araştırma Paneli
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
              style={{
                color: isActive
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                  : "transparent",
              }}
            >
              <item.icon
                size={15}
                style={{
                  color: isActive ? "var(--color-primary)" : "currentColor",
                }}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        className="p-3 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <LogOut size={15} />
            Çıkış Yap
          </button>
        </form>
      </div>
    </aside>
  );
}
