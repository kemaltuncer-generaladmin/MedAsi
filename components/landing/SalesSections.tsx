"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Check,
  X,
  ChevronDown,
  Star,
  ArrowRight,
  Shield,
  Zap,
  Building2,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0A0A0C",
  surface: "#141419",
  border: "#1E1E24",
  cyan: "#00C4EB",
  indigo: "#1400A6",
  text: "#FFFFFF",
  muted: "#94A3B8",
  gold: "#f59e0b",
};

// ─────────────────────────────────────────────
// 1. STATS SECTION
// ─────────────────────────────────────────────
interface StatItem {
  value: string;
  numeric: number;
  suffix: string;
  prefix: string;
  label: string;
}

const STATS: StatItem[] = [
  { value: "400.000+", numeric: 400000, suffix: "+", prefix: "", label: "Klinik Vaka Veritabanı" },
  { value: "2.800+", numeric: 2800, suffix: "+", prefix: "", label: "Aktif Kullanıcı" },
  { value: "%94", numeric: 94, suffix: "", prefix: "%", label: "TUS Başarı Oranı" },
  { value: "1.2sn", numeric: 1.2, suffix: "sn", prefix: "", label: "Ortalama AI Yanıt Süresi" },
];

function CountUp({
  target,
  prefix,
  suffix,
  duration = 2000,
  isFloat = false,
}: {
  target: number;
  prefix: string;
  suffix: string;
  duration?: number;
  isFloat?: boolean;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(isFloat ? parseFloat((ease * target).toFixed(1)) : Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target, duration, isFloat]);

  const formatted = isFloat
    ? count.toFixed(1)
    : count >= 1000
    ? count.toLocaleString("tr-TR")
    : count.toString();

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
      className="w-full py-14"
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-0"
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center px-6 py-6 relative"
              style={{
                borderRight: i < STATS.length - 1 ? `1px solid ${C.border}` : undefined,
              }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-4xl md:text-5xl font-black mb-2"
                style={{ color: C.cyan }}
              >
                <CountUp
                  target={stat.numeric}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  isFloat={stat.numeric < 10}
                />
              </motion.span>
              <span className="text-sm md:text-base" style={{ color: C.muted }}>
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 2. PRICING SECTION
// ─────────────────────────────────────────────
interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  monthlyPrice: string;
  yearlyPrice: string;
  priceNote: string;
  color: string;
  highlight: boolean;
  features: PlanFeature[];
  cta: string;
  ctaStyle: "outlined-muted" | "cyan" | "outlined-gold";
  href: string;
}

const PLANS: Plan[] = [
  {
    id: "ucretsiz",
    name: "Ücretsiz",
    badge: "Hep Ücretsiz",
    badgeColor: C.muted,
    monthlyPrice: "₺0",
    yearlyPrice: "₺0",
    priceNote: "/sonsuza kadar",
    color: C.muted,
    highlight: false,
    features: [
      { text: "Pomodoro zamanlayıcı", included: true },
      { text: "Temel planlayıcılar (ders, staj)", included: true },
      { text: "Klinik not alma", included: true },
      { text: "Hasta takip (5 hasta limiti)", included: true },
      { text: "Günlük brifing (temel)", included: true },
      { text: "Yapay zeka özellikleri yok", included: false },
    ],
    cta: "Hemen Başla",
    ctaStyle: "outlined-muted",
    href: "/register",
  },
  {
    id: "giris",
    name: "Giriş",
    badge: "Öğrenci",
    badgeColor: C.cyan,
    monthlyPrice: "₺99",
    yearlyPrice: "₺79",
    priceNote: "/ay",
    color: C.cyan,
    highlight: false,
    features: [
      { text: "Ücretsiz'in tüm özellikleri", included: true },
      { text: "AI Flashcard üretici (Gemini)", included: true },
      { text: "AI Soru açıklama asistanı", included: true },
      { text: "Spot not AI özetleyici", included: true },
      { text: "Soru bankası (50 soru/gün AI)", included: true },
      { text: "Kişisel öğrenme analizi", included: true },
      { text: "Tam AI tanı asistanı yok", included: false },
      { text: "Vaka RPG yok", included: false },
    ],
    cta: "14 Gün Ücretsiz Dene",
    ctaStyle: "outlined-muted",
    href: "/register",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "En Popüler",
    badgeColor: C.cyan,
    monthlyPrice: "₺249",
    yearlyPrice: "₺199",
    priceNote: "/ay",
    color: C.cyan,
    highlight: true,
    features: [
      { text: "Giriş'in tüm özellikleri", included: true },
      { text: "AI Tanı Asistanı (sınırsız)", included: true },
      { text: "Vaka RPG Simülasyonu", included: true },
      { text: "Medikal Terminal", included: true },
      { text: "OSCE & Sözlü sınav AI", included: true },
      { text: "TUS hazırlık AI koçu", included: true },
      { text: "Klinik Yönetim (sınırsız hasta)", included: true },
      { text: "Öncelikli destek", included: true },
    ],
    cta: "14 Gün Ücretsiz Dene",
    ctaStyle: "cyan",
    href: "/register",
  },
  {
    id: "kurumsal",
    name: "Kurumsal / Grup",
    badge: "Kurumlar & Gruplar",
    badgeColor: C.gold,
    monthlyPrice: "Özel Fiyat",
    yearlyPrice: "Özel Fiyat",
    priceNote: "",
    color: C.gold,
    highlight: false,
    features: [
      { text: "Pro'nun tüm özellikleri", included: true },
      { text: "Toplu lisans indirimi", included: true },
      { text: "Fakülte/Sınıf yönetimi", included: true },
      { text: "Öğrenci ilerleme takibi", included: true },
      { text: "Özel SSO entegrasyonu", included: true },
      { text: "SLA ve kurumsal destek", included: true },
    ],
    cta: "Demo Talep Et",
    ctaStyle: "outlined-gold",
    href: "/contact",
  },
];

const ALL_FEATURES = [
  "Pomodoro & Planlayıcılar",
  "Klinik not alma",
  "Günlük brifing",
  "AI Flashcard üretici",
  "AI Soru açıklama",
  "Spot not AI özeti",
  "Öğrenme analizi",
  "AI Tanı Asistanı",
  "Vaka RPG",
  "Medikal Terminal",
  "OSCE & Sözlü AI",
  "TUS AI Koçu",
  "Öncelikli destek",
  "Toplu lisans",
  "Öğrenci yönetimi",
  "SSO entegrasyonu",
];

const PLAN_FEATURE_MAP: Record<string, Record<string, boolean | string>> = {
  ucretsiz: {
    "Pomodoro & Planlayıcılar": true,
    "Klinik not alma": true,
    "Günlük brifing": "Temel",
  },
  giris: {
    "Pomodoro & Planlayıcılar": true,
    "Klinik not alma": true,
    "Günlük brifing": true,
    "AI Flashcard üretici": true,
    "AI Soru açıklama": true,
    "Spot not AI özeti": true,
    "Öğrenme analizi": true,
  },
  pro: {
    "Pomodoro & Planlayıcılar": true,
    "Klinik not alma": true,
    "Günlük brifing": true,
    "AI Flashcard üretici": true,
    "AI Soru açıklama": true,
    "Spot not AI özeti": true,
    "Öğrenme analizi": true,
    "AI Tanı Asistanı": "Sınırsız",
    "Vaka RPG": true,
    "Medikal Terminal": true,
    "OSCE & Sözlü AI": true,
    "TUS AI Koçu": true,
    "Öncelikli destek": true,
  },
  kurumsal: {
    "Pomodoro & Planlayıcılar": true,
    "Klinik not alma": true,
    "Günlük brifing": true,
    "AI Flashcard üretici": true,
    "AI Soru açıklama": true,
    "Spot not AI özeti": true,
    "Öğrenme analizi": true,
    "AI Tanı Asistanı": "Sınırsız",
    "Vaka RPG": true,
    "Medikal Terminal": true,
    "OSCE & Sözlü AI": true,
    "TUS AI Koçu": true,
    "Öncelikli destek": true,
    "Toplu lisans": true,
    "Öğrenci yönetimi": true,
    "SSO entegrasyonu": true,
  },
};

export function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const getCtaClass = (plan: Plan) => {
    if (plan.ctaStyle === "cyan") {
      return "px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all duration-200 hover:opacity-90";
    }
    if (plan.ctaStyle === "outlined-gold") {
      return "px-6 py-3 rounded-xl font-semibold text-sm border transition-all duration-200 hover:bg-amber-500/10";
    }
    return "px-6 py-3 rounded-xl font-semibold text-sm border transition-all duration-200 hover:bg-white/5";
  };

  const getCtaStyle = (plan: Plan): React.CSSProperties => {
    if (plan.ctaStyle === "cyan") return { background: C.cyan };
    if (plan.ctaStyle === "outlined-gold") return { borderColor: C.gold, color: C.gold };
    return { borderColor: C.border, color: C.muted };
  };

  return (
    <section
      ref={ref}
      id="fiyatlar"
      style={{ background: C.bg }}
      className="w-full py-24 px-4"
    >
      <style>{`
        @keyframes glowBorder {
          0%, 100% { box-shadow: 0 0 16px 2px #00C4EB44, 0 0 40px 4px #00C4EB22; }
          50% { box-shadow: 0 0 32px 6px #00C4EB66, 0 0 60px 10px #00C4EB33; }
        }
        .glow-border { animation: glowBorder 3s ease-in-out infinite; }
      `}</style>
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
            Sana Uygun{" "}
            <span style={{ color: C.cyan }}>Plan</span>
          </h2>
          <p className="text-lg" style={{ color: C.muted }}>
            Ücretsiz plan için kredi kartı gerekmez. Giriş ve Pro planlar 14 günlük deneme sunar — deneme için kredi kartı gereklidir.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className="text-sm font-medium" style={{ color: yearly ? C.muted : C.text }}>
            Aylık
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none"
            style={{ background: yearly ? C.cyan : C.border }}
            aria-label="Yıllık/Aylık geçiş"
          >
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
              style={{ left: yearly ? "calc(100% - 24px)" : "4px" }}
            />
          </button>
          <span className="text-sm font-medium flex items-center gap-2" style={{ color: yearly ? C.text : C.muted }}>
            Yıllık
            <AnimatePresence>
              {yearly && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: "#16a34a22", color: "#4ade80", border: "1px solid #16a34a55" }}
                >
                  -20%
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              whileHover={{ y: plan.highlight ? -4 : -6, transition: { duration: 0.2 } }}
              className={`relative rounded-2xl p-6 flex flex-col ${plan.highlight ? "glow-border md:scale-105 z-10" : ""}`}
              style={{
                background: C.surface,
                border: `1.5px solid ${plan.highlight ? C.cyan : C.border}`,
              }}
            >
              {/* Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: plan.badgeColor + "22",
                    color: plan.badgeColor,
                    border: `1px solid ${plan.badgeColor}44`,
                  }}
                >
                  {plan.badge}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2" style={{ color: C.text }}>
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={yearly ? "yearly" : "monthly"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-baseline gap-1"
                  >
                    <span
                      className={`font-black ${plan.id === "kurumsal" ? "text-2xl" : "text-4xl"}`}
                      style={{ color: plan.color }}
                    >
                      {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    {plan.priceNote && (
                      <span className="text-sm" style={{ color: C.muted }}>
                        {plan.priceNote}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                    ) : (
                      <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.muted }} />
                    )}
                    <span style={{ color: f.included ? C.text : C.muted }}>{f.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={plan.href}>
                <button
                  className={`w-full ${getCtaClass(plan)}`}
                  style={getCtaStyle(plan)}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table Toggle */}
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:opacity-80"
            style={{ color: C.cyan }}
          >
            Detaylı Karşılaştırmayı Gör
            <motion.div animate={{ rotate: showTable ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden mt-6"
              >
                <div
                  className="rounded-2xl overflow-hidden border"
                  style={{ borderColor: C.border }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: C.surface }}>
                        <th className="text-left px-4 py-3 font-semibold" style={{ color: C.muted }}>
                          Özellik
                        </th>
                        {PLANS.map((plan) => (
                          <th
                            key={plan.id}
                            className="px-4 py-3 font-bold text-center"
                            style={{ color: plan.highlight ? C.cyan : C.text }}
                          >
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_FEATURES.map((feature, i) => (
                        <tr
                          key={feature}
                          style={{
                            background: i % 2 === 0 ? C.bg : C.surface,
                            borderTop: `1px solid ${C.border}`,
                          }}
                        >
                          <td className="px-4 py-3 text-left" style={{ color: C.muted }}>
                            {feature}
                          </td>
                          {PLANS.map((plan) => {
                            const val = PLAN_FEATURE_MAP[plan.id]?.[feature];
                            return (
                              <td key={plan.id} className="px-4 py-3 text-center">
                                {val === true ? (
                                  <Check className="w-4 h-4 mx-auto" style={{ color: plan.color }} />
                                ) : val ? (
                                  <span className="text-xs font-medium" style={{ color: plan.color }}>
                                    {val as string}
                                  </span>
                                ) : (
                                  <X className="w-4 h-4 mx-auto" style={{ color: C.border }} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 3. TESTIMONIALS SECTION
// ─────────────────────────────────────────────
interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  gradient: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Vaka RPG modülüyle staj öncesi hazırlandım, hiç sıkılmadan. Kliniğe ilk günden güvenle girdim.",
    name: "Zeynep K.",
    role: "Hacettepe Tıp • 4. Sınıf",
    initials: "ZK",
    gradient: "linear-gradient(135deg, #00C4EB, #1400A6)",
  },
  {
    quote: "TUS AI koçu benim için özel soru seti oluşturdu. Zayıf olduğum konuları haftada bitirdim.",
    name: "Mert O.",
    role: "Ankara Tıp • 6. Sınıf — TUS Hazırlık",
    initials: "MO",
    gradient: "linear-gradient(135deg, #6366f1, #a855f7)",
  },
  {
    quote: "Flashcard AI gerçekten işe yarıyor. Histoloji ezberlerim %80 azaldı, sınava çok daha hazır hissediyorum.",
    name: "Elif Y.",
    role: "Ege Üniversitesi • 3. Sınıf",
    initials: "EY",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
  {
    quote: "OSCE simülasyonu sayesinde kliniğe güvenle giriyorum. Sorular gerçekten sınav standartında.",
    name: "Burak A.",
    role: "Marmara Tıp • 5. Sınıf",
    initials: "BA",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
  },
  {
    quote: "Spot notlar AI özeti sınavdan 1 hafta önce kurtarıcım oldu. Başka türlü yetiştirilemezdi.",
    name: "Selin T.",
    role: "İstanbul Tıp • 2. Sınıf",
    initials: "ST",
    gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  },
  {
    quote: "TUS'a 3 ay kala Pro'ya geçtim. Hayatımın en iyi yatırımıydı. Hedeflediğim puanı aldım.",
    name: "Can D.",
    role: "Cerrahpaşa Tıp • TUS Hazırlık",
    initials: "CD",
    gradient: "linear-gradient(135deg, #00C4EB, #10b981)",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" style={{ color: C.gold }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "#CBD5E1" }}>
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: testimonial.gradient }}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: C.text }}>
            {testimonial.name}
          </p>
          <p className="text-xs" style={{ color: C.muted }}>
            {testimonial.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const totalPages = TESTIMONIALS.length - 2; // 0..3 for desktop (show 3 at a time)
  const mobileTotalPages = TESTIMONIALS.length;

  const advance = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [advance]);

  const visibleDesktop = [
    TESTIMONIALS[page % TESTIMONIALS.length],
    TESTIMONIALS[(page + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(page + 2) % TESTIMONIALS.length],
  ];

  return (
    <section
      ref={ref}
      style={{ background: C.bg }}
      className="w-full py-24 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
            Kullanıcılarımız{" "}
            <span style={{ color: C.cyan }}>Ne Diyor?</span>
          </h2>
        </motion.div>

        {/* Desktop: 3 cards */}
        <div className="hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-3 gap-6"
            >
              {visibleDesktop.map((t, i) => (
                <TestimonialCard key={`${page}-${i}`} testimonial={t} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile: 1 card */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`mobile-${page}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
            >
              <TestimonialCard testimonial={TESTIMONIALS[page % mobileTotalPages]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width: i === page ? "24px" : "8px",
                height: "8px",
                background: i === page ? C.cyan : C.border,
              }}
              aria-label={`Sayfa ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 4. FAQ SECTION
// ─────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "MEDASI hangi tıp öğrencilerine uygundur?",
    answer:
      "1. sınıftan 6. sınıfa kadar tüm tıp öğrencileri ve TUS hazırlık sürecindeki mezunlar için tasarlandı. Her sınıfa özel içerik, sorular ve AI desteği sunulur. Kayıt sırasında dönemini seçersen içerikler otomatik kişiselleşir.",
  },
  {
    question: "Ücretsiz plan neler içeriyor?",
    answer:
      "Yapay zeka olmadan tüm temel araçlar ücretsiz: Pomodoro zamanlayıcı, ders ve staj planlayıcısı, klinik not alma, 5 hastaya kadar takip ve günlük brifing. Kredi kartı gerektirmez, süre sınırı yoktur.",
  },
  {
    question: "14 günlük denemede neden kredi kartı isteniyor?",
    answer:
      "Giriş ve Pro planların 14 günlük denemesi için kredi kartı bilgisi alınmaktadır. Deneme süresince ücret kesilmez; deneme bitmeden 24 saat önce e-posta ile bilgilendirilirsiniz. İstediğiniz zaman iptal edebilirsiniz.",
  },
  {
    question: "Gemini AI yanıtları ne kadar güvenilir?",
    answer:
      "Google Gemini ile güçlendirilmiş yapay zekamız güncel tıbbi kılavuzlarla (UpToDate, WHO, TTB) desteklenmektedir. Her yanıt kaynak referansıyla sunulur. Yine de klinik kararlar için uzmana danışılmasını öneririz.",
  },
  {
    question: "TUS hazırlığında MEDASI nasıl yardımcı oluyor?",
    answer:
      "TUS AI Koçu zayıf olduğun konuları tespit eder ve sana özel günlük soru setleri oluşturur. OSCE simülasyonları, Vaka RPG ve Medikal Terminal ile pratik bilgini pekiştirirsin. Performans grafiklerin haftalık raporlanır.",
  },
  {
    question: "Veri gizliliğim nasıl korunuyor?",
    answer:
      "KVKK uyumlu altyapı, Supabase şifreli depolama ve end-to-end şifreleme ile verileriniz korunur. Kişisel verileriniz hiçbir zaman üçüncü taraflarla paylaşılmaz.",
  },
  {
    question: "Kurumsal / grup lisans nasıl çalışıyor?",
    answer:
      "Tıp fakülteleri ve TUS hazırlık grupları için toplu lisans indirimi sunuyoruz. Fakülte bazlı öğrenci yönetimi, ilerleme takibi ve özel SSO entegrasyonu içerir. Demo talep formundan bizimle iletişime geçin.",
  },
  {
    question: "Planımı değiştirebilir miyim?",
    answer:
      "Dilediğiniz zaman yükseltme veya düşürme yapabilirsiniz. Yükseltme anında aktif olur; düşürme mevcut dönem sonunda geçerlidir. Kalan süre için orantılı iade sağlanır.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="sss"
      ref={ref}
      style={{ background: C.surface }}
      className="w-full py-24 px-4"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
            Sıkça Sorulan{" "}
            <span style={{ color: C.cyan }}>Sorular</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${isOpen ? C.cyan + "66" : C.border}`, background: C.bg }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none group"
                >
                  <span
                    className="font-semibold text-sm md:text-base transition-colors duration-200"
                    style={{ color: isOpen ? C.cyan : C.text }}
                  >
                    {item.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 ml-4"
                  >
                    <ChevronDown className="w-5 h-5" style={{ color: isOpen ? C.cyan : C.muted }} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p
                        className="px-5 pb-5 text-sm leading-relaxed"
                        style={{ color: C.muted }}
                      >
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 5. FOOTER CTA
// ─────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: C.cyan,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const PRODUCT_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Asistan", href: "/ai-assistant" },
  { label: "Vaka RPG", href: "/case-rpg" },
  { label: "Flashcard", href: "/flashcards" },
  { label: "Klinik Yönetim", href: "/clinic" },
  { label: "Fiyatlar", href: "/pricing" },
];

const SUPPORT_LINKS = [
  { label: "SSS", href: "/#sss" },
  { label: "İletişim", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Dokümantasyon", href: "/docs" },
];

const LEGAL_LINKS = [
  { label: "Gizlilik Sözleşmesi", href: "/privacy" },
  { label: "Hizmet Şartları", href: "/terms" },
  { label: "Fiyatlar", href: "/pricing" },
  { label: "KVKK Başvurusu", href: "mailto:kvkk@medasi.com.tr" },
];

export function FooterCTA() {
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  return (
    <>
      {/* CTA Section */}
      <section
        ref={ctaRef}
        className="w-full py-24 px-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.indigo} 0%, #0a1a4a 40%, #003a4a 70%, ${C.cyan}33 100%)`,
        }}
      >
        <FloatingParticles />

        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ color: C.text }}>
              Geleceğin Tıbbını{" "}
              <span style={{ color: C.cyan }}>Bugünden Deneyimleyin</span>
            </h2>
            <p className="text-lg md:text-xl mb-10" style={{ color: "#CBD5E1" }}>
              14 gün ücretsiz, kredi kartı olmadan. 2.800+ tıpçı zaten kullanıyor.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base shadow-xl transition-all"
                  style={{ background: "#ffffff", color: C.bg }}
                >
                  Ücretsiz Hesap Oluştur
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base border-2 transition-all hover:bg-white/10"
                  style={{ borderColor: "#ffffff66", color: C.text }}
                >
                  Planları İncele
                </motion.button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: Shield, label: "KVKK Uyumlu" },
                { icon: Zap, label: "1.2sn Yanıt" },
                { icon: Building2, label: "400K+ Vaka" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#CBD5E1",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: C.cyan }} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }} className="w-full">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Logo + Desc */}
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <span className="text-2xl font-black tracking-tight" style={{ color: C.text }}>
                  MED<span style={{ color: C.cyan }}>ASI</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.muted }}>
                Türkiye&apos;nin medikal AI platformu. Tıp öğrencileri ve hekimler için yapay zeka destekli eğitim ve klinik çözümler.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                {[
                  {
                    label: "Twitter/X",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Instagram",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    ),
                  },
                ].map(({ label, svg }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                    style={{ border: `1px solid ${C.border}`, color: C.muted }}
                  >
                    {svg}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Ürün
              </h4>
              <ul className="space-y-3">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Destek
              </h4>
              <ul className="space-y-3">
                {SUPPORT_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Yasal
              </h4>
              <ul className="space-y-3">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <p className="text-sm" style={{ color: C.muted }}>
              © 2026 MEDASI. Tüm hakları saklıdır.
            </p>
            <p className="text-sm flex items-center gap-2" style={{ color: C.muted }}>
              Türkiye&apos;nin medikal AI platformu
              <span>🇹🇷</span>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
