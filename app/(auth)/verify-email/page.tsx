"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="flex flex-col items-center text-center gap-5">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Doğrulama sayfası yükleniyor...
        </p>
      </div>
    </Card>
  );
}

function VerifyEmailPageContent() {
  const params = useSearchParams();
  const email = useMemo(() => params.get("email")?.trim().toLowerCase() ?? "", [params]);
  const name = useMemo(() => params.get("name")?.trim() ?? "MedAsi kullanıcısı", [params]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [cooldown, setCooldown] = useState(0);

  const triggerCooldown = () => {
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  async function resendVerificationEmail() {
    if (!email || loading || cooldown > 0) return;
    setLoading(true);
    setStatus({ type: null, message: "" });
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userName: name }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Doğrulama e-postası gönderilemedi.");
      }
      setStatus({
        type: "success",
        message: "Doğrulama e-postası tekrar gönderildi.",
      });
      triggerCooldown();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Doğrulama e-postası gönderilemedi.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      variant="bordered"
      className="border-[#1E1E2E] bg-[#0F0F14] p-7 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] sm:p-8"
    >
      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
          <Mail size={36} className="text-[var(--color-primary)]" />
        </div>

        <div className="space-y-3">
          <h1 className="text-[26px] font-bold leading-tight text-[var(--color-text-primary)]">
            E-postanı Doğrula
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm">
            {email
              ? `${email} adresine doğrulama bağlantısı gönderildi.`
              : "Hesabını etkinleştirmek için e-posta adresine doğrulama bağlantısı gönderdik."}{" "}
            Gelen kutunu ve spam klasörünü kontrol et.
          </p>
        </div>

        <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-4 space-y-2">
          {[
            "1. E-posta kutunu aç",
            "2. MEDASI'den gelen mesajı bul",
            '3. "E-postamı Doğrula" butonuna tıkla',
            "4. Sisteme giriş yap",
          ].map((step) => (
            <div key={step} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {step}
              </span>
            </div>
          ))}
        </div>

        {status.type && (
          <div
            className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-sm border"
            style={{
              borderColor:
                status.type === "success"
                  ? "rgba(34,197,94,.3)"
                  : "rgba(255,59,92,.3)",
              backgroundColor:
                status.type === "success"
                  ? "rgba(34,197,94,.08)"
                  : "rgba(255,59,92,.08)",
              color: status.type === "success" ? "#86efac" : "#fda4af",
            }}
          >
            {status.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={resendVerificationEmail}
          disabled={!email || loading || cooldown > 0}
          className="w-full h-11 rounded-md text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #0891b2))",
            color: "#04131f",
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Gönderiliyor...
            </span>
          ) : cooldown > 0 ? (
            `Tekrar gönder (${cooldown}s)`
          ) : (
            "Doğrulama E-postasını Tekrar Gönder"
          )}
        </button>

        <p className="text-xs text-[var(--color-text-secondary)]">
          E-posta gelmedi mi? Birkaç dakika bekle veya spam klasörünü kontrol et.
        </p>

        <Link
          href="/welcome"
          className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={14} />
          Giriş sayfasına dön
        </Link>
      </div>
    </Card>
  );
}
