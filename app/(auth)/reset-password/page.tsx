"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { completePasswordReset } from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch =
    password.length === 0 ||
    confirmPassword.length === 0 ||
    password === confirmPassword;

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => {
      router.replace("/login?reset=success");
    }, 1400);
    return () => clearTimeout(timeout);
  }, [success, router]);

  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="mb-6 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
          Şifre Kurtarma
        </p>
        <h1 className="text-[28px] font-bold leading-none text-[var(--color-text-primary)]">
          Yeni Şifre Belirle
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          E-posta üzerinden gelen güvenli bağlantı ile yeni şifreni oluştur.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-3 border px-3 py-3 text-sm"
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

      {!success && (
        <div
          className="mb-4 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(0,196,235,0.24)",
            backgroundColor: "rgba(0,196,235,0.08)",
            color: "var(--color-text-secondary)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
          <span>Bu sayfaya yalnızca şifre sıfırlama bağlantısı ile erişebilirsin.</span>
        </div>
      )}

      {success && (
        <div
          className="mb-4 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(52,199,89,0.4)",
            backgroundColor: "rgba(52,199,89,0.08)",
            color: "rgba(162,255,182,1)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Şifren güncellendi. Giriş ekranına yönlendiriliyorsun.</span>
        </div>
      )}

      {!success && (
        <form
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              try {
                const result = await completePasswordReset(fd);
                if (result && !result.success) {
                  setError(result.error || "Şifre güncellenemedi");
                  return;
                }
                setSuccess(true);
              } catch (e) {
                if (isRedirectError(e)) throw e;
                setError(e instanceof Error ? e.message : "Şifre güncellenemedi");
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] font-mono">
              Yeni Şifre
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-widest text-[var(--color-text-secondary)] font-mono">
              Yeni Şifre Tekrar
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <Input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!passwordsMatch ? "Şifreler eşleşmiyor" : undefined}
                className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)] pl-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || !passwordsMatch}
            className="w-full h-11 rounded-[4px]"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              "Şifremi Güncelle"
            )}
          </Button>
        </form>
      )}
    </Card>
  );
}
