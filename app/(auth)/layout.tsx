import type { ReactNode } from "react";

const stats = [
  { value: "400.000+", label: "Simülasyon" },
  { value: "47", label: "Uzmanlık" },
  { value: "12", label: "Üniversite" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <div className="grid min-h-screen lg:grid-cols-[55fr_45fr]">
        <aside className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,229,255,0.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(20,0,166,0.28),transparent_40%),linear-gradient(135deg,#08080d_0%,#0b0b12_45%,#10101b_100%)]" />
          <div className="absolute inset-0 auth-pulse opacity-50" />
          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10">
            <div>
              <div className="font-semibold tracking-[0.24em] text-[var(--color-text-primary)]">
                MED<span className="text-[var(--color-primary)]">ASİ</span>
              </div>
            </div>

            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center border border-[var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--color-primary)] [font-family:var(--font-mono)]">
                Medical Intelligence System
              </div>
              <div className="space-y-3">
                <h1 className="max-w-lg text-4xl font-semibold leading-tight">
                  Klinik pratiğe hazırlık için güvenli, hızlı ve derinlikli
                  dijital eğitim alanı.
                </h1>
                <p className="max-w-md text-sm italic text-[var(--color-text-secondary)]">
                  Simülasyon, takip, karar desteği ve geri bildirim tek akışta
                  birleşir.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="border border-[var(--color-border)] bg-[#0F0F14]/70 p-4 backdrop-blur-sm"
                >
                  <div className="text-2xl text-[var(--color-primary)] [font-family:var(--font-mono)]">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)] [font-family:var(--font-mono)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>

      <style>{`
        @keyframes authPulse {
          0% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
          100% { opacity: 0.25; transform: scale(1); }
        }
        .auth-pulse {
          background: radial-gradient(circle at 50% 50%, rgba(0,229,255,0.12), transparent 35%);
          animation: authPulse 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
