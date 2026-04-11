import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fiyatlar — Medasi",
  description: "MEDASI platformunun aylık ve yıllık abonelik fiyatları ve paket karşılaştırması.",
};

const PLANS = [
  {
    name: "Ücretsiz",
    price: "₺0",
    period: "sonsuza kadar",
    color: "#94A3B8",
    highlight: false,
    description: "Temel araçları keşfetmek için.",
    features: [
      "Pomodoro zamanlayıcı",
      "Ders ve staj planlayıcısı",
      "Klinik not alma",
      "Hasta takip (5 hasta)",
      "75K AI token",
      "Soru bankası: 150 soru / ay",
    ],
    missing: ["Sınav modülleri kapalı"],
    cta: "Hemen Başla",
    href: "/register",
    ctaStyle: "border",
  },
  {
    name: "Giriş",
    price: "₺149",
    priceyearly: "₺129",
    period: "/ay",
    color: "#00C4EB",
    highlight: false,
    description: "AI destekli öğrenmeye başlamak için.",
    features: [
      "Ücretsiz planın tüm özellikleri",
      "250K AI token",
      "Flashcard ve soru akışları",
      "Kaynak / not akışları",
      "Soru bankası: 500 soru / ay",
      "Kullanıcı bazlı addon satın alabilme",
    ],
    missing: ["Sınav modülleri kapalı"],
    cta: "Giriş Planını Seç",
    href: "/register?plan=giris",
    ctaStyle: "border",
  },
  {
    name: "Pro",
    price: "₺399",
    priceyearly: "₺349",
    period: "/ay",
    color: "#00C4EB",
    highlight: true,
    badge: "En Popüler",
    description: "Tam AI deneyimi ve sınav hazırlığı.",
    features: [
      "Giriş planının tüm özellikleri",
      "500K AI token",
      "Tüm sınav modülleri",
      "Sınırsız soru bankası",
      "Tanı, mentor ve ileri AI akışları",
      "Vaka ve klinik yönetim modülleri",
      "Öncelikli destek",
    ],
    missing: [],
    cta: "Pro Planını Seç",
    href: "/register?plan=pro",
    ctaStyle: "filled",
  },
  {
    name: "Kurumsal",
    price: "Özel Fiyat",
    period: "",
    color: "#F59E0B",
    highlight: false,
    description: "Fakülte ve klinikler için toplu lisans.",
    features: [
      "Pro planının tüm özellikleri",
      "Admin panelinden özel kapsam tanımı",
      "Toplu lisans ve kurum yönetimi",
      "Kullanıcı bazlı erişim kurguları",
      "Kurumsal destek ve özel iş akışı",
    ],
    missing: [],
    cta: "Demo Talep Et",
    href: "/contact",
    ctaStyle: "gold",
  },
];

const FAQ = [
  {
    q: "Ücretsiz deneme kredi kartı gerektiriyor mu?",
    a: "Hayır. 14 günlük deneme sürecinde kart bilgisi istenmez. Süre bitiminde ücretli plana geçmek isterseniz bilgilerinizi girebilirsiniz.",
  },
  {
    q: "İstediğim zaman iptal edebilir miyim?",
    a: "Evet, aboneliğinizi Ayarlar > Abonelik bölümünden istediğiniz zaman iptal edebilirsiniz. Bir sonraki fatura dönemi başlayana kadar erişiminiz devam eder.",
  },
  {
    q: "Yıllık planı seçersem ne kadar kazanırım?",
    a: "Giriş planında aylık ₺149 yerine ₺129/ay, Pro planında aylık ₺399 yerine ₺349/ay ödersiniz.",
  },
  {
    q: "Kurumsal fiyat nasıl belirleniyor?",
    a: "Kullanıcı sayısı, ihtiyaç duyulan özellikler ve sözleşme süresine göre özelleştirilmiş teklif hazırlanır. Formu doldurun, 24 saat içinde dönelim.",
  },
  {
    q: "Öğrenci indirimi var mı?",
    a: "Aktif tıp fakültesi öğrencileri için kupon kodu ile ek indirim sunulmaktadır. Kayıt ekranındaki kupon alanına üniversite e-posta adresinizle başvurun.",
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <span
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ background: "rgba(0,196,235,0.08)", border: "1px solid rgba(0,196,235,0.2)", color: "#00C4EB" }}
        >
          Şeffaf Fiyatlandırma
        </span>
        <h1 className="text-4xl font-bold">İhtiyacına Uygun Planı Seç</h1>
        <p style={{ color: "#94A3B8" }}>
          Tüm planlarda 14 günlük ücretsiz deneme. Kredi kartı gerekmez.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="rounded-2xl p-6 flex flex-col gap-4 relative"
            style={{
              background: plan.highlight ? "rgba(0,196,235,0.05)" : "#141419",
              border: plan.highlight ? "1px solid rgba(0,196,235,0.35)" : "1px solid #1E1E24",
            }}
          >
            {plan.badge && (
              <span
                className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,196,235,0.15)", color: "#00C4EB" }}
              >
                {plan.badge}
              </span>
            )}

            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: plan.color }}>
                {plan.name}
              </p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black">{plan.price}</span>
                {plan.period && <span className="text-sm mb-1" style={{ color: "#94A3B8" }}>{plan.period}</span>}
              </div>
              {plan.priceyearly && (
                <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                  Yıllık: {plan.priceyearly}/ay · ~%20 indirim
                </p>
              )}
              <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>{plan.description}</p>
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span style={{ color: "#22C55E" }} className="mt-0.5 shrink-0">✓</span>
                  <span style={{ color: "#CBD5E1" }}>{f}</span>
                </li>
              ))}
              {plan.missing.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span style={{ color: "#64748B" }} className="mt-0.5 shrink-0">✗</span>
                  <span style={{ color: "#64748B" }}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className="block text-center py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
              style={
                plan.ctaStyle === "filled"
                  ? { background: "#00C4EB", color: "#0A0A0C" }
                  : plan.ctaStyle === "gold"
                  ? { border: "1px solid #F59E0B", color: "#F59E0B" }
                  : { border: "1px solid #1E1E24", color: "#94A3B8" }
              }
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Sık Sorulan Sorular</h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-xl p-5"
              style={{ background: "#141419", border: "1px solid #1E1E24" }}
            >
              <p className="font-semibold text-sm mb-2">{item.q}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA band */}
      <div
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: "rgba(0,196,235,0.05)", border: "1px solid rgba(0,196,235,0.15)" }}
      >
        <h3 className="text-xl font-bold">Hâlâ kararsız mısın?</h3>
        <p className="text-sm" style={{ color: "#94A3B8" }}>
          Ücretsiz planla başla, istediğinde yükselt. Taahhüt yok.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px"
          style={{ background: "#00C4EB", color: "#0A0A0C" }}
        >
          Ücretsiz Başla →
        </Link>
      </div>
    </div>
  );
}
