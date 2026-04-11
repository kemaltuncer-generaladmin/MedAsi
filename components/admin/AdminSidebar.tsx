"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  BrainCircuit,
  DollarSign,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageSquare,
  Package,
  Puzzle,
  Search,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", icon: LayoutDashboard, label: "Platform Özeti" }],
  },
  {
    label: "Users & Access",
    items: [
      { href: "/admin/users", icon: Users, label: "Kullanıcılar" },
      { href: "/admin/packages", icon: Package, label: "Paketler" },
      { href: "/admin/coupons", icon: Tag, label: "Kuponlar" },
    ],
  },
  {
    label: "Content & Community",
    items: [
      { href: "/admin/content", icon: BookOpen, label: "Soru & Flashcard Havuzu" },
      { href: "/admin/community", icon: MessageSquare, label: "Topluluk Merkezi" },
      { href: "/admin/announcements", icon: Megaphone, label: "Duyurular" },
    ],
  },
  {
    label: "AI & Cost",
    items: [
      { href: "/admin/ai/control", icon: BrainCircuit, label: "AI Kontrol" },
      { href: "/admin/ai/costs", icon: DollarSign, label: "AI Maliyetleri" },
    ],
  },
  {
    label: "Platform & Modules",
    items: [
      { href: "/admin/modules", icon: Puzzle, label: "Modüller" },
      { href: "/admin/organizations", icon: FlaskConical, label: "Araştırma Org." },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", icon: Settings, label: "Sistem Ayarları" },
      { href: "/admin/support", icon: LifeBuoy, label: "Destek Talepleri" },
      { href: "/admin/logs", icon: FileText, label: "Aktivite Günlüğü" },
      { href: "/admin/analytics", icon: BarChart2, label: "Analizler" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredGroups = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return navGroups;

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(normalized)),
      }))
      .filter((group) => group.items.length > 0);
  }, [deferredQuery]);

  const activeItem = useMemo(() => {
    const allItems = navGroups.flatMap((group) => group.items);
    return allItems.find((item) =>
      item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href),
    );
  }, [pathname]);

  return (
    <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-width)] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
      <div className="border-b border-[var(--color-border)] px-5 py-5">
        <div className="glass-panel rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]">
              <BrainCircuit size={18} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-disabled)]">
                MEDASI
              </p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Admin Command</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-black/10 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
              Aktif Ekran
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {activeItem?.label ?? "Admin"}
              </p>
              <ArrowUpRight size={14} className="text-[var(--color-primary)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Komut veya sayfa ara..."
            className="w-full rounded-2xl border border-[var(--color-border)] bg-white/5 py-3 pl-9 pr-3 text-sm outline-none transition-colors"
          />
        </div>
      </div>

      <nav className="medasi-scrollbar flex-1 overflow-y-auto px-4 py-4">
        {filteredGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
            <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-disabled)]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mx-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    backgroundColor: isActive
                      ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                      : "transparent",
                    border: isActive
                      ? "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)"
                      : "1px solid transparent",
                  }}
                >
                  <item.icon
                    size={16}
                    style={{
                      color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="px-4 py-6 text-sm text-[var(--color-text-secondary)]">
            Aramanızla eşleşen admin sayfası bulunamadı.
          </div>
        )}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <Link
          href="/dashboard"
          className="mb-2 flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-elevated)]"
        >
          <ArrowLeft size={16} />
          Kullanıcı paneline dön
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-elevated)]"
          >
            <LogOut size={16} />
            Oturumu kapat
          </button>
        </form>
      </div>
    </aside>
  );
}
