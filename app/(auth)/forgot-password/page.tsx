"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          Şifreni Sıfırla
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          E-posta adresini yaz, sıfırlama bağlantısını güvenli şekilde gönderelim.
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

      {sent ? (
        <div
          className="mb-4 flex items-start gap-3 border px-3 py-3 text-sm"
          style={{
            borderColor: "rgba(52,199,89,0.4)",
            backgroundColor: "rgba(52,199,89,0.08)",
            color: "rgba(162,255,182,1)",
          }}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>
            Eğer bu e-posta ile ilişkili bir hesap varsa, sıfırlama bağlantısı gönderildi.
          </span>
        </div>
      ) : null}

      <form
        action={(fd) => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await requestPasswordReset(fd);
              if (result && !result.success) {
                setError(result.error || "İstek tamamlanamadı");
                return;
              }
              setSent(true);
            } catch (e) {
              if (isRedirectError(e)) throw e;
              setError(e instanceof Error ? e.message : "İstek tamamlanamadı");
            }
          });
        }}
        className="space-y-4"
      >
        <Input
          name="email"
          type="email"
          label="E-posta"
          placeholder="dr@ornek.com"
          required
          className="h-11 rounded-[4px] border-[#1E1E2E] bg-[var(--color-background)]"
          hint="Güvenlik için hesap olup olmadığı açıklanmaz."
        />

        <Button type="submit" disabled={isPending} className="w-full h-11 rounded-[4px]">
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            <>
              <Mail size={16} />
              Sıfırlama Bağlantısı Gönder
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Giriş ekranına dönmek ister misin?{" "}
          <Link
            href="/welcome"
            className="text-[var(--color-primary)] transition-opacity hover:opacity-80"
          >
            Geri dön
          </Link>
        </p>
      </div>
    </Card>
  );
}
