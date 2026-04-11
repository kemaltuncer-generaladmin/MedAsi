import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const MODULE_TOGGLE_CACHE_TTL_MS = 60_000;
const ACCESS_PROFILE_CACHE_TTL_MS = 30_000;

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  if (!adminClient) {
    adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return adminClient;
}

const moduleToggleCache: {
  value: Record<string, boolean>;
  expiresAt: number;
  inFlight: Promise<Record<string, boolean>> | null;
} = {
  value: {},
  expiresAt: 0,
  inFlight: null,
};

const accessProfileCache = new Map<
  string,
  { value: AccessProfile | null; expiresAt: number }
>();
const accessProfileInFlight = new Map<string, Promise<AccessProfile | null>>();

// Modül toggle'larını DB'den çek (Supabase admin client ile, Prisma değil)
async function getModuleToggles(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (moduleToggleCache.expiresAt > now) {
    return moduleToggleCache.value;
  }
  if (moduleToggleCache.inFlight) {
    return moduleToggleCache.inFlight;
  }

  const client = getAdminClient();
  if (!client) return {};

  moduleToggleCache.inFlight = (async () => {
    try {
      const { data, error } = await client
      .from("system_settings")
      .select("value")
      .eq("key", "moduleToggles")
      .maybeSingle();
      const toggleRow = data as { value?: string } | null;
      if (error || !toggleRow?.value) return {};
      const parsed = JSON.parse(toggleRow.value) as Record<string, boolean>;
      moduleToggleCache.value = parsed;
      moduleToggleCache.expiresAt = Date.now() + MODULE_TOGGLE_CACHE_TTL_MS;
      return parsed;
    } catch {
      return {};
    } finally {
      moduleToggleCache.inFlight = null;
    }
  })();

  return moduleToggleCache.inFlight;
}

// Modül ID → korunan path prefix'leri eşlemesi
const MODULE_PATH_MAP: Record<string, string[]> = {
  clinic: ["/clinic", "/my-patients"],
  lab: ["/lab-viewing"],
  "ai-diagnosis": ["/ai-diagnosis"],
  "ai-assistant": ["/ai-assistant"],
  "case-rpg": ["/case-rpg"],
  flashcards: ["/flashcards"],
  exams: ["/exams"],
  planners: ["/planners"],
  pomodoro: ["/pomodoro"],
};
const MODULE_GUARDED_PREFIXES = Array.from(
  new Set(Object.values(MODULE_PATH_MAP).flat()),
);

type AccessProfile = {
  onboardingCompleted: boolean | null;
  packageName: string | null;
  role: string | null;
};
type AccessProfileRow = {
  onboarding_completed?: boolean | null;
  role?: string | null;
  package?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null
    | undefined;
};

const USER_APP_PREFIXES = [
  "/dashboard",
  "/clinic",
  "/my-patients",
  "/patients",
  "/lab-viewing",
  "/tools",
  "/source",
  "/exams",
  "/planners",
  "/questions",
  "/flashcards",
  "/ai",
  "/account",
  "/daily-briefing",
  "/ai-assistant",
  "/ai-diagnosis",
  "/case-rpg",
  "/cases",
  "/notes",
  "/pomodoro",
  "/terminal",
  "/settings",
  "/rag-admin",
];

// Her plan için erişilebilir prefix'ler (kümülatif — her plan üsttekini de içerir)

/** Tüm giriş yapmış kullanıcılara açık */
const COMMON_APP_PREFIXES = ["/dashboard", "/account", "/settings"];

/** Ücretsiz plan: AI yok, sadece temel araçlar */
const FREE_EXTRA_PREFIXES = [
  "/planners",
  "/notes",
  "/pomodoro",
  "/clinic",
  "/my-patients",
  "/daily-briefing",
];

/** Giriş planı: Ücretsiz + sınırlı AI (flashcard, soru, spot not) */
const GIRIS_EXTRA_PREFIXES = [
  "/ai-assistant",
  "/flashcards",
  "/questions",
  "/source",
];

/** Pro / Kurumsal: Giriş + tam AI (tanı, vaka RPG, terminal, klinik yönetim) */
const PRO_EXTRA_PREFIXES = [
  "/ai-diagnosis",
  "/case-rpg",
  "/ai",
  "/terminal",
  "/patients",
  "/lab-viewing",
  "/cases",
  "/tools",
  "/exams",
];

function pathStartsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function isUserAppPath(pathname: string) {
  return pathStartsWithAny(pathname, USER_APP_PREFIXES);
}

function isAppPathAllowedForPackage(pathname: string, packageName: string | null) {
  if (!isUserAppPath(pathname)) return true;
  if (pathStartsWithAny(pathname, COMMON_APP_PREFIXES)) return true;

  const n = packageName?.toLowerCase().trim() ?? "";

  // Kurumsal / Pro: tam erişim (PRO_EXTRA_PREFIXES dahil her şey)
  if (["kurumsal", "enterprise", "pro"].includes(n)) {
    return (
      pathStartsWithAny(pathname, FREE_EXTRA_PREFIXES) ||
      pathStartsWithAny(pathname, GIRIS_EXTRA_PREFIXES) ||
      pathStartsWithAny(pathname, PRO_EXTRA_PREFIXES)
    );
  }

  // Giriş planı: temel araçlar + sınırlı AI
  if (["giriş", "giris", "giris_planı", "basic"].includes(n)) {
    return (
      pathStartsWithAny(pathname, FREE_EXTRA_PREFIXES) ||
      pathStartsWithAny(pathname, GIRIS_EXTRA_PREFIXES)
    );
  }

  // Ücretsiz planı: sadece temel araçlar, AI yok
  if (["ücretsiz", "ucretsiz", "free"].includes(n)) {
    return pathStartsWithAny(pathname, FREE_EXTRA_PREFIXES);
  }

  // Tanınmayan paket: sadece temel araçlara izin ver (güvenli taraf)
  return pathStartsWithAny(pathname, FREE_EXTRA_PREFIXES);
}

async function getAccessProfile(userId: string): Promise<AccessProfile | null> {
  const now = Date.now();
  const cached = accessProfileCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inFlight = accessProfileInFlight.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const client = getAdminClient();
  if (!client) {
    return null; // Fail-closed: config eksikse erişimi engelle
  }

  const profilePromise = (async () => {
    const { data, error } = await client
      .from("users")
      .select("onboarding_completed, role, package:packages(name)")
      .eq("id", userId)
      .maybeSingle();
    const row = data as AccessProfileRow | null;

    if (error || !row) {
      return null;
    }

    const packageField = row.package;
    const packageName = Array.isArray(packageField)
      ? packageField[0]?.name ?? null
      : packageField?.name ?? null;

    return {
      onboardingCompleted: row.onboarding_completed ?? null,
      packageName,
      role: row.role ?? null,
    } satisfies AccessProfile;
  })();

  accessProfileInFlight.set(userId, profilePromise);
  try {
    const profile = await profilePromise;
    accessProfileCache.set(userId, {
      value: profile,
      expiresAt: Date.now() + ACCESS_PROFILE_CACHE_TTL_MS,
    });
    return profile;
  } finally {
    accessProfileInFlight.delete(userId);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadataRole = user?.user_metadata?.role as string | undefined;
  const shouldLoadProfile =
    user !== null &&
    (isUserAppPath(pathname) ||
      pathname === "/setup" ||
      pathname === "/welcome" ||
      pathname === "/login" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/org-admin"));
  const profile = user && shouldLoadProfile ? await getAccessProfile(user.id) : null;
  
  // Profile null ise (DB hatası), authenticated user'ı login'e geri gönder (fail-closed)
  if (user && profile === null && pathStartsWithAny(pathname, USER_APP_PREFIXES)) {
    return NextResponse.redirect(new URL("/login?error=auth_check_failed", request.url));
  }
  
  const role = profile?.role ?? metadataRole;
  const isPrivileged = role === "admin" || role === "org_admin";

  // ── Kimlik doğrulama gerektiren rotalar ────────────────────────────────
  const protectedPrefixes = [...USER_APP_PREFIXES, "/admin", "/org-admin", "/setup"];
  const needsAuth = pathStartsWithAny(pathname, protectedPrefixes);

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && !isPrivileged) {
    const onboardingCompleted = profile?.onboardingCompleted ?? null;

    if (onboardingCompleted === false && pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }

    if (onboardingCompleted === true && pathname === "/setup") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (
      onboardingCompleted === true &&
      isUserAppPath(pathname) &&
      !isAppPathAllowedForPackage(pathname, profile?.packageName ?? null)
    ) {
      return NextResponse.redirect(new URL("/upgrade?reason=package_access", request.url));
    }

    // Modül toggle kontrolü — admin kapalı mı?
    if (
      onboardingCompleted === true &&
      isUserAppPath(pathname) &&
      pathStartsWithAny(pathname, MODULE_GUARDED_PREFIXES)
    ) {
      try {
        const moduleToggles = await getModuleToggles();
        for (const [moduleId, paths] of Object.entries(MODULE_PATH_MAP)) {
          if (
            moduleToggles[moduleId] === false &&
            pathStartsWithAny(pathname, paths)
          ) {
            return NextResponse.redirect(new URL("/dashboard?reason=module_disabled", request.url));
          }
        }
      } catch {
        // Modül toggle yüklenemezse erişimi reddet (fail-closed)
        return NextResponse.redirect(new URL("/dashboard?reason=module_check_failed", request.url));
      }
    }
  }

  if (user && isPrivileged && pathname === "/setup") {
    const dest = role === "admin" ? "/admin" : "/org-admin";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── /admin: yalnızca super admin ──────────────────────────────────────
  if (user && pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const dest = role === "org_admin" ? "/org-admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // ── /org-admin: yalnızca org_admin ────────────────────────────────────
  if (user && pathname.startsWith("/org-admin")) {
    if (role !== "org_admin") {
      const dest = role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // ── Giriş yapmış kullanıcı /welcome veya /login'e girmeye çalışırsa ──
  if (user && (pathname === "/welcome" || pathname === "/login")) {
    // Profile yüklenemezse (/dashboard yönlendirmesi döngüye girer) — sayfada kal
    if (profile === null) return response;
    if (!isPrivileged) {
      const onboardingCompleted = profile?.onboardingCompleted ?? null;
      if (onboardingCompleted === false) {
        return NextResponse.redirect(new URL("/setup", request.url));
      }
    }
    if (role === "admin")
      return NextResponse.redirect(new URL("/admin", request.url));
    if (role === "org_admin")
      return NextResponse.redirect(new URL("/org-admin", request.url));
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clinic/:path*",
    "/my-patients/:path*",
    "/patients/:path*",
    "/lab-viewing/:path*",
    "/tools/:path*",
    "/source/:path*",
    "/exams/:path*",
    "/planners/:path*",
    "/questions/:path*",
    "/flashcards/:path*",
    "/ai/:path*",
    "/account/:path*",
    "/daily-briefing/:path*",
    "/ai-assistant/:path*",
    "/ai-diagnosis/:path*",
    "/case-rpg/:path*",
    "/cases/:path*",
    "/notes/:path*",
    "/pomodoro/:path*",
    "/terminal/:path*",
    "/settings/:path*",
    "/rag-admin/:path*",
    "/admin/:path*",
    "/org-admin/:path*",
    "/setup",
    "/welcome",
    "/login",
  ],
};
