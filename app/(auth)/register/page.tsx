"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { register, validateCoupon, type CouponValidationResult } from "@/lib/actions/auth";
import { PACKAGE_SELECTION_OPTIONS, SENIORITY_OPTIONS } from "@/lib/schemas/auth";
import { ROUTES } from "@/constants";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [medicalDataConsentAccepted, setMedicalDataConsentAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<CouponValidationResult | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const couponTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formId = useMemo(
    () => `register-form-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;
  const packageLabels: Record<(typeof PACKAGE_SELECTION_OPTIONS)[number], string> = {
    ucretsiz: "Ücretsiz — 75K token · 150 soru/ay",
    giris: "Giriş — ₺149/ay · 250K token · 500 soru/ay",
    pro: "Pro — ₺399/ay · 500K token · tam erişim",
    enterprise: "Kurumsal / Grup — özel kapsam",
  };

  useEffect(() => {
    return () => {
      if (couponTimer.current) clearTimeout(couponTimer.current);
    };
  }, []);

  function handleCouponChange(value: string) {
    setCouponCode(value);
    setCouponState(null);
    if (couponTimer.current) clearTimeout(couponTimer.current);
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    couponTimer.current = setTimeout(async () => {
      setCouponChecking(true);
      try {
        const result = await validateCoupon(trimmed);
        setCouponState(result);
      } finally {
        setCouponChecking(false);
      }
    }, 600);
  }

  const handleSubmit = async (formData: FormData) => {
    setError(null);

    const nextPassword = String(formData.get("password") ?? "");
    const nextConfirmPassword = String(formData.get("confirmPassword") ?? "");

    if (nextPassword !== nextConfirmPassword) {
      setError("Şifreler birbiriyle eşleşmiyor");
      return;
    }

    formData.delete("confirmPassword");

    startTransition(async () => {
      try {
        const result = await register(formData);
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
      className="border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="mb-8 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
          1 / 2 — Hesap Bilgileri
        </p>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
            Sisteme Bağlan.
          </h1>
          <p className="text-sm italic text-[var(--color-text-secondary)]">
            Hangi aşamada olursan ol, seni tanıyoruz.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mb-5 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "#FF3B5C",
            backgroundColor: "rgba(255,59,92,0.08)",
            color: "#FF8DA1",
          }}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form id={formId} action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="register-name"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Ad Soyad
          </label>
          <div className="relative">
            <User
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              id="register-name"
              name="name"
              type="text"
              placeholder="Dr. Ayşe Kaya"
              required
              autoComplete="name"
              aria-required="true"
              className="h-11 rounded border-[var(--color-border)] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="register-email"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            E-posta
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              id="register-email"
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              autoComplete="email"
              inputMode="email"
              aria-required="true"
              className="h-11 rounded border-[var(--color-border)] bg-[var(--color-background)] pl-10 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="register-password"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Şifre
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              aria-required="true"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-11 focus:ring-[var(--color-primary)]"
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

        <div className="space-y-1.5">
          <label
            htmlFor="register-confirm-password"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Şifre Tekrar
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              aria-required="true"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={!passwordsMatch ? "Şifreler eşleşmiyor" : undefined}
              className="h-11 rounded border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-11 focus:ring-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              aria-label={
                showConfirmPassword
                  ? "Şifre tekrarını gizle"
                  : "Şifre tekrarını göster"
              }
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="register-package"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Paket
          </label>
          <div className="relative">
            <select
              id="register-package"
              name="selectedPackage"
              required
              defaultValue=""
              className="h-11 w-full appearance-none rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 pr-11 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option
                value=""
                disabled
                className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              >
                Paket seçin
              </option>
              {PACKAGE_SELECTION_OPTIONS.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                >
                  {packageLabels[option]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
          </div>
        </div>

        {/* Kupon kodu alanı */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-coupon"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Kupon Kodu{" "}
            <span className="normal-case tracking-normal opacity-50">(isteğe bağlı)</span>
          </label>
          <div className="relative">
            <Tag
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <Input
              id="register-coupon"
              name="couponCode"
              type="text"
              placeholder="MEDASI2025"
              value={couponCode}
              onChange={(e) => handleCouponChange(e.target.value)}
              autoComplete="off"
              className="h-11 rounded border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-10 uppercase tracking-widest focus:ring-[var(--color-primary)]"
              style={{
                borderColor:
                  couponState?.valid === true
                    ? "var(--color-success)"
                    : couponState?.valid === false
                      ? "#FF3B5C"
                      : undefined,
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {couponChecking && (
                <Loader2 size={15} className="animate-spin text-[var(--color-text-secondary)]" />
              )}
              {!couponChecking && couponState?.valid === true && (
                <CheckCircle2 size={15} className="text-[var(--color-success)]" />
              )}
              {!couponChecking && couponState?.valid === false && (
                <XCircle size={15} style={{ color: "#FF3B5C" }} />
              )}
            </div>
          </div>
          {/* Kupon durumu mesajı */}
          {couponState?.valid === true && (
            <div
              className="flex items-start gap-2 rounded px-3 py-2 text-xs"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "var(--color-success)",
              }}
            >
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>{couponState.packageName}</strong> paketi aktif edilecek
                {couponState.durationDays != null
                  ? ` · ${couponState.durationDays} gün erişim`
                  : " · Süresiz erişim"}
              </span>
            </div>
          )}
          {couponState?.valid === false && (
            <p className="text-xs" style={{ color: "#FF8DA1" }}>
              {couponState.error}
            </p>
          )}
          {/* Geçerli kupon varsa paket seçimini gizle */}
          {couponState?.valid === true && (
            <p className="text-[10px] text-[var(--color-text-secondary)] opacity-60">
              Paket seçimi kupon tarafından otomatik belirlenecek.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="register-seniority"
            className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]"
          >
            Uzmanlık Aşaması
          </label>
          <div className="relative">
            <select
              id="register-seniority"
              name="seniority"
              required
              defaultValue=""
              className="h-11 w-full appearance-none rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 pr-11 text-sm text-[var(--color-text-primary)] outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option
                value=""
                disabled
                className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              >
                Bir aşama seçin
              </option>
              {SENIORITY_OPTIONS.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                >
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            name="termsAccepted"
            required
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            className="w-4 h-4 mt-0.5 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-background)] accent-[var(--color-primary)]"
          />
          <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <input type="hidden" name="privacyAccepted" value={legalAccepted ? "true" : "false"} />
            <Link href="/terms" className="text-[var(--color-primary)] hover:opacity-80">
              Kullanım Şartları
            </Link>
            {" ve "}
            <Link href="/privacy" className="text-[var(--color-primary)] hover:opacity-80">
              Gizlilik/KVKK
            </Link>
            {" metinlerini okudum ve kabul ediyorum."}
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="medicalDataConsentAccepted"
            required
            checked={medicalDataConsentAccepted}
            onChange={(e) => setMedicalDataConsentAccepted(e.target.checked)}
            className="w-4 h-4 mt-0.5 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-background)] accent-[var(--color-primary)]"
          />
          <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Hasta/sağlık verisi gibi özel nitelikli verileri yalnızca yetkili kullanım amacıyla işleyeceğimi, platformun eğitim amaçlı olduğunu ve klinik karar sorumluluğunun kullanıcıda olduğunu kabul ediyorum.
          </span>
        </label>

        <Button
          type="submit"
          disabled={
            isPending ||
            !passwordsMatch ||
            !legalAccepted ||
            !medicalDataConsentAccepted
          }
          className="h-11 w-full rounded border-0 bg-[var(--color-primary)] text-sm font-semibold text-[#020617] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Kayıt yapılıyor...
            </>
          ) : (
            <>Hesap Oluştur →</>
          )}
        </Button>

        <p className="text-xs text-center text-[var(--color-text-secondary)] pt-1">
          Kayıt olduktan sonra e-posta doğrulaması gerekmektedir.
        </p>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Zaten hesabın var mı?{" "}
          <Link
            href={ROUTES.login}
            className="text-[var(--color-primary)] transition-opacity hover:opacity-80"
          >
            Giriş Yap
          </Link>
        </p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[var(--color-text-disabled)] [font-family:var(--font-mono)]">
          AUTHORIZED PERSONNEL ONLY // KVKK COMPLIANT
        </p>
      </div>
    </Card>
  );
}
