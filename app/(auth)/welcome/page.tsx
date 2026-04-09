"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
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
import { login, register, validateCoupon, type CouponValidationResult } from "@/lib/actions/auth";
import { PACKAGE_SELECTION_OPTIONS, SENIORITY_OPTIONS } from "@/lib/schemas/auth";

type Tab = "login" | "register";
const PACKAGE_LABELS: Record<(typeof PACKAGE_SELECTION_OPTIONS)[number], string> = {
  ucretsiz: "Ücretsiz — Temel Araçlar",
  giris: "Giriş — ₺99/ay (Sınırlı AI)",
  pro: "Pro — ₺249/ay (Tam AI)",
  enterprise: "Kurumsal / Grup",
};

export default function WelcomePage() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="w-full space-y-6">
      <div className="flex rounded-[4px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-2.5 text-sm font-medium transition-all duration-150",
              tab === t
                ? "bg-[var(--color-primary)] text-black"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            ].join(" ")}
          >
            {t === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        ))}
      </div>
      {tab === "login" ? <LoginForm /> : <RegisterForm />}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="mb-4 flex items-start gap-2 border px-3 py-2 text-sm rounded-sm"
      style={{
        borderColor: "#FF3B5C",
        backgroundColor: "rgba(255,59,92,0.08)",
        color: "#FF8DA1",
      }}
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card
      variant="bordered"
      className="border-[var(--color-border)] bg-[#0F0F14] p-7"
    >
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Sisteme Giriş Yap
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Kariyerinin her aşamasında yanındayız.
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <form
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            try {
              const r = await login(fd);
              if (r && !r.success) setError(r.error || "Hata oluştu");
            } catch (e) {
              if (isRedirectError(e)) throw e;
              setError(e instanceof Error ? e.message : "Hata oluştu");
            }
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            E-posta
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Şifre
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              required
              className="pl-10 pr-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="rememberMe"
              className="w-4 h-4 rounded border border-[var(--color-border)] bg-[var(--color-background)] accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--color-text-secondary)]">Beni hatırla</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
          >
            Şifreni mi unuttun?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="w-full h-11 rounded-[4px]"
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Giriş yapılıyor...
            </>
          ) : (
            "Giriş Yap →"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-[var(--color-text-secondary)] mt-4 font-mono uppercase tracking-widest">
        AUTHORIZED PERSONNEL ONLY
      </p>
    </Card>
  );
}

function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, startTransition] = useTransition();
  const match = cpw.length === 0 || pw === cpw;
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<CouponValidationResult | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const couponTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Simple password strength
  const strength =
    pw.length === 0
      ? 0
      : pw.length < 6
        ? 1
        : pw.length < 10
          ? 2
          : /[A-Z]/.test(pw) && /[0-9]/.test(pw)
            ? 4
            : 3;
  const strengthColors = ["", "#FF3B5C", "#FF9500", "#00C4EB", "#34C759"];
  const strengthLabels = ["", "Çok Zayıf", "Zayıf", "Orta", "Güçlü"];

  return (
    <Card
      variant="bordered"
      className="border-[var(--color-border)] bg-[#0F0F14] p-7"
    >
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Hesap Oluştur
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Ücretsiz başlayın, istediğiniz zaman yükseltin.
        </p>
      </div>

      {error && <ErrorBox message={error} />}

      <form
        action={(fd) => {
          setError(null);
          if (String(fd.get("password")) !== String(fd.get("confirmPassword"))) {
            setError("Şifreler eşleşmiyor");
            return;
          }
          fd.delete("confirmPassword");
          startTransition(async () => {
            try {
              const r = await register(fd);
              if (r && !r.success) setError(r.error || "Hata oluştu");
            } catch (e) {
              if (isRedirectError(e)) throw e;
              setError(e instanceof Error ? e.message : "Hata oluştu");
            }
          });
        }}
        className="space-y-3"
      >
        {/* Ad Soyad */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Ad Soyad
          </label>
          <div className="relative">
            <User
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="name"
              type="text"
              placeholder="Ad Soyad"
              required
              className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]"
            />
          </div>
        </div>

        {/* E-posta */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            E-posta
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="email"
              type="email"
              placeholder="dr@ornek.com"
              required
              className="pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]"
            />
          </div>
        </div>

        {/* Şifre */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Şifre
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="En az 6 karakter"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)]"
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {pw.length > 0 && (
            <div className="mt-1.5 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        i <= strength ? strengthColors[strength] : "var(--color-border)",
                    }}
                  />
                ))}
              </div>
              <p className="text-xs" style={{ color: strengthColors[strength] }}>
                {strengthLabels[strength]}
              </p>
            </div>
          )}
        </div>

        {/* Şifre Tekrar */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Şifre Tekrar
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              value={cpw}
              onChange={(e) => setCpw(e.target.value)}
              className={`pl-10 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)] ${!match ? "border-[#FF3B5C]" : ""}`}
            />
          </div>
          {!match && (
            <p className="text-xs text-[#FF8DA1] mt-1">Şifreler eşleşmiyor</p>
          )}
        </div>

        {/* Sınıf */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Paket
          </label>
          <div className="relative">
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <select
              name="selectedPackage"
              required
              defaultValue=""
              className="w-full h-11 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)] pl-3 pr-10 focus:outline-none focus:border-[var(--color-primary)] appearance-none"
            >
              <option value="" disabled className="bg-[#070709]">
                Paket seçin
              </option>
              {PACKAGE_SELECTION_OPTIONS.map((pkg) => (
                <option key={pkg} value={pkg} className="bg-[#070709]">
                  {PACKAGE_LABELS[pkg]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kupon kodu */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Kupon Kodu{" "}
            <span className="normal-case tracking-normal opacity-50">(isteğe bağlı)</span>
          </label>
          <div className="relative">
            <Tag
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <Input
              name="couponCode"
              type="text"
              placeholder="MEDASI2025"
              value={couponCode}
              onChange={(e) => handleCouponChange(e.target.value)}
              autoComplete="off"
              className="pl-10 pr-9 h-11 rounded-[4px] border-[var(--color-border)] bg-[var(--color-background)] uppercase tracking-widest"
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
              {couponChecking && <Loader2 size={14} className="animate-spin text-[var(--color-text-secondary)]" />}
              {!couponChecking && couponState?.valid === true && <CheckCircle2 size={14} className="text-[var(--color-success)]" />}
              {!couponChecking && couponState?.valid === false && <XCircle size={14} style={{ color: "#FF3B5C" }} />}
            </div>
          </div>
          {couponState?.valid === true && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "var(--color-success)" }}>
              <CheckCircle2 size={12} />
              <span>
                <strong>{couponState.packageName}</strong>
                {couponState.durationDays != null ? ` · ${couponState.durationDays} gün erişim` : " · Süresiz erişim"}
              </span>
            </div>
          )}
          {couponState?.valid === false && (
            <p className="text-xs mt-1" style={{ color: "#FF8DA1" }}>{couponState.error}</p>
          )}
        </div>

        {/* Sınıf */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5 font-mono">
            Sınıf
          </label>
          <div className="relative">
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
            />
            <select
              name="seniority"
              required
              defaultValue=""
              className="w-full h-11 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text-primary)] pl-3 pr-10 focus:outline-none focus:border-[var(--color-primary)] appearance-none"
            >
              <option value="" disabled className="bg-[#070709]">
                Sınıf seçin
              </option>
              {SENIORITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#070709]">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            required
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="w-4 h-4 mt-0.5 shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-background)] accent-[var(--color-primary)]"
          />
          <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Kullanım şartlarını ve gizlilik politikasını kabul ediyorum
          </span>
        </label>

        <Button
          type="submit"
          disabled={pending || !match || !termsAccepted}
          className="w-full h-11 rounded-[4px] mt-1"
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Kayıt olunuyor...
            </>
          ) : (
            "Hesap Oluştur →"
          )}
        </Button>

        <p className="text-xs text-center text-[var(--color-text-secondary)] pt-1">
          Kayıt olduktan sonra e-posta doğrulaması gerekmektedir.
        </p>
      </form>
    </Card>
  );
}
