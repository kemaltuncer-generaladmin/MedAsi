"use client";

import Link from "next/link";
import { Check, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import posthog from "posthog-js";

const freeFeatures = [
  { text: "Temel modüllere erişim", included: true },
  { text: "Vaka RPG (sınırlı)", included: true },
  { text: "Not alma & Flashcard", included: true },
  { text: "AI sorgusu yok", included: false },
  { text: "AI Tanı Asistanı", included: false },
  { text: "Öncelikli destek", included: false },
];

const girisFeatures = [
  { text: "Günlük 10 AI sorgusu", included: true },
  { text: "AI Tanı Asistanı", included: true },
  { text: "Vaka RPG (sınırlı)", included: true },
  { text: "Medikal Terminal", included: true },
  { text: "Sınırsız AI sorgusu", included: false },
  { text: "Öncelikli destek", included: false },
];

const proFeatures = [
  { text: "Sınırsız AI sorgusu", included: true },
  { text: "Tüm modüllere tam erişim", included: true },
  { text: "AI Asistan (sınırsız)", included: true },
  { text: "Günlük Brifing", included: true },
  { text: "Hasta & Vaka yönetimi", included: true },
  { text: "PDF dışa aktarma", included: true },
  { text: "Özel kurumsal destek", included: false },
];

const enterpriseFeatures = [
  { text: "Sınırsız her şey", included: true },
  { text: "10 kullanıcı hesabı", included: true },
  { text: "Özel kurumsal destek", included: true },
  { text: "Özelleştirilebilir modüller", included: true },
  { text: "API erişimi", included: true },
  { text: "Öncelikli AI modelleri", included: true },
  { text: "SLA garantisi", included: true },
];

const faqs = [
  {
    q: "Aylık planı iptal edebilir miyim?",
    a: "Evet, dilediğiniz zaman iptal edebilirsiniz. İptal işlemi sonrasında mevcut dönem sona erene kadar planınız aktif kalmaya devam eder. Herhangi bir ceza veya ek ücret uygulanmaz.",
  },
  {
    q: "AI sorgu limiti nasıl çalışır?",
    a: "Her gece gece yarısı (Türkiye saatiyle 00:00) sıfırlanır. Giriş paketinde günlük 10 sorgu hakkınız bulunmaktadır. Pro ve Kurumsal planlarda sınırsız sorgu yapabilirsiniz.",
  },
  {
    q: "Kurumsal plan nedir?",
    a: "Hastane ve klinikler için özel olarak tasarlanmış kurumsal planımız, 10 kullanıcı hesabı, SLA garantisi, API erişimi ve özel destek hattı gibi ayrıcalıklar sunar. Daha büyük ekipler için özel fiyatlandırma mevcuttur.",
  },
  {
    q: "Ödeme yöntemleri neler?",
    a: "Kredi kartı ve banka kartı (Visa, Mastercard, Troy) ile ödeme yapabilirsiniz. Kurumsal müşterilerimiz için fatura ile ödeme ve banka havalesi seçenekleri de mevcuttur.",
  },
];

export default function UpgradePage() {
  const handlePlanClick = (
    planName: string,
    action: "upgrade" | "contact_sales" | "start_trial",
  ) => {
    posthog.capture("plan_button_clicked", {
      plan_name: planName,
      action: action,
      location: "upgrade_page",
    });
  };
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <nav className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 sticky top-0 z-50">
        <Link
          href="/"
          className="text-xl font-bold text-[var(--color-text-primary)] tracking-wide"
        >
          MED<span className="text-[var(--color-primary)]">ASI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Giriş Yap
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Hesap Oluştur
            </Button>
          </Link>
        </div>
      </nav>

      <main>
        <section className="text-center py-16 px-6">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">
              Şeffaf fiyatlandırma — her zaman
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-4 leading-tight">
            Potansiyelinizi Ortaya Çıkarın
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Medikal eğitiminizi bir üst seviyeye taşıyın
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Ücretsiz */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3">
                  Ücretsiz
                </Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                  Ücretsiz
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Başlangıç için temel erişim
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                    ₺0
                  </span>
                  <span className="text-[var(--color-text-secondary)] mb-1">
                    / ay
                  </span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {freeFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check
                        size={15}
                        style={{ color: "var(--color-success)" }}
                        className="shrink-0"
                      />
                    ) : (
                      <X
                        size={15}
                        className="shrink-0 text-[var(--color-border)]"
                      />
                    )}
                    <span
                      className={`text-sm ${f.included ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]"}`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="md"
                disabled
                className="w-full border border-[var(--color-border)]"
              >
                Mevcut Plan
              </Button>
            </div>

            {/* Giriş */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3">
                  Giriş
                </Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                  Giriş
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Sınırlı AI ile başla
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                    ₺99
                  </span>
                  <span className="text-[var(--color-text-secondary)] mb-1">
                    / ay
                  </span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {girisFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check
                        size={15}
                        style={{ color: "var(--color-success)" }}
                        className="shrink-0"
                      />
                    ) : (
                      <X
                        size={15}
                        className="shrink-0 text-[var(--color-border)]"
                      />
                    )}
                    <span
                      className={`text-sm ${f.included ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]"}`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <a href={`/register?plan=giris`} className="w-full">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => handlePlanClick("Giriş", "upgrade")}
                >
                  Giriş Planına Geç
                </Button>
              </a>
            </div>

            {/* Pro */}
            <div
              className="bg-[var(--color-surface-elevated)] rounded-2xl p-7 flex flex-col relative overflow-hidden"
              style={{
                boxShadow:
                  "0 0 0 2px var(--color-primary), 0 0 32px 0 rgba(0,196,235,0.12)",
              }}
            >
              <style>{`
                @keyframes pulse-glow {
                  0%, 100% { box-shadow: 0 0 0 2px var(--color-primary), 0 0 32px 0 rgba(0,196,235,0.12); }
                  50% { box-shadow: 0 0 0 2px var(--color-primary), 0 0 48px 0 rgba(0,196,235,0.25); }
                }
              `}</style>
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
                }}
              />
              <div className="mb-6">
                <Badge variant="default" className="mb-3">
                  En Popüler
                </Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                  Pro
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Tam AI gücüyle çalış
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                    ₺249
                  </span>
                  <span className="text-[var(--color-text-secondary)] mb-1">
                    / ay
                  </span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    {f.included ? (
                      <Check
                        size={15}
                        style={{ color: "var(--color-success)" }}
                        className="shrink-0"
                      />
                    ) : (
                      <X
                        size={15}
                        className="shrink-0 text-[var(--color-border)]"
                      />
                    )}
                    <span
                      className={`text-sm ${f.included ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] line-through decoration-[var(--color-border)]"}`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <a href={`/register?plan=pro`} className="w-full">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => handlePlanClick("Pro", "upgrade")}
                >
                  Pro&apos;ya Geç
                </Button>
              </a>
            </div>

            {/* Kurumsal */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <Badge variant="secondary" className="mb-3">
                  Kurumsal
                </Badge>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                  Kurumsal
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Hastane ve klinikler için
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                    Demo
                  </span>
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-7">
                {enterpriseFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5">
                    <Check
                      size={15}
                      style={{ color: "var(--color-success)" }}
                      className="shrink-0"
                    />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => handlePlanClick("Kurumsal", "contact_sales")}
              >
                Demo Talep Et
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-2xl mx-auto px-6 pb-16">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-8">
            Sık Sorulan Sorular
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className="text-[var(--color-text-secondary)] shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="px-5 pb-4 pt-1 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="text-center pb-20 px-6">
          <div className="max-w-lg mx-auto bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-10">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              Hâlâ karar veremiyor musunuz?
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Kredi kartı gerektirmeden 14 gün ücretsiz deneyin.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => handlePlanClick("Trial", "start_trial")}
            >
              14 Gün Ücretsiz Deneme Başlatın
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
