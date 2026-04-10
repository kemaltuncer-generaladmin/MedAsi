"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMobileSidebar } from "./MobileSidebarContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Hospital,
  Users,
  FlaskConical,
  Stethoscope,
  Pill,
  LogOut as Discharge,
  FileText,
  Bot,
  Wrench,
  Calculator,
  Activity,
  Presentation,
  Book,
  Video,
  Mic,
  Brain,
  Lightbulb,
  GraduationCap,
  ClipboardCheck,
  MessageSquare,
  Calendar,
  Route,
  Layers,
  HelpCircle,
  CreditCard,
  Settings,
  Star,
  LogOut,
  ChevronRight,
  Sparkles,
  BarChart3,
  Database,
  Lock,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import {
  canAccessPathForPackage,
  getMinimumPackageTierForPath,
  isUserAppPath,
  normalizePackageName,
  type PackageAccessTier,
} from "@/lib/access/package-access";

// ── Plan seviyeleri ─────────────────────────────────────────────────────────
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

// ── Navigasyon yapısı ───────────────────────────────────────────────────────
const sections: Section[] = [
  {
    heading: "GENEL",
    key: "general",
    defaultOpen: true,
    items: [{ label: "Ana Panel", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "KLİNİK",
    key: "clinic",
    defaultOpen: true,
    items: [
      { label: "Klinik Merkezi", href: "/clinic", icon: Hospital },
      { label: "Hastalarım", href: "/my-patients", icon: Users },
      { label: "Lab & Görüntüleme", href: "/lab-viewing", icon: FlaskConical },
      { label: "Servis Takip", href: "/clinic/service", icon: Activity },
      { label: "Reçetelerim", href: "/clinic/receipt", icon: Pill },
      { label: "Taburcu İşlemleri", href: "/clinic/discharged", icon: Discharge },
      { label: "Klinik Notlarım", href: "/clinic/clinical-notes", icon: FileText },
      { label: "AI Asistanım", href: "/clinic/ai-assistan", icon: Bot },
    ],
  },
  {
    heading: "ARAÇLAR",
    key: "tools",
    defaultOpen: false,
    items: [
      { label: "Araçlar", href: "/tools", icon: Wrench },
      { label: "Klinik Formüller", href: "/tools/clinical-formule", icon: Calculator },
      { label: "Skor Hesaplayıcı", href: "/tools/scores", icon: Stethoscope },
      { label: "Mentor AI", href: "/ai-assistant/mentor", icon: Brain, badge: "YENİ" },
    ],
  },
  {
    heading: "KAYNAKLAR",
    key: "source",
    defaultOpen: false,
    items: [
      { label: "Materyallerim", href: "/materials", icon: Layers },
      { label: "Slaytlar", href: "/source/slides", icon: Presentation },
      { label: "Ders Notlarım", href: "/source/ders-notlari", icon: Book },
      { label: "Textbooklar", href: "/source/textbooks", icon: Book },
      { label: "Videolar", href: "/source/videos", icon: Video },
      { label: "Ses Kayıtları", href: "/source/ses-kaydi", icon: Mic },
      { label: "AI Notlarım", href: "/source/ai-notlar", icon: Sparkles },
      { label: "Akıllı Asistan", href: "/source/akilli-asistan", icon: Brain },
    ],
  },
  {
    heading: "SINAVLAR",
    key: "exams",
    defaultOpen: false,
    items: [
      { label: "OSCE Provam", href: "/exams/osce", icon: ClipboardCheck },
      { label: "Sözlü Sınav", href: "/exams/sozlu", icon: MessageSquare },
      { label: "Kuramsal Sınav", href: "/exams/kuramsal", icon: GraduationCap },
      { label: "Zilli Sınavlar", href: "/exams/zilli", icon: Layers },
    ],
  },
  {
    heading: "PLANLAYICILAR",
    key: "planners",
    defaultOpen: false,
    items: [
      { label: "Ders Takvimi", href: "/planners/ders", icon: Calendar },
      { label: "Akıllı Planlayıcı", href: "/planners/akilli", icon: Sparkles },
      { label: "TUS Planlama", href: "/planners/tus", icon: Route },
      { label: "İntörn Planlayıcı", href: "/planners/intern", icon: Calendar },
      { label: "Staj Planlayıcı", href: "/planners/staj", icon: Calendar },
      { label: "Preklinik", href: "/planners/preklinik", icon: Calendar },
    ],
  },
  {
    heading: "SORU MODÜLÜ",
    key: "questions",
    defaultOpen: false,
    items: [
      { label: "Soru Bankası", href: "/questions/bank", icon: HelpCircle },
      { label: "Hatalı Sorularım", href: "/questions/hatali", icon: FileText },
      { label: "AI ile Geliştir", href: "/questions/ai", icon: Brain },
      { label: "Soru Fabrikası", href: "/questions/fabrika", icon: Sparkles },
    ],
  },
  {
    heading: "FLASHCARD",
    key: "flashcards",
    defaultOpen: false,
    items: [
      { label: "Flashcard Modülü", href: "/flashcards/flashcard", icon: Layers },
      { label: "Spot Notlar", href: "/flashcards/spot-notlar", icon: Lightbulb },
      { label: "AI ile Öğren", href: "/flashcards/ai", icon: Sparkles },
    ],
  },
  {
    heading: "AI YÖNETİM",
    key: "ai",
    defaultOpen: false,
    items: [
      { label: "Token Cüzdanı", href: "/ai/wallet", icon: CreditCard },
      { label: "Token Geçmişim", href: "/ai/history", icon: BarChart3 },
      { label: "Harcama Kontrolü", href: "/ai/control", icon: Activity },
      { label: "RAG Kütüphane", href: "/rag-admin", icon: Database },
    ],
  },
  {
    heading: "HESABIM",
    key: "account",
    defaultOpen: false,
    items: [
      { label: "Profil Ayarlarım", href: "/account/profile", icon: Settings },
      { label: "Cüzdan", href: "/account/wallet", icon: CreditCard },
      { label: "Sistem Ayarları", href: "/account/system", icon: Settings },
      { label: "Paket Yükselt", href: "/upgrade", icon: Star },
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
  free: "Ücretsiz",
  giris: "Giriş",
  pro: "Pro",
  all: "",
};

// ── Animated collapse ───────────────────────────────────────────────────────
function CollapsePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(open ? "auto" : 0);
  const [display, setDisplay] = useState(open ? "block" : "none");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      setDisplay("block");
      // Measure then animate to full height
      const scrollH = el.scrollHeight;
      setHeight(scrollH);
      const timer = setTimeout(() => setHeight("auto"), 220);
      return () => clearTimeout(timer);
    } else {
      // Animate from current height to 0
      const scrollH = el.scrollHeight;
      setHeight(scrollH);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0);
        });
      });
      const timer = setTimeout(() => setDisplay("none"), 220);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        height: height === "auto" ? undefined : height,
        overflow: "hidden",
        transition: "height 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        display,
      }}
    >
      {children}
    </div>
  );
}

// ── Bileşen ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  packageName?: string | null;
  moduleToggles?: Record<string, boolean>;
}

export function Sidebar({ packageName, moduleToggles: initialModuleToggles = {} }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen: isMobileOpen, close: closeMobile } = useMobileSidebar();

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s) => { init[s.key] = s.defaultOpen ?? false; });
    return init;
  });

  const [moduleToggles] = useState<Record<string, boolean>>(initialModuleToggles);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  useEffect(() => {
    prefetchedRoutes.current.clear();
  }, [pathname]);

  const prefetchRoute = useCallback((href: string) => {
    if (prefetchedRoutes.current.has(href)) return;
    prefetchedRoutes.current.add(href);
    router.prefetch(href);
  }, [router]);

  const isModuleEnabled = useCallback((href: string): boolean => {
    const mod = requiredModuleForHref(href);
    if (!mod) return true;
    return moduleToggles[mod] !== false;
  }, [moduleToggles]);

  const isItemAllowed = useCallback((item: NavItem): boolean => {
    return !isUserAppPath(item.href) || canAccessPathForPackage(item.href, packageName);
  }, [packageName]);

  useEffect(() => {
    const routesToPrefetch = sections
      .filter((section) => open[section.key])
      .flatMap((section) => section.items)
      .filter((item) => isModuleEnabled(item.href) && isItemAllowed(item))
      .map((item) => item.href)
      .slice(0, 12);

    if (routesToPrefetch.length === 0) return;

    const runner = () => routesToPrefetch.forEach(prefetchRoute);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(runner, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(runner, 250);
    return () => globalThis.clearTimeout(timeoutId);
  }, [isItemAllowed, isModuleEnabled, open, prefetchRoute]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const displayPackage = packageName
    ? packageName.charAt(0).toUpperCase() + packageName.slice(1)
    : "Ücretsiz";
  const packageTier = normalizePackageName(packageName);
  const planColor =
    packageTier === "pro" || packageTier === "kurumsal"
      ? "var(--color-primary)"
      : packageTier === "giris"
      ? "#a78bfa"
      : "var(--color-text-secondary)";

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

    <aside
      className={[
        "fixed left-0 top-0 h-screen w-[260px] flex flex-col overflow-hidden z-50",
        "transition-transform duration-300 ease-in-out",
        // Mobile: hidden by default, visible when open; desktop: always visible
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      style={{
        background:
          "linear-gradient(180deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 96%, var(--color-primary)) 100%)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="h-16 flex items-center justify-between px-5 shrink-0 relative overflow-hidden"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Subtle glow behind logo */}
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 30%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          {/* Icon mark */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary, #6366f1))",
              boxShadow: "0 0 12px color-mix(in srgb, var(--color-primary) 50%, transparent)",
            }}
          >
            <Activity size={15} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wider">
            MED<span style={{ color: "var(--color-primary)" }}>ASİ</span>
          </span>
        </div>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-white hover:bg-white/10 transition-all"
          onClick={closeMobile}
          aria-label="Menüyü kapat"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        {sections.map((section) => {
          const isOpen = open[section.key];
          const hasActive = section.items.some((i) => isActive(i.href));

          return (
            <div key={section.key} className="mb-0.5">
              {/* Section header */}
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg group"
                style={{ transition: "background 150ms" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "color-mix(in srgb, var(--color-primary) 6%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span
                  className="text-[9px] font-bold tracking-[0.12em] uppercase"
                  style={{
                    color: hasActive
                      ? "var(--color-primary)"
                      : "var(--color-text-secondary)",
                    transition: "color 200ms",
                  }}
                >
                  {section.heading}
                </span>
                <div
                  className="w-4 h-4 rounded flex items-center justify-center"
                  style={{
                    background: hasActive
                      ? "color-mix(in srgb, var(--color-primary) 15%, transparent)"
                      : "transparent",
                    transition: "background 200ms",
                  }}
                >
                  <ChevronRight
                    size={10}
                    style={{
                      color: hasActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms",
                    }}
                  />
                </div>
              </button>

              {/* Animated items */}
              <CollapsePanel open={isOpen}>
                <div className="pt-0.5 pb-1 space-y-0.5">
                  {section.items
                    .filter((item) => isModuleEnabled(item.href))
                    .map((item) => {
                      const active = isActive(item.href);
                      const allowed = isItemAllowed(item);
                      const requiredPlan = packageTierToPlanLevel(
                        getMinimumPackageTierForPath(item.href),
                      );

                      if (!allowed) {
                        return (
                          <Link
                            key={item.href}
                            href="/upgrade"
                            className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium"
                            style={{
                              opacity: 0.38,
                              transition: "opacity 150ms",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity = "0.55";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity = "0.38";
                            }}
                          >
                            <item.icon
                              size={14}
                              className="shrink-0"
                              style={{ color: "var(--color-text-secondary)" }}
                            />
                            <span
                              className="truncate flex-1"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              {item.label}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <span
                                className="text-[8px] px-1 py-0.5 rounded font-bold uppercase"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                                  color: "var(--color-warning)",
                                }}
                              >
                                {requiredPlan ? PLAN_LABEL[requiredPlan] : "Kilitli"}
                              </span>
                              <Lock size={9} style={{ color: "var(--color-text-secondary)" }} />
                            </span>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch
                          className="relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium group"
                          style={{
                            background: active
                              ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
                              : "transparent",
                            color: active
                              ? "var(--color-primary)"
                              : "var(--color-text-secondary)",
                            transition: "background 150ms, color 150ms",
                          }}
                          onMouseEnter={(e) => {
                            prefetchRoute(item.href);
                            if (!active) {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background =
                                "color-mix(in srgb, var(--color-primary) 7%, transparent)";
                              el.style.color = "var(--color-text-primary)";
                            }
                          }}
                          onFocus={() => prefetchRoute(item.href)}
                          onMouseLeave={(e) => {
                            if (!active) {
                              const el = e.currentTarget as HTMLElement;
                              el.style.background = "transparent";
                              el.style.color = "var(--color-text-secondary)";
                            }
                          }}
                        >
                          {/* Active indicator bar */}
                          {active && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
                              style={{
                                background: "var(--color-primary)",
                                boxShadow: "0 0 6px var(--color-primary)",
                              }}
                            />
                          )}

                          <item.icon
                            size={14}
                            className="shrink-0"
                            style={{
                              color: active
                                ? "var(--color-primary)"
                                : "currentColor",
                              filter: active
                                ? "drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 60%, transparent))"
                                : "none",
                              transition: "filter 200ms",
                            }}
                          />
                          <span className="truncate flex-1">{item.label}</span>

                          {item.badge && (
                            <span
                              className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--color-warning) 18%, transparent)",
                                color: "var(--color-warning)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                </div>
              </CollapsePanel>

              {/* Separator between sections */}
              <div
                className="mx-2 mt-1"
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, var(--color-border), transparent)",
                }}
              />
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-2"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)",
          }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-secondary, #6366f1))",
              boxShadow:
                "0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent)",
            }}
          >
            {displayPackage.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[12px] font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              Kullanıcı
            </p>
            <p
              className="text-[10px] font-medium truncate"
              style={{ color: planColor }}
            >
              {displayPackage} Paketi
            </p>
          </div>
          <Link
            href="/account/profile"
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--color-primary) 10%, transparent)",
              color: "var(--color-text-secondary)",
              transition: "background 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--color-primary) 20%, transparent)";
              el.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background =
                "color-mix(in srgb, var(--color-primary) 10%, transparent)";
              el.style.color = "var(--color-text-secondary)";
            }}
          >
            <Settings size={11} />
          </Link>
        </div>

        {/* Logout */}
        <form
          action={async () => {
            setLogoutLoading(true);
            await logout();
          }}
        >
          <button
            type="submit"
            disabled={logoutLoading}
            className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium"
            style={{
              color: "var(--color-text-secondary)",
              transition: "background 150ms, color 150ms",
              opacity: logoutLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!logoutLoading) {
                const el = e.currentTarget as HTMLElement;
                el.style.background =
                  "color-mix(in srgb, var(--color-destructive) 10%, transparent)";
                el.style.color = "var(--color-destructive)";
              }
            }}
            onMouseLeave={(e) => {
              if (!logoutLoading) {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent";
                el.style.color = "var(--color-text-secondary)";
              }
            }}
          >
            <LogOut
              size={14}
              className="shrink-0"
              style={{
                animation: logoutLoading ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>{logoutLoading ? "Çıkılıyor..." : "Çıkış Yap"}</span>
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}
