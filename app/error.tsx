"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hata izleme servisine raporla (production'da Sentry vb.)
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0A0A0C", color: "#FFFFFF" }}
    >
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,59,92,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Error icon */}
        <p
          className="text-[80px] leading-none select-none"
          aria-hidden="true"
        >
          ⚡
        </p>

        {/* Logo */}
        <div className="text-xl font-bold tracking-tight">
          MED<span style={{ color: "#00C4EB" }}>ASİ</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Bir Şeyler Ters Gitti</h1>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Beklenmedik bir hata oluştu. Bu senin hatan değil — ekibimiz haberdar edildi. Sayfayı yenilemeyi ya da birkaç dakika sonra tekrar denemeyi deneyelim.
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <p className="mt-2 text-xs font-mono text-[#FF8DA1] bg-[rgba(255,59,92,0.08)] border border-[#FF3B5C33] rounded px-3 py-2 text-left break-words">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={{ background: "#00C4EB", color: "#0A0A0C" }}
          >
            Tekrar Dene
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-white/5"
            style={{ borderColor: "#1E1E24", color: "#94A3B8" }}
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
