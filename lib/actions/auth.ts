"use server";

import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SENIORITY_OPTIONS, loginSchema, registerSchema } from "@/lib/schemas";
import { ROUTES } from "@/constants";
import { getSystemSettingsFromDb } from "@/lib/system-settings";
import { createSystemLog } from "@/lib/system-log";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { grantFreeTokensOnSignup } from "@/lib/ai/check-limit";
import { ensureUsageTrackingSchema } from "@/lib/db/schema-guard";
import { z } from "zod";

export type AuthActionResult = { success: boolean; error?: string };

const PASSWORD_RESET_REQUEST_SCHEMA = z.object({
  email: z.string().email("Geçerli bir email girin"),
});

const PASSWORD_RESET_SCHEMA = z
  .object({
    password: z.string().min(6, "Yeni şifre en az 6 karakter olmalı"),
    confirmPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor",
  });

const ALLOWED_SENIORITIES = new Set(SENIORITY_OPTIONS);
const PACKAGE_MAP = {
  ucretsiz: "Ücretsiz",
  giris: "Giriş",
  pro: "Pro",
  enterprise: "Kurumsal",
  kurumsal: "Kurumsal",
} as const;

type AuthFailureReason =
  | "invalid_input"
  | "invalid_credentials"
  | "account_locked"
  | "approval_pending"
  | "registration_closed"
  | "domain_not_allowed"
  | "daily_limit_reached"
  | "missing_default_package"
  | "onboarding_pending"
  | "admin_login_disabled"
  | "org_admin_login_disabled"
  | "admin_login_forbidden"
  | "email_not_verified"
  | "supabase_error"
  | "unknown_error";

const LEGAL_CONSENT_VERSION = "v2026-04-09";

function maskEmail(email: string | undefined | null): string {
  if (!email) return "unknown";
  const [localPart, domain] = email.split("@");
  if (!domain) return "unknown";
  const visible = localPart.slice(0, 2);
  return `${visible}${localPart.length > 2 ? "***" : ""}@${domain}`;
}

function getRequestIp(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded
      .split(",")
      .map((item) => item.trim())
      .find(Boolean);
    if (firstIp) return firstIp;
  }
  return (
    headerStore.get("x-real-ip") ||
    headerStore.get("cf-connecting-ip") ||
    null
  );
}

function resolvePackageNameFromAuthMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;

  const candidate =
    (typeof metadata.packageName === "string" && metadata.packageName) ||
    (typeof metadata.selectedPackage === "string" && metadata.selectedPackage) ||
    (typeof metadata.package === "string" && metadata.package) ||
    null;

  if (!candidate) return null;

  const normalized = candidate.trim().toLowerCase();
  const mappedName =
    PACKAGE_MAP[normalized as keyof typeof PACKAGE_MAP] ?? null;
  if (mappedName) return mappedName;

  const directMatch = Object.values(PACKAGE_MAP).find(
    (name) => name.toLowerCase() === normalized,
  );

  return directMatch ?? null;
}

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Auth service is not configured");
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getOrigin() {
  const headerStore = await headers();
  return (
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

function isLikelyNotFoundError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /not found|user.*not found|email.*not found/i.test(message);
}

async function logAuthFailure(
  reason: AuthFailureReason,
  message: string,
  details?: string,
  userId?: string,
) {
  await createSystemLog({
    level: "warn",
    category: "auth",
    message,
    details: details ? `[${reason}] ${details}` : `[${reason}]`,
    userId,
  });
}

async function logAuthSuccess(
  message: string,
  userId?: string,
  details?: string,
) {
  await createSystemLog({
    level: "success",
    category: "auth",
    message,
    details,
    userId,
  });
}

function shouldCountFailedAttempt(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password")
  );
}

async function registerFailedLoginAttempt(
  userId: string,
  settings: Awaited<ReturnType<typeof getSystemSettingsFromDb>>,
) {
  const threshold = Math.max(1, settings.maxFailedLoginAttempts ?? 5);
  const lockoutMinutes = Math.max(1, settings.lockoutMinutes ?? 15);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: {
        increment: 1,
      },
    },
    select: {
      failedLoginAttempts: true,
    },
  });

  if (updated.failedLoginAttempts < threshold) {
    return null;
  }

  const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil,
    },
  });

  return lockedUntil;
}

async function clearLoginRiskState(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

async function sendSignupVerificationEmail(
  email: string,
  name: string,
  password: string,
) {
  try {
    const supabase = createAdminSupabaseClient();
    const origin = await getOrigin();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { redirectTo: `${origin}/setup` },
    });
    if (error) throw error;

    const hashedToken = data?.properties?.hashed_token;
    const actionLink = data?.properties?.action_link;
    const otp = data?.properties?.email_otp ?? null;
    if (!hashedToken && !actionLink) {
      throw new Error("Supabase verification link could not be generated");
    }

    // PKCE-uyumlu confirm endpoint — code_verifier gerektirmez
    const verificationLink = hashedToken
      ? `${origin}/api/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=signup&next=/setup`
      : actionLink!;

    await sendVerificationEmail({
      to: email,
      name,
      verificationLink,
      verificationCode: otp,
    });
  } catch (error) {
    await logAuthFailure(
      "supabase_error",
      "Doğrulama e-postası gönderilemedi",
      `E-posta: ${maskEmail(email)}; Sebep: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

export async function login(
  formData: FormData,
): Promise<AuthActionResult | void> {
  try {
    await ensureUsageTrackingSchema();
    const raw = Object.fromEntries(formData);
    const loginMode =
      typeof raw.loginMode === "string" &&
      raw.loginMode.toLowerCase() === "admin"
        ? "admin"
        : "user";
    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const email = typeof raw.email === "string" ? raw.email : undefined;
      await logAuthFailure(
        "invalid_input",
        "Giriş doğrulama hatası",
        `E-posta: ${maskEmail(email)}; Sebep: ${parsed.error.errors[0]?.message ?? "Geçersiz giriş verisi"}`,
      );
      return { success: false, error: parsed.error.errors[0].message };
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const [supabase, settings, matchedDbUser] = await Promise.all([
      createClient(),
      getSystemSettingsFromDb(),
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          role: true,
          lockedUntil: true,
          accountApprovedAt: true,
        },
      }),
    ]);

    if (matchedDbUser?.lockedUntil && matchedDbUser.lockedUntil > new Date()) {
      await logAuthFailure(
        "account_locked",
        "Kilitli hesap girişi reddedildi",
        `E-posta: ${maskEmail(normalizedEmail)}; Kilit bitişi: ${matchedDbUser.lockedUntil.toISOString()}`,
        matchedDbUser.id,
      );
      return {
        success: false,
        error: "Hesabın geçici olarak kilitlendi. Lütfen biraz sonra tekrar dene.",
      };
    }

    if (
      settings.accountApprovalRequired &&
      matchedDbUser &&
      !matchedDbUser.accountApprovedAt
    ) {
      await logAuthFailure(
        "approval_pending",
        "Onay bekleyen hesap girişi reddedildi",
        `E-posta: ${maskEmail(normalizedEmail)}`,
        matchedDbUser.id,
      );
      return {
        success: false,
        error: "Hesabın henüz yönetici tarafından onaylanmadı.",
      };
    }

    if (loginMode === "admin" && !settings.adminLoginEnabled) {
      await logAuthFailure(
        "admin_login_disabled",
        "Yönetici girişi reddedildi",
        `E-posta: ${maskEmail(parsed.data.email)}; Sebep: yönetici girişi sistem ayarlarında kapalı`,
      );
      return {
        success: false,
        error: "Yönetici girişi şu anda kapalı. Lütfen normal giriş yapın.",
      };
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: parsed.data.password,
    });
    if (error) {
      let lockMessage: string | null = null;
      if (matchedDbUser && shouldCountFailedAttempt(error.message)) {
        const lockedUntil = await registerFailedLoginAttempt(
          matchedDbUser.id,
          settings,
        );
        if (lockedUntil) {
          lockMessage = "Çok fazla hatalı giriş denemesi. Hesap geçici olarak kilitlendi.";
        }
      }
      await logAuthFailure(
        "invalid_credentials",
        "Giriş başarısız",
        `E-posta: ${maskEmail(normalizedEmail)}; Sebep: ${error.message}`,
      );
      // Kullanıcı dostu hata mesajları — teknik hata metinleri gösterme
      const msg = error.message.toLowerCase();
      let friendlyError = "Bir şeyler ters gitti. Lütfen tekrar deneyin.";
      if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password")) {
        friendlyError = "E-posta veya şifre hatalı. Lütfen bilgilerini kontrol et.";
      } else if (msg.includes("email not confirmed")) {
        friendlyError = "E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.";
      } else if (msg.includes("too many requests") || msg.includes("rate limit")) {
        friendlyError = "Çok fazla hatalı giriş denemesi. Lütfen birkaç dakika bekle.";
      } else if (msg.includes("user not found") || msg.includes("no user")) {
        friendlyError = "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.";
      }
      if (lockMessage) {
        friendlyError = lockMessage;
      }
      return { success: false, error: friendlyError };
    }

    let authenticatedRole: string | undefined;

    if (user) {
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          accountApprovedAt: true,
        },
      });
      const resolvedRole = existingUser?.role ?? "user";
      authenticatedRole = resolvedRole;

      if (resolvedRole === "admin" && !settings.adminLoginEnabled) {
        await supabase.auth.signOut().catch(() => {});
        await logAuthFailure(
          "admin_login_disabled",
          "Yönetici girişi reddedildi",
          `E-posta: ${maskEmail(user.email)}; Sebep: yönetici girişi sistem ayarlarında kapalı`,
          user.id,
        );
        return {
          success: false,
          error: "Yönetici girişi şu anda kapalı. Lütfen sistem yöneticinizle iletişime geçin.",
        };
      }

      if (resolvedRole === "org_admin" && !settings.orgAdminLoginEnabled) {
        await supabase.auth.signOut().catch(() => {});
        await logAuthFailure(
          "org_admin_login_disabled",
          "Org admin girişi reddedildi",
          `E-posta: ${maskEmail(user.email)}; Sebep: organizasyon yöneticisi girişi sistem ayarlarında kapalı`,
          user.id,
        );
        return {
          success: false,
          error:
            "Organizasyon yöneticisi girişi şu anda kapalı. Lütfen sistem yöneticinizle iletişime geçin.",
        };
      }

      if (loginMode === "admin" && resolvedRole !== "admin") {
        await supabase.auth.signOut().catch(() => {});
        await logAuthFailure(
          "admin_login_forbidden",
          "Yetkisiz yönetici giriş denemesi",
          `E-posta: ${maskEmail(user.email)}; Rol: ${resolvedRole}`,
          user.id,
        );
        return {
          success: false,
          error: "Bu mod yalnızca yönetici hesapları içindir. Lütfen normal giriş yapın.",
        };
      }

      if (settings.emailVerificationRequired && !user.email_confirmed_at) {
        await supabase.auth.signOut().catch(() => {});
        await logAuthFailure(
          "email_not_verified",
          "Doğrulanmamış e-posta ile giriş reddedildi",
          `E-posta: ${maskEmail(user.email)}`,
          user.id,
        );
        return {
          success: false,
          error:
            "E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol edip doğrulama bağlantısına tıkla.",
        };
      }

      const isAccountApproved =
        !settings.accountApprovalRequired || Boolean(existingUser?.accountApprovedAt);

      if (!existingUser) {
        const fallbackPackageName =
          resolvePackageNameFromAuthMetadata(user.user_metadata) ??
          PACKAGE_MAP.ucretsiz;
        const defaultPackage = await prisma.package.findUnique({
          where: { name: fallbackPackageName },
        });
        if (!defaultPackage) {
          await logAuthFailure(
            "missing_default_package",
            "Giriş sırasında varsayılan paket bulunamadı",
            `E-posta: ${maskEmail(user.email)}`,
            user.id,
          );
          return { success: false, error: "Varsayılan paket bulunamadı." };
        }

        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || "",
            packageId: defaultPackage.id,
            role: "user",
            accountApprovedAt: settings.accountApprovalRequired ? null : new Date(),
          },
        });

        await grantFreeTokensOnSignup(user.id, {
          packageId: defaultPackage.id,
          packageName: defaultPackage.name,
        }).catch(async (grantError) => {
          await logAuthFailure(
            "supabase_error",
            "Login fallback token grant başarısız",
            `E-posta: ${maskEmail(user.email)}; Sebep: ${
              grantError instanceof Error
                ? grantError.message
                : "Unknown error"
            }`,
            user.id,
          );
        });
      }

      if (!isAccountApproved) {
        await supabase.auth.signOut().catch(() => {});
        await logAuthFailure(
          "approval_pending",
          "Onay bekleyen hesap girişi reddedildi",
          `E-posta: ${maskEmail(user.email)}`,
          user.id,
        );
        return {
          success: false,
          error: "Hesabın henüz yönetici tarafından onaylanmadı.",
        };
      }

      await clearLoginRiskState(user.id).catch(() => {});

      await logAuthSuccess(
        "Giriş başarılı",
        user.id,
        `E-posta: ${maskEmail(user.email)}`,
      );
    }

    if (settings.onboardingRequired && user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingCompleted: true },
      });
      if (!dbUser?.onboardingCompleted) {
        await logAuthFailure(
          "onboarding_pending",
          "Giriş sonrası onboarding yönlendirmesi",
          `E-posta: ${maskEmail(user.email)}`,
          user.id,
        );
        redirect("/setup");
      }
    }

    const role = authenticatedRole;
    if (role === "admin") redirect("/admin");
    if (role === "org_admin") redirect("/org-admin");
    redirect(ROUTES.dashboard);
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    unstable_rethrow(err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bir hata oluştu",
    };
  }
}

export async function register(
  formData: FormData,
): Promise<AuthActionResult | void> {
  try {
    await ensureUsageTrackingSchema();
    const raw = Object.fromEntries(formData);
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const email = typeof raw.email === "string" ? raw.email : undefined;
      await logAuthFailure(
        "invalid_input",
        "Kayıt doğrulama hatası",
        `E-posta: ${maskEmail(email)}; Sebep: ${parsed.error.errors[0]?.message ?? "Geçersiz kayıt verisi"}`,
      );
      return { success: false, error: parsed.error.errors[0].message };
    }

    if (!ALLOWED_SENIORITIES.has(parsed.data.seniority)) {
      await logAuthFailure(
        "invalid_input",
        "Kayıt reddedildi",
        `E-posta: ${maskEmail(parsed.data.email)}; Sebep: geçersiz dönem seçimi`,
      );
      return {
        success: false,
        error:
          "Lütfen yalnızca 1-6. sınıf, klinik dönem veya TUS hazırlık seçeneklerinden birini seçin.",
      };
    }

    const settings = await getSystemSettingsFromDb();
    if (!settings.registrationEnabled) {
      await logAuthFailure(
        "registration_closed",
        "Kayıt reddedildi",
        `E-posta: ${maskEmail(parsed.data.email)}; Sebep: sistem kayıtları kapalı`,
      );
      return {
        success: false,
        error: "Yeni kayıtlar şu anda kapalı.",
      };
    }

    const emailDomain = parsed.data.email.split("@")[1]?.toLowerCase() ?? "";
    const allowedDomains = settings.allowedEmailDomains
      .split("\n")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (
      allowedDomains.length > 0 &&
      !allowedDomains.some((domain) => domain === emailDomain)
    ) {
      await logAuthFailure(
        "domain_not_allowed",
        "Kayıt reddedildi",
        `E-posta: ${maskEmail(parsed.data.email)}; Domain: ${emailDomain || "unknown"}`,
      );
      return {
        success: false,
        error: "Bu e-posta domaini ile kayıt yapılamaz.",
      };
    }

    if (settings.maxUsersPerDay > 0) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const todayRegistered = await prisma.user.count({
        where: { createdAt: { gte: dayStart } },
      });
      if (todayRegistered >= settings.maxUsersPerDay) {
        await logAuthFailure(
          "daily_limit_reached",
          "Kayıt reddedildi",
          `E-posta: ${maskEmail(parsed.data.email)}; Günlük limit: ${settings.maxUsersPerDay}`,
        );
        return {
          success: false,
          error: "Günlük kayıt limiti doldu. Lütfen daha sonra tekrar deneyin.",
        };
      }
    }

    // ── Kupon kodu doğrulama ──────────────────────────────────────────────
    const rawCoupon = parsed.data.couponCode?.trim().toUpperCase() || "";
    let couponPackage: { id: string; name: string } | null = null;
    let couponRecord: { id: string; durationDays: number | null; code: string } | null = null;

    if (rawCoupon) {
      const now = new Date();
      const coupon = await prisma.couponCode.findUnique({
        where: { code: rawCoupon },
        include: { package: { select: { id: true, name: true } } },
      });

      if (!coupon || !coupon.isActive) {
        return { success: false, error: "Kupon kodu geçersiz veya devre dışı." };
      }
      if (coupon.expiresAt && coupon.expiresAt < now) {
        return { success: false, error: "Bu kupon kodunun süresi dolmuş." };
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return { success: false, error: "Bu kupon kodunun kullanım limiti dolmuş." };
      }

      couponPackage = coupon.package;
      couponRecord = { id: coupon.id, durationDays: coupon.durationDays, code: coupon.code };
    }
    // ─────────────────────────────────────────────────────────────────────

    const packageName = couponPackage
      ? couponPackage.name
      : PACKAGE_MAP[parsed.data.selectedPackage];

    const selectedPackage = couponPackage ?? await prisma.package.findUnique({
      where: { name: packageName },
    });

    if (!selectedPackage) {
      await logAuthFailure(
        "missing_default_package",
        "Seçilen paket bulunamadı",
        `E-posta: ${maskEmail(parsed.data.email)}; Paket: ${packageName}`,
      );
      return {
        success: false,
        error: "Seçtiğiniz paket şu anda aktif değil. Lütfen tekrar deneyin.",
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          name: parsed.data.name,
          seniority: parsed.data.seniority,
          selectedPackage: selectedPackage.name,
          selectedPackageKey: parsed.data.selectedPackage,
        },
      },
    });
    if (error) {
      await logAuthFailure(
        "supabase_error",
        "Supabase kayıt hatası",
        `E-posta: ${maskEmail(parsed.data.email)}; Sebep: ${error.message}`,
      );
      return { success: false, error: error.message };
    }

    if (data.user) {
      const signupUserId = data.user.id;
      const requestHeaders = await headers();
      const consentAt = new Date();
      const consentIp = getRequestIp(requestHeaders);
      const consentUserAgent = requestHeaders.get("user-agent");

      // Kupon varsa bitiş tarihini hesapla
      const subscriptionExpiresAt =
        couponRecord?.durationDays != null
          ? new Date(Date.now() + couponRecord.durationDays * 24 * 60 * 60 * 1000)
          : null;

      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {
          name: parsed.data.name,
          packageId: selectedPackage.id,
          termsAcceptedAt: consentAt,
          privacyAcceptedAt: consentAt,
          medicalConsentAcceptedAt: consentAt,
          legalConsentVersion: LEGAL_CONSENT_VERSION,
          legalConsentIp: consentIp,
          legalConsentUserAgent: consentUserAgent,
          accountApprovedAt: settings.accountApprovalRequired ? null : consentAt,
          ...(couponRecord && {
            couponUsed: couponRecord.code,
            subscriptionExpiresAt,
          }),
        },
        create: {
          id: data.user.id,
          email: parsed.data.email,
          name: parsed.data.name,
          packageId: selectedPackage.id,
          role: "user",
          termsAcceptedAt: consentAt,
          privacyAcceptedAt: consentAt,
          medicalConsentAcceptedAt: consentAt,
          legalConsentVersion: LEGAL_CONSENT_VERSION,
          legalConsentIp: consentIp,
          legalConsentUserAgent: consentUserAgent,
          accountApprovedAt: settings.accountApprovalRequired ? null : consentAt,
          ...(couponRecord && {
            couponUsed: couponRecord.code,
            subscriptionExpiresAt,
          }),
        },
      });

      // Kupon kullanım sayacını artır
      if (couponRecord) {
        await prisma.couponCode.update({
          where: { id: couponRecord.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Token cüzdanı oluştur: plana göre grant ver
      await grantFreeTokensOnSignup(signupUserId, {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
      }).catch(async (grantError) => {
        await logAuthFailure(
          "supabase_error",
          "Signup token grant başarısız",
          `E-posta: ${maskEmail(parsed.data.email)}; Sebep: ${
            grantError instanceof Error ? grantError.message : "Unknown error"
          }`,
          signupUserId,
        );
      });

      const couponInfo = couponRecord
        ? `; Kupon: ${couponRecord.code} → ${packageName}${subscriptionExpiresAt ? ` (${couponRecord.durationDays} gün)` : " (süresiz)"}`
        : "";

      await logAuthSuccess(
        "Yeni kayıt tamamlandı",
        signupUserId,
        `E-posta: ${maskEmail(parsed.data.email)}; Dönem: ${parsed.data.seniority}; Paket: ${packageName}${couponInfo}; Onay: ${LEGAL_CONSENT_VERSION}`,
      );

      try {
        await sendWelcomeEmail(parsed.data.email, parsed.data.name);
      } catch (welcomeError) {
        await logAuthFailure(
          "supabase_error",
          "Hoş geldin e-postası gönderilemedi",
          `E-posta: ${maskEmail(parsed.data.email)}; Sebep: ${
            welcomeError instanceof Error ? welcomeError.message : "Unknown error"
          }`,
          signupUserId,
        );
      }

      if (settings.emailVerificationRequired) {
        await sendSignupVerificationEmail(
          parsed.data.email,
          parsed.data.name,
          parsed.data.password,
        );
      } else {
        try {
          const adminSupabase = createAdminSupabaseClient();
          const { error: confirmError } = await adminSupabase.auth.admin.updateUserById(
            signupUserId,
            { email_confirm: true },
          );
          if (confirmError) {
            throw confirmError;
          }
        } catch (confirmError) {
          await logAuthFailure(
            "supabase_error",
            "Otomatik e-posta onayı yapılamadı",
            `E-posta: ${maskEmail(parsed.data.email)}; Sebep: ${
              confirmError instanceof Error ? confirmError.message : "Unknown error"
            }`,
            signupUserId,
          );
        }
      }
    }

    await supabase.auth.signOut().catch(() => {});

    if (settings.emailVerificationRequired) {
      redirect(
        `/verify-email?email=${encodeURIComponent(parsed.data.email)}&name=${encodeURIComponent(parsed.data.name)}`,
      );
    }

    const approvalQuery = settings.accountApprovalRequired
      ? "&approval=pending"
      : "";
    redirect(
      `/login?registered=true${approvalQuery}`,
    );
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    await logAuthFailure(
      "unknown_error",
      "Beklenmeyen auth hatası",
      err instanceof Error ? err.message : "Unknown error",
    );
    unstable_rethrow(err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Bir hata oluştu",
    };
  }
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthActionResult | void> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = PASSWORD_RESET_REQUEST_SCHEMA.safeParse(raw);
    if (!parsed.success) {
      await logAuthFailure(
        "invalid_input",
        "Şifre sıfırlama doğrulama hatası",
        parsed.error.errors[0]?.message ?? "Geçersiz email",
      );
      return { success: false, error: parsed.error.errors[0].message };
    }

    const email = parsed.data.email.trim().toLowerCase();
    const settings = await getSystemSettingsFromDb();
    if (!settings.passwordResetEnabled) {
      await logAuthFailure(
        "registration_closed",
        "Şifre sıfırlama isteği reddedildi",
        `E-posta: ${maskEmail(email)}; Sebep: şifre sıfırlama akışı sistem ayarlarında kapalı`,
      );
      return {
        success: false,
        error: "Şifre sıfırlama özelliği şu anda geçici olarak kapalı.",
      };
    }

    const supabase = createAdminSupabaseClient();
    const redirectTo = `${await getOrigin()}/api/auth/callback?next=/reset-password`;

    let generatedLink: string | null = null;
    let matchedUserId: string | undefined;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    matchedUserId = user?.id;

    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) {
        if (isLikelyNotFoundError(error)) {
          await logAuthSuccess(
            "Şifre sıfırlama isteği alındı",
            matchedUserId,
            `E-posta: ${maskEmail(email)}; Hesap bulunamadı ama talep güvenli şekilde işlendi`,
          );
          return { success: true };
        }

        await logAuthFailure(
          "supabase_error",
          "Şifre sıfırlama linki oluşturulamadı",
          `E-posta: ${maskEmail(email)}; Sebep: ${error.message}`,
          matchedUserId,
        );
        return {
          success: false,
          error:
            "Şifre sıfırlama isteği şu anda tamamlanamadı. Lütfen tekrar deneyin.",
        };
      }

      generatedLink = data.properties.action_link;
    } catch (error) {
      await logAuthFailure(
        "supabase_error",
        "Şifre sıfırlama linki oluşturulamadı",
        `E-posta: ${maskEmail(email)}; Sebep: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        matchedUserId,
      );
      return {
        success: false,
        error:
          "Şifre sıfırlama isteği şu anda tamamlanamadı. Lütfen tekrar deneyin.",
      };
    }

    if (!generatedLink) {
      return {
        success: false,
        error:
          "Şifre sıfırlama isteği şu anda tamamlanamadı. Lütfen tekrar deneyin.",
      };
    }

    try {
      await sendPasswordResetEmail(email, generatedLink);
    } catch (error) {
      await logAuthFailure(
        "supabase_error",
        "Şifre sıfırlama e-postası gönderilemedi",
        `E-posta: ${maskEmail(email)}; Sebep: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        matchedUserId,
      );
      return {
        success: false,
        error:
          "Şifre sıfırlama e-postası gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
      };
    }

    await logAuthSuccess(
      "Şifre sıfırlama e-postası gönderildi",
      matchedUserId,
      `E-posta: ${maskEmail(email)}`,
    );

    return { success: true };
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    await logAuthFailure(
      "unknown_error",
      "Beklenmeyen şifre sıfırlama hatası",
      err instanceof Error ? err.message : "Unknown error",
    );
    unstable_rethrow(err);
    return {
      success: false,
      error:
        "Şifre sıfırlama isteği şu anda tamamlanamadı. Lütfen tekrar deneyin.",
    };
  }
}

export async function completePasswordReset(
  formData: FormData,
): Promise<AuthActionResult | void> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = PASSWORD_RESET_SCHEMA.safeParse(raw);
    if (!parsed.success) {
      await logAuthFailure(
        "invalid_input",
        "Yeni şifre doğrulama hatası",
        parsed.error.errors[0]?.message ?? "Geçersiz şifre",
      );
      return { success: false, error: parsed.error.errors[0].message };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      await logAuthFailure(
        "supabase_error",
        "Şifre sıfırlama oturumu doğrulanamadı",
        authError?.message ?? "Oturum bulunamadı",
      );
      return {
        success: false,
        error:
          "Sıfırlama oturumu doğrulanamadı. Lütfen e-postadaki bağlantıyı yeniden açın.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      await logAuthFailure(
        "supabase_error",
        "Şifre güncelleme başarısız",
        `E-posta: ${maskEmail(user.email)}; Sebep: ${error.message}`,
        user.id,
      );
      return {
        success: false,
        error: "Şifre güncellenemedi. Lütfen tekrar deneyin.",
      };
    }

    await logAuthSuccess(
      "Şifre başarıyla güncellendi",
      user.id,
      `E-posta: ${maskEmail(user.email)}`,
    );

    await supabase.auth.signOut();
    return { success: true };
  } catch (err) {
    if (isRedirectError(err)) {
      throw err;
    }
    await logAuthFailure(
      "unknown_error",
      "Beklenmeyen şifre sıfırlama tamamlama hatası",
      err instanceof Error ? err.message : "Unknown error",
    );
    unstable_rethrow(err);
    return {
      success: false,
      error: "Şifre güncellenemedi. Lütfen tekrar deneyin.",
    };
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}

export type CouponValidationResult =
  | { valid: true; packageName: string; durationDays: number | null }
  | { valid: false; error: string };

/** Kayıt formundaki anlık kupon doğrulaması (client-side preview için). */
export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, error: "Kupon kodu boş olamaz." };

  const coupon = await prisma.couponCode.findUnique({
    where: { code: trimmed },
    include: { package: { select: { name: true } } },
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, error: "Kupon kodu geçersiz veya devre dışı." };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, error: "Bu kupon kodunun süresi dolmuş." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "Bu kupon kodunun kullanım limiti dolmuş." };
  }

  return {
    valid: true,
    packageName: coupon.package.name,
    durationDays: coupon.durationDays,
  };
}
