import Link from "next/link";

export default function NotFound() {
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
            "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(0,196,235,0.07) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Error code */}
        <p
          className="text-[96px] font-black leading-none select-none"
          style={{ color: "rgba(0,196,235,0.15)", fontVariantNumeric: "tabular-nums" }}
          aria-hidden="true"
        >
          404
        </p>

        {/* Logo */}
        <div className="text-xl font-bold tracking-tight -mt-4">
          MED<span style={{ color: "#00C4EB" }}>ASİ</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sayfa Bulunamadı</h1>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir. Endişelenme — seni doğru yere götürelim.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
            style={{ background: "#00C4EB", color: "#0A0A0C" }}
          >
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-white/5"
            style={{ borderColor: "#1E1E24", color: "#94A3B8" }}
          >
            Dashboard'a Git
          </Link>
        </div>
      </div>
    </div>
  );
}
