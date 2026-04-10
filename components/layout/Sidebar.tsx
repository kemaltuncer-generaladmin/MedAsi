"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  BriefcaseMedical,
  Calculator,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircleMore,
  type LucideIcon,
  Settings,
  Sparkles,
  SquareStack,
  Stethoscope,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { useMobileSidebar } from "./MobileSidebarContext";
import {
  canAccessPathForPackage,
  getMinimumPackageTierForPath,
  isUserAppPath,
  normalizePackageName,
  type PackageAccessTier,
} from "@/lib/access/package-access";

type PlanLevel = "free" | "giris" | "pro" | "all";

function packageTierToPlanLevel(
  tier: PackageAccessTier | null,
): Exclude<PlanLevel, "all"> | null {
  if (!tier) return null;
  if (tier === "ucretsiz") return "free";
  if (tier === "giris") return "giris";
  return "pro";
}

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type Section = {
  heading: string;
  key: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

const sections: Section[] = [
  {
    heading: "Ana Alanlar",
    key: "core",
    defaultOpen: true,
    items: [
      { label: "Panel", href: "/dashboard", icon: LayoutDashboard },
      { label: "Gunluk Brifing", href: "/daily-briefing", icon: Sparkles },
      { label: "Odak Oturumu", href: "/pomodoro", icon: Calendar },
    ],
  },
  {
    heading: "Klinik",
    key: "clinical",
    items: [
      { label: "Vaka Coz", href: "/cases", icon: Stethoscope },
      { label: "AI Tani", href: "/ai-diagnosis", icon: Brain },
      { label: "Klinik Merkezi", href: "/clinic", icon: BriefcaseMedical },
      { label: "Hastalarim", href: "/my-patients", icon: Users },
      { label: "Lab ve Goruntuleme", href: "/lab-viewing", icon: FlaskConical },
    ],
  },
  {
    heading: "Calisma",
    key: "study",
    items: [
      { label: "Hatali Sorularim", href: "/questions/hatali", icon: FileText },
      { label: "Soru Bankasi", href: "/questions/bank", icon: HelpCircle },
      { label: "Flashcardlar", href: "/flashcards/flashcard", icon: Layers },
      { label: "Mentor AI", href: "/ai-assistant/mentor", icon: Brain, badge: "Yeni" },
      { label: "OSCE Prova", href: "/exams/osce", icon: GraduationCap },
      { label: "Akilli Planlayici", href: "/planners/akilli", icon: SquareStack },
    ],
  },
  {
    heading: "Topluluk",
    key: "community",
    items: [
      { label: "Topluluk Akisi", href: "/community", icon: MessageCircleMore, badge: "Yeni" },
      { label: "Mesajlar", href: "/community/messages", icon: Users },
    ],
  },
  {
    heading: "Kaynaklar",
    key: "library",
    items: [
      { label: "Kaynak Merkezi", href: "/materials", icon: FolderOpen },
      { label: "Notlarim", href: "/notes", icon: FileText },
      { label: "AI Notlarim", href: "/source/ai-notlar", icon: Sparkles },
      { label: "Akilli Asistan", href: "/source/akilli-asistan", icon: Brain },
    ],
  },
  {
    heading: "Araclar",
    key: "tools",
    items: [
      { label: "Tum Araclar", href: "/tools", icon: Wrench },
      { label: "Klinik Formuller", href: "/tools/clinical-formule", icon: Calculator },
      { label: "Skor Hesaplayici", href: "/tools/scores", icon: Activity },
      { label: "Soru Fabrikasi", href: "/questions/fabrika", icon: Sparkles },
      { label: "AI ile Ogren", href: "/flashcards/ai", icon: Brain },
    ],
  },
  {
    heading: "Hesap ve Sistem",
    key: "account",
    items: [
      { label: "Profil", href: "/account/profile", icon: Settings },
      { label: "Cuzdan", href: "/account/wallet", icon: CreditCard },
      { label: "Sistem", href: "/account/system", icon: Settings },
      { label: "Destek", href: "/account/support", icon: HelpCircle },
      { label: "AI Cuzdani", href: "/ai/wallet", icon: CreditCard },
      { label: "AI Gecmisi", href: "/ai/history", icon: Activity },
      { label: "Harcama Kontrolu", href: "/ai/control", icon: Activity },
      { label: "RAG Kutuphane", href: "/rag-admin", icon: FolderOpen },
      { label: "Paketi Yukselt", href: "/upgrade", icon: Sparkles },
    ],
  },
];

function requiredModuleForHref(href: string): string | null {
  if (href.startsWith("/clinic")) return "clinic";
  if (href.startsWith("/lab-viewing")) return "lab";
  if (href.startsWith("/ai-diagnosis")) return "ai-diagnosis";
  if (href.startsWith("/ai-assistant")) return "ai-assistant";
  if (href.startsWith("/case-rpg")) return "case-rpg";
  if (href.startsWith("/flashcards")) return "flashcards";
  if (href.startsWith("/exams")) return "exams";
  if (href.startsWith("/planners")) return "planners";
  if (href.startsWith("/pomodoro")) return "pomodoro";
  return null;
}

const PLAN_LABEL: Record<PlanLevel, string> = {
  free: "Ucretsiz",
  giris: "Giris",
  pro: "Pro",
  all: "",
};

const PACKAGE_LABEL: Record<ReturnType<typeof normalizePackageName>, string> = {
  ucretsiz: "Ucretsiz",
  giris: "Giris",
  pro: "Pro",
  kurumsal: "Kurumsal",
};

function buildInitialOpenState(pathname: string) {
  const initial: Record<string, boolean> = {};

  sections.forEach((section) => {
    const hasActiveItem = section.items.some((item) => {
      if (item.href === "/dashboard") return pathname === "/dashboard";
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });

    initial[section.key] = hasActiveItem || Boolean(section.defaultOpen);
  });

  return initial;
}

interface SidebarProps {
  packageName?: string | null;
  moduleToggles?: Record<string, boolean>;
  role?: string | null;
}

export function Sidebar({
  packageName,
  moduleToggles: initialModuleToggles = {},
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen: isMobileOpen, close: closeMobile } = useMobileSidebar();

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    buildInitialOpenState(pathname),
  );
  const [moduleToggles] = useState<Record<string, boolean>>(initialModuleToggles);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };

      sections.forEach((section) => {
        const hasActiveItem = section.items.some((item) =>
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`),
        );

        if (hasActiveItem) next[section.key] = true;
      });

      return next;
    });
  }, [pathname]);

  useEffect(() => {
    prefetchedRoutes.current.clear();
  }, [pathname]);

  const prefetchRoute = useCallback(
    (href: string) => {
      if (prefetchedRoutes.current.has(href)) return;
      prefetchedRoutes.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  const isModuleEnabled = useCallback(
    (href: string): boolean => {
      const mod = requiredModuleForHref(href);
      if (!mod) return true;
      return moduleToggles[mod] !== false;
    },
    [moduleToggles],
  );

  const isItemAllowed = useCallback(
    (item: NavItem): boolean => {
      if (item.href === "/rag-admin" && role !== "admin") {
        return false;
      }
      return !isUserAppPath(item.href) || canAccessPathForPackage(item.href, packageName);
    },
    [packageName, role],
  );

  useEffect(() => {
    const routesToPrefetch = sections
      .filter((section) => open[section.key])
      .flatMap((section) => section.items)
      .filter((item) => isModuleEnabled(item.href) && isItemAllowed(item))
      .map((item) => item.href)
      .slice(0, 10);

    if (routesToPrefetch.length === 0) return;

    const timeoutId = globalThis.setTimeout(() => {
      routesToPrefetch.forEach(prefetchRoute);
    }, 250);

    return () => globalThis.clearTimeout(timeoutId);
  }, [isItemAllowed, isModuleEnabled, open, prefetchRoute]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const displayPackage = packageName
    ? packageName.charAt(0).toUpperCase() + packageName.slice(1)
    : "Ucretsiz";
  const packageTier = normalizePackageName(packageName);
  const planColor =
    packageTier === "pro" || packageTier === "kurumsal"
      ? "var(--color-primary)"
      : packageTier === "giris"
        ? "#a78bfa"
        : "var(--color-text-secondary)";

  return (
    <>
      {isMobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden",
          "border-r border-[var(--color-border)] bg-[var(--color-surface)]",
          "transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--color-primary)" }}
            >
              <Activity size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">MEDASI</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">Calisma paneli</p>
            </div>
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] lg:hidden"
            onClick={closeMobile}
            aria-label="Menüyü kapat"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Paket
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{displayPackage}</p>
            <span
              className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                color: planColor,
              }}
            >
              {PACKAGE_LABEL[packageTier]}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: "thin" }}>
          <div className="space-y-4">
            {sections.map((section) => {
              const visibleItems = section.items.filter((item) => isModuleEnabled(item.href));
              if (visibleItems.length === 0) return null;

              const isSectionOpen = open[section.key];
              const hasActiveItem = visibleItems.some((item) => isActive(item.href));

              return (
                <section key={section.key}>
                  <button
                    type="button"
                    onClick={() => toggle(section.key)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--color-surface-elevated)]"
                  >
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                      style={{
                        color: hasActiveItem
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {section.heading}
                    </span>
                    <ChevronRight
                      size={14}
                      className="transition-transform"
                      style={{
                        color: "var(--color-text-secondary)",
                        transform: isSectionOpen ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {isSectionOpen ? (
                    <div className="mt-1 space-y-1">
                      {visibleItems.map((item) => {
                        const active = isActive(item.href);
                        const allowed = isItemAllowed(item);
                        const requiredPlan = packageTierToPlanLevel(
                          getMinimumPackageTierForPath(item.href),
                        );
                        const href = allowed ? item.href : "/upgrade";

                        return (
                          <Link
                            key={item.href}
                            href={href}
                            prefetch={allowed}
                            onMouseEnter={() => {
                              if (allowed) prefetchRoute(item.href);
                            }}
                            onFocus={() => {
                              if (allowed) prefetchRoute(item.href);
                            }}
                            onClick={() => closeMobile()}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
                            style={{
                              backgroundColor: active
                                ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                                : "transparent",
                              color: active
                                ? "var(--color-text-primary)"
                                : allowed
                                  ? "var(--color-text-secondary)"
                                  : "color-mix(in srgb, var(--color-text-secondary) 74%, transparent)",
                            }}
                          >
                            <item.icon
                              size={16}
                              className="shrink-0"
                              style={{
                                color: active
                                  ? "var(--color-primary)"
                                  : "currentColor",
                              }}
                            />

                            <span className="min-w-0 flex-1 truncate">{item.label}</span>

                            {allowed ? (
                              item.badge ? (
                                <span
                                  className="rounded-full px-2 py-1 text-[10px] font-semibold"
                                  style={{
                                    background:
                                      "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                                    color: "var(--color-warning)",
                                  }}
                                >
                                  {item.badge}
                                </span>
                              ) : null
                            ) : (
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase">
                                <Lock size={12} />
                                {requiredPlan ? PLAN_LABEL[requiredPlan] : "Kilitli"}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href="/account/profile"
            onClick={() => closeMobile()}
            className="mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-elevated)]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span>Hesap ayarlari</span>
            <Settings size={15} />
          </Link>

          <form
            action={async () => {
              setLogoutLoading(true);
              await logout();
            }}
          >
            <button
              type="submit"
              disabled={logoutLoading}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-surface-elevated)]"
              style={{
                color: "var(--color-text-secondary)",
                opacity: logoutLoading ? 0.7 : 1,
              }}
            >
              <LogOut size={15} />
              <span>{logoutLoading ? "Cikis yapiliyor..." : "Cikis Yap"}</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
