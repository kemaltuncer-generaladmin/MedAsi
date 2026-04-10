"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { login } from "@/lib/actions/auth";
import { ROUTES } from "@/constants";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageSkeleton() {
  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="space-y-4">
        <div className="h-8 w-40 rounded bg-white/5" />
        <div className="h-4 w-56 rounded bg-white/5" />
        <div className="h-10 rounded bg-white/5" />
        <div className="h-10 rounded bg-white/5" />
        <div className="h-11 rounded bg-white/5" />
      </div>
    </Card>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loginMode, setLoginMode] = useState<"user" | "admin">("user");
  const formId = useMemo(
    () => `login-form-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const resetSuccess = searchParams.get("reset") === "success";
  const emailVerified = searchParams.get("verified") === "true";
  const registrationSuccess = searchParams.get("registered") === "true";
  const approvalPending = searchParams.get("approval") === "pending";
  const routeNotice =
    searchParams.get("reason") === "admin_login_disabled"
      ? "Yönetici girişi şu anda kapalı."
      : searchParams.get("reason") === "session_timeout"
        ? "Oturum süren dolduğu için güvenli çıkış yapıldı."
      : null;

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await login(formData);
        if (result && !result.success) {
          setError(result.error || "Bir hata oluştu");
        }
      } catch (submitError) {
        if (isRedirectError(submitError)) throw submitError;
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Bir hata oluştu",
        );
      }
    });
  };

  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="mb-8 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
          1 / 1 — Hesap Girişi
        </p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
            Sisteme Giriş Yap.
          </h1>
          <p className="text-sm italic text-[var(--color-text-secondary)]">
            Kariyerinin her aşamasında yanındayız.
          </p>
        </div>
      </div>

      {routeNotice && !error && (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(245,158,11,0.35)",
            backgroundColor: "rgba(245,158,11,0.08)",
            color: "rgba(253,224,71,1)",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{routeNotice}</span>
        </div>
      )}

      {error && (
        <div
          id="login-error"
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "#FF3B5C",
            backgroundColor: "rgba(255,59,92,0.08)",
            color: "#FF8DA1",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {emailVerified && (
        <div
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(52,199,89,0.35)",
            backgroundColor: "rgba(52,199,89,0.08)",
            color: "rgba(162,255,182,1)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>E-posta adresin doğrulandı. Giriş yapabilirsin.</span>
        </div>
      )}

      {resetSuccess && (
        <div
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(52,199,89,0.35)",
            backgroundColor: "rgba(52,199,89,0.08)",
            color: "rgba(162,255,182,1)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</span>
        </div>
      )}

      {registrationSuccess && (
        <div
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(52,199,89,0.35)",
            backgroundColor: "rgba(52,199,89,0.08)",
            color: "rgba(162,255,182,1)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>
            {approvalPending
              ? "Kaydın alındı. Yönetici onayı sonrası giriş yapabileceksin."
              : "Kaydın tamamlandı. Giriş yapabilirsin."}
          </span>
        </div>
      )}

      <form id={formId} action={handleSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="loginMode" value="user" />
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            E-posta
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              aria-hidden="true"
            />
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              aria-describedby={error ? "login-error" : undefined}
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Şifre
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              aria-hidden="true"
            />
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              aria-required="true"
              className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10 pr-11 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              className="w-4 h-4 rounded border border-[#1E1E2E] bg-[var(--color-background)] accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--color-text-secondary)]">Beni hatırla</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--color-primary)] transition-opacity hover:opacity-80"
          >
            Şifreni mi unuttun?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-[4px] border-0 bg-[var(--color-primary)] text-sm font-semibold text-[#020617] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Giriş yapılıyor...
            </>
          ) : (
            <>Giriş Yap →</>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Hesabın yok mu?{" "}
          <Link
            href={ROUTES.register}
            className="text-[var(--color-primary)] transition-opacity hover:opacity-80"
          >
            Kayıt Ol
          </Link>
        </p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-text-disabled)] [font-family:var(--font-mono)]">
          AUTHORIZED PERSONNEL ONLY // KVKK COMPLIANT
        </p>
      </div>
    </Card>
  );
}
