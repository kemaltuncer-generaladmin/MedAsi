import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const PLANS = [
  {
    name: "Ucretsiz",
    price: "₺0",
    note: "Temel araclar",
    features: ["Pomodoro", "Not alma", "Temel plan"],
  },
  {
    name: "Giris",
    price: "₺99",
    note: "Ogrenci paketi",
    features: ["AI flashcard", "Soru aciklama", "Ogrenme analizi"],
  },
  {
    name: "Pro",
    price: "₺249",
    note: "En populer",
    features: ["Sinirsiz AI tani", "Vaka RPG", "Medikal terminal"],
  },
];

const FAQS = [
  {
    q: "Ucretsiz planda neler var?",
    a: "Temel planlayicilar, not alma ve belirli cekirdek moduller kullanima acik.",
  },
  {
    q: "Paketimi sonradan yukseltebilir miyim?",
    a: "Evet. Hesap ayarlari veya upgrade ekrani uzerinden aninda gecis yapabilirsin.",
  },
  {
    q: "Kurumsal kullanim var mi?",
    a: "Evet. Grup lisans ve raporlama ihtiyaclari icin kurumsal paket mevcut.",
  },
];

export function StatsSection() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Vaka Verisi", value: "400.000+" },
          { label: "Aktif Kullanici", value: "2.800+" },
          { label: "TUS Basari", value: "%94" },
          { label: "AI Yanit", value: "1.2 sn" },
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-2xl font-semibold text-cyan-300">{item.value}</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section id="fiyatlandirma" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">Basit ve net fiyatlandirma</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{plan.name}</h3>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{plan.price}<span className="ml-1 text-sm text-[var(--color-text-secondary)]">/ay</span></p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{plan.note}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <Check size={14} className="text-cyan-300" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
              >
                Paketi Dene
                <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Kullanici geri bildirimi</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
          "Daha az ekranda daha fazla is yapiyorum. Soru, not ve plan tek akis oldugu icin calisma hizi ciddi artti."
        </p>
      </div>
    </section>
  );
}

export function FAQSection() {
  return (
    <section id="sss" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">Sik Sorulan Sorular</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-text-primary)]">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FooterCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Calismaya hiz kazandir</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Hesabini ac, hedefini belirle, bugunden ritmini yakala.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white">
            Giris Yap
          </Link>
          <Link href="/register" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black">
            Ucretsiz Basla
          </Link>
        </div>
      </div>
    </section>
  );
}
