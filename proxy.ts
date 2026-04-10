import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  USER_APP_PREFIXES,
  canAccessPathForPackage,
  getModuleKeyForPath,
  isUserAppPath,
} from "@/lib/access/package-access";
import { isUserProfileComplete } from "@/lib/user-profile";

const SETTINGS_CACHE_TTL_MS = 30_000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const hasSupabaseServiceCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let adminClientSingleton: ReturnType<typeof createSupabaseClient<any>> | null = null;
let moduleTogglesCache: CacheEntry<Record<string, boolean>> | null = null;
let adminLoginEnabledCache: CacheEntry<boolean> | null = null;
let runtimeAccessSettingsCache: CacheEntry<{
  maintenanceMode: boolean;
  requireProfileCompletion: boolean;
}> | null = null;

function getCachedValue<T>(entry: CacheEntry<T> | null): T | null {
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) return null;
  return entry.value;
}

function setCachedValue<T>(value: T): CacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  };
}

function getAdminClient() {
  if (!hasSupabaseServiceCredentials) return null;
  if (adminClientSingleton) return adminClientSingleton;

  adminClientSingleton = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  return adminClientSingleton;
}

async function getSystemSettingValue(key: string): Promise<string | null> {
  const adminClient = getAdminClient();
  if (!adminClient) return null;

  type SystemSettingRow = { value: string | null };
  const { data, error } = await adminClient
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle<SystemSettingRow>();
  if (error || !data?.value) return null;
  return data.value;
}

// Modül toggle'larını DB'den çek (Supabase admin client ile, Prisma değil)
async function getModuleToggles(): Promise<Record<string, boolean>> {
  const cached = getCachedValue(moduleTogglesCache);
  if (cached) return cached;

  try {
    const raw = await getSystemSettingValue("moduleToggles");
    if (!raw) {
      moduleTogglesCache = setCachedValue({});
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      moduleTogglesCache = setCachedValue({});
      return {};
    }

    const toggles = Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
      ),
    );
    moduleTogglesCache = setCachedValue(toggles);
    return toggles;
  } catch {
    moduleTogglesCache = setCachedValue({});
    return {};
  }
}

async function getAdminLoginEnabled(): Promise<boolean> {
  const cached = getCachedValue(adminLoginEnabledCache);
  if (cached !== null) return cached;

  try {
    const raw = await getSystemSettingValue("adminLoginEnabled");
    const enabled = raw ? raw.toLowerCase() !== "false" : true;
    adminLoginEnabledCache = setCachedValue(enabled);
    return enabled;
  } catch {
    adminLoginEnabledCache = setCachedValue(true);
    return true;
  }
}

async function getRuntimeAccessSettings(): Promise<{
  maintenanceMode: boolean;
  requireProfileCompletion: boolean;
}> {
  const cached = getCachedValue(runtimeAccessSettingsCache);
  if (cached) return cached;

  try {
    const [maintenanceModeRaw, requireProfileCompletionRaw] = await Promise.all([
      getSystemSettingValue("maintenanceMode"),
      getSystemSettingValue("requireProfileCompletion"),
    ]);
    const value = {
      maintenanceMode: maintenanceModeRaw?.toLowerCase() === "true",
      requireProfileCompletion:
        requireProfileCompletionRaw?.toLowerCase() === "true",
    };
    runtimeAccessSettingsCache = setCachedValue(value);
    return value;
  } catch {
    const fallback = {
      maintenanceMode: false,
      requireProfileCompletion: false,
    };
    runtimeAccessSettingsCache = setCachedValue(fallback);
    return fallback;
  }
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

type AccessProfile = {
  onboardingCompleted: boolean | null;
  packageName: string | null;
  role: string | null;
  name: string | null;
  goals: unknown;
  interests: unknown;
  addonModuleKeys: string[];
};

function pathStartsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

async function getAccessProfile(userId: string): Promise<AccessProfile> {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return {
      onboardingCompleted: null,
      packageName: null,
      role: null,
      name: null,
      goals: null,
      interests: null,
      addonModuleKeys: [],
    };
  }

  const [{ data, error }, { data: addonRows }] = await Promise.all([
    adminClient
      .from("users")
      .select("onboarding_completed, role, name, goals, interests, package:packages(name)")
      .eq("id", userId)
      .maybeSingle(),
    adminClient
      .from("user_addon_access")
      .select("module_key, expires_at")
      .eq("user_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
  ]);

  const userData = data as
    | {
        onboarding_completed: boolean | null;
        role: string | null;
        name: string | null;
        goals: unknown;
        interests: unknown;
        package: { name?: string | null } | Array<{ name?: string | null }> | null;
      }
    | null;
  const addonData = addonRows as Array<{ module_key: string | null }> | null;

  if (error) {
    return {
      onboardingCompleted: null,
      packageName: null,
      role: null,
      name: null,
      goals: null,
      interests: null,
      addonModuleKeys: [],
    };
  }

  const packageField = userData?.package as
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null
    | undefined;
  const packageName = Array.isArray(packageField)
    ? packageField[0]?.name ?? null
    : packageField?.name ?? null;

  return {
    onboardingCompleted: userData?.onboarding_completed ?? null,
    packageName,
    role: userData?.role ?? null,
    name: userData?.name ?? null,
    goals: userData?.goals ?? null,
    interests: userData?.interests ?? null,
    addonModuleKeys: (addonData ?? [])
      .map((row) => row.module_key)
      .filter((value): value is string => typeof value === "string"),
  };
}

export async function proxy(request: NextRequest) {
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

  const [profile, runtimeAccessSettings] = await Promise.all([
    user ? getAccessProfile(user.id) : Promise.resolve(null),
    getRuntimeAccessSettings(),
  ]);
  const role = profile?.role ?? null;
  const isPrivileged = role === "admin" || role === "org_admin";

  if (
    runtimeAccessSettings.maintenanceMode &&
    role !== "admin" &&
    pathname !== "/maintenance" &&
    !pathname.startsWith("/admin")
  ) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  // ── Kimlik doğrulama gerektiren rotalar ────────────────────────────────
  const protectedPrefixes = [...USER_APP_PREFIXES, "/admin", "/org-admin", "/setup"];
  const needsAuth = pathStartsWithAny(pathname, protectedPrefixes);

  if (!user && needsAuth) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  if (user && !isPrivileged) {
    const onboardingCompleted = profile?.onboardingCompleted ?? null;
    const moduleKey = getModuleKeyForPath(pathname);
    const profileComplete = isUserProfileComplete({
      name: profile?.name,
      goals: profile?.goals as never,
      interests: profile?.interests as never,
    });

    if (onboardingCompleted === false && pathname !== "/setup") {
      return NextResponse.redirect(new URL("/setup", request.url));
    }

    if (onboardingCompleted === true && pathname === "/setup") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (
      runtimeAccessSettings.requireProfileCompletion &&
      onboardingCompleted === true &&
      !profileComplete &&
      pathname !== "/account/profile" &&
      pathname !== "/account/profile/" &&
      isUserAppPath(pathname)
    ) {
      return NextResponse.redirect(
        new URL("/account/profile?reason=profile_required", request.url),
      );
    }

    if (
      onboardingCompleted === true &&
      isUserAppPath(pathname) &&
      !canAccessPathForPackage(pathname, profile?.packageName ?? null) &&
      !(moduleKey && profile?.addonModuleKeys.includes(moduleKey))
    ) {
      // Faz 2 davranışı: kullanıcı sayfayı görebilir, kullanım UI duvarı ile sınırlandırılır.
      // Redirect kaldırıldı.
    }

    // Modül toggle kontrolü — admin kapalı mı?
    if (onboardingCompleted === true && isUserAppPath(pathname)) {
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

  if (user && pathname.startsWith("/rag-admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── /org-admin: yalnızca org_admin ────────────────────────────────────
  if (user && pathname.startsWith("/org-admin")) {
    if (role !== "org_admin") {
      const dest = role === "admin" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.get("mode") === "admin"
  ) {
    const adminLoginEnabled = await getAdminLoginEnabled();
    if (!adminLoginEnabled) {
      const url = request.nextUrl.clone();
      url.searchParams.set("mode", "user");
      url.searchParams.set("reason", "admin_login_disabled");
      return NextResponse.redirect(url);
    }
  }

  // ── Giriş yapmış kullanıcı /welcome veya /login'e girmeye çalışırsa ──
  if (user && (pathname === "/welcome" || pathname === "/login")) {
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
    "/",
    "/dashboard/:path*",
    "/clinic/:path*",
    "/my-patients/:path*",
    "/patients/:path*",
    "/lab-viewing/:path*",
    "/tools/:path*",
    "/source/:path*",
    "/materials/:path*",
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
    "/pricing",
    "/setup",
    "/register",
    "/welcome",
    "/login",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/maintenance",
  ],
};
