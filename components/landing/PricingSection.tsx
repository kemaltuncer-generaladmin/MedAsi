"use client";

import { useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Check, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { C } from "./salesTokens";

// ─────────────────────────────────────────────
// PRICING SECTION
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
