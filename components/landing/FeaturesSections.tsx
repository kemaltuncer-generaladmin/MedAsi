"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence, type Variants } from "framer-motion";
import {
  Brain,
  Gamepad2,
  Terminal,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Stethoscope,
  BarChart3,
  UserPlus,
  TrendingUp,
  Check,
  ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const staggerContainer = (stagger = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});

const AI_BUBBLE_WORDS = [
  "Olası",
  "tanı:",
  "AKS",
  "→",
  "EKG",
  "çek,",
  "troponin",
  "bak...",
] as const;

// ─────────────────────────────────────────────
// 1. FeaturesSection
// ─────────────────────────────────────────────

interface Feature {
  icon: React.ElementType;
  color: string;
  glowColor: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Brain,
    color: "#00C4EB",
    glowColor: "rgba(0,196,235,0.18)",
    title: "AI Tanı Asistanı",
    description:
      "Semptomları yazın, saniyeler içinde kanıta dayalı ayırıcı tanı ve olasılık analizi alın.",
  },
  {
    icon: Gamepad2,
    color: "#818cf8",
    glowColor: "rgba(129,140,248,0.18)",
    title: "Vaka RPG Simülasyonu",
    description:
      "Sanal hastalarla gerçek klinik pratik. Anamnez, tetkik, tedavi — sıfır risk.",
  },
  {
    icon: Terminal,
    color: "#10b981",
    glowColor: "rgba(16,185,129,0.18)",
    title: "Medikal Terminal",
    description:
      "Komut satırı hızında ilaç hesapları, ICD kodları ve literatür taraması.",
  },
  {
    icon: BookOpen,
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.18)",
    title: "Akıllı Flashcard",
    description:
      "AI'nın hazırladığı flashcard'lar ve spot notlarla eksiklerinizi hızla kapatın.",
  },
  {
    icon: CalendarDays,
    color: "#ec4899",
    glowColor: "rgba(236,72,153,0.18)",
    title: "Planlayıcılar",
    description:
      "TUS, staj, ders ve intern dönemleri için kişisel zaman çizelgesi.",
  },
  {
    icon: ClipboardList,
    color: "#eab308",
    glowColor: "rgba(234,179,8,0.18)",
    title: "Sınav Modülleri",
    description:
      "OSCE, sözlü, kuramsal ve çok dilli sınav simülasyonları ile gerçek deneyim.",
  },
  {
    icon: Stethoscope,
    color: "#00C4EB",
    glowColor: "rgba(0,196,235,0.18)",
    title: "Klinik Yönetim",
    description:
      "Hasta kaydı, klinik not, reçete ve taburculuk — eksiksiz dijital klinik.",
  },
  {
    icon: BarChart3,
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.18)",
    title: "Günlük Brifing",
    description:
      "Size özel hazırlanan günlük tıp bülteni, performans metrikleri ve hedef takibi.",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      variants={fadeUp}
      whileHover="hover"
      className="group relative rounded-2xl border border-[#1E1E24] bg-[#141419] p-6 cursor-default overflow-hidden transition-colors duration-300"
      style={
        {
          "--glow": feature.glowColor,
          "--accent": feature.color,
        } as React.CSSProperties
      }
    >
      {/* hover background glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${feature.glowColor} 0%, transparent 70%)` }}
      />

      {/* hover border */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `0 0 0 1px ${feature.color}55, 0 0 24px ${feature.glowColor}` }}
      />

      {/* Icon */}
      <motion.div
        variants={{
          hover: { y: -4, scale: 1.12, transition: { type: "spring", stiffness: 400, damping: 10 } },
        }}
        className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl"
        style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
      >
        <Icon size={22} style={{ color: feature.color }} strokeWidth={1.8} />
      </motion.div>

      <h3 className="text-white font-semibold text-base mb-2 leading-snug">{feature.title}</h3>
      <p className="text-[#94A3B8] text-sm leading-relaxed">{feature.description}</p>

      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${feature.color}22, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="özellikler" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0A0C] overflow-hidden">
      {/* subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00C4EB] mb-4 px-3 py-1 rounded-full border border-[#00C4EB]/20 bg-[#00C4EB]/5">
            Özellikler
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Her İhtiyaç İçin{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C4EB] to-[#818cf8]">
              Özel Tasarlanmış Modüller
            </span>
          </h2>
          <p className="mt-4 text-[#94A3B8] text-lg max-w-2xl mx-auto">
            Tıp eğitiminin her evresine özel, AI destekli araçlarla donanmış kapsamlı bir platform.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          ref={ref}
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 2. HowItWorksSection
// ─────────────────────────────────────────────

interface Step {
  number: string;
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  visual: React.ReactNode;
}

function ProfileVisual({ color }: { color: string }) {
  return (
    <div className="mt-5 rounded-xl border border-[#1E1E24] bg-[#0A0A0C] p-4 text-xs space-y-3">
      {[
        { label: "Ad Soyad", value: "Dr. Ayşe Kaya", w: "75%" },
        { label: "Uzmanlık", value: "Dahiliye", w: "50%" },
        { label: "Dönem", value: "Asistan Hekim", w: "60%" },
      ].map((row) => (
        <div key={row.label}>
          <div className="text-[#94A3B8] mb-1">{row.label}</div>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: row.w }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="h-5 rounded-md"
            style={{ background: `${color}22`, border: `1px solid ${color}33` }}
          >
            <span className="px-2 leading-5 text-white/80 text-[11px]">{row.value}</span>
          </motion.div>
        </div>
      ))}
      <motion.button
        whileHover={{ scale: 1.03 }}
        className="w-full mt-1 py-1.5 rounded-lg text-[11px] font-semibold text-white"
        style={{ background: `${color}33`, border: `1px solid ${color}55` }}
      >
        Profil Oluştur ✓
      </motion.button>
    </div>
  );
}

function AIBubbleVisual({ color }: { color: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShown((s) => {
        if (s >= AI_BUBBLE_WORDS.length) {
          setTimeout(() => setShown(0), 1200);
          return s;
        }
        return s + 1;
      });
    }, 220);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-5 space-y-3">
      <div className="flex justify-end">
        <div className="rounded-xl rounded-br-sm bg-[#1E1E24] px-3 py-2 text-[11px] text-[#94A3B8] max-w-[80%]">
          45y erkek, göğüs ağrısı, sol kola yayılım...
        </div>
      </div>
      <div
        className="rounded-xl rounded-bl-sm px-3 py-2 text-[11px] text-white max-w-[90%] min-h-[36px] flex items-center flex-wrap gap-1"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        {AI_BUBBLE_WORDS.slice(0, shown).map((w, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {w}
          </motion.span>
        ))}
        {shown < AI_BUBBLE_WORDS.length && (
          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
            ▋
          </motion.span>
        )}
      </div>
    </div>
  );
}

function ChartVisual({ color }: { color: string }) {
  const bars = [
    { label: "Pzt", h: 40 },
    { label: "Sal", h: 65 },
    { label: "Çar", h: 50 },
    { label: "Per", h: 80 },
    { label: "Cum", h: 70 },
    { label: "Cmt", h: 90 },
    { label: "Paz", h: 75 },
  ];
  return (
    <div className="mt-5 flex items-end gap-2 h-20">
      {bars.map((b, i) => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: `${b.h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
            className="w-full rounded-t-sm"
            style={{ background: `${color}55`, border: `1px solid ${color}44` }}
          />
          <span className="text-[9px] text-[#94A3B8]">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

const steps: Step[] = [
  {
    number: "01",
    icon: UserPlus,
    color: "#00C4EB",
    title: "Kayıt Ol & Profilini Oluştur",
    description:
      "Tıp öğrencisi mi, asistan hekim mi? 2 dakikada profil oluştur, seviyene uygun içerik sana gelsin.",
    visual: <ProfileVisual color="#00C4EB" />,
  },
  {
    number: "02",
    icon: Brain,
    color: "#818cf8",
    title: "AI ile Çalış ve Pratik Yap",
    description:
      "Vaka RPG, AI Tanı Asistanı ve flashcard'larla öğrenme sürecini oyunlaştır. Her sorgu seni güçlendirir.",
    visual: <AIBubbleVisual color="#818cf8" />,
  },
  {
    number: "03",
    icon: TrendingUp,
    color: "#10b981",
    title: "İlerlemeni Takip Et",
    description:
      "Haftalık raporlar, başarı grafikleri ve TUS simülasyon skoru ile nerede olduğunu her zaman bil.",
    visual: <ChartVisual color="#10b981" />,
  },
];

function ConnectorLine() {
  return (
    <div className="hidden lg:flex items-center justify-center w-24 flex-shrink-0 relative">
      <div className="w-full h-px border-t-2 border-dashed border-[#1E1E24]" />
      <motion.div
        animate={{ x: ["-200%", "200%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute w-3 h-3 rounded-full bg-[#00C4EB] shadow-[0_0_8px_2px_#00C4EB88]"
      />
      <ChevronRight className="absolute right-0 text-[#1E1E24]" size={16} />
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="nasıl-çalışır" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0A0A0C] overflow-hidden">
      {/* Background radial */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, #1400A615, transparent)" }} />

      <div className="relative max-w-7xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#00C4EB] mb-4 px-3 py-1 rounded-full border border-[#00C4EB]/20 bg-[#00C4EB]/5">
            Nasıl Çalışır
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Nasıl{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C4EB] to-[#818cf8]">
              Çalışır?
            </span>
          </h2>
          <p className="mt-4 text-[#94A3B8] text-lg max-w-xl mx-auto">
            Üç adımda MEDASI ile tıp eğitimini bir üst seviyeye taşı.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex flex-col lg:flex-row items-center lg:items-start">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: i * 0.15 }}
                  className="relative flex-1 max-w-xs w-full rounded-2xl border border-[#1E1E24] bg-[#141419] p-6 overflow-hidden"
                >
                  {/* Watermark number */}
                  <div
                    className="absolute -top-4 -right-2 text-[80px] font-black leading-none select-none pointer-events-none"
                    style={{ color: `${step.color}08`, fontVariantNumeric: "tabular-nums" }}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                  >
                    <Icon size={22} style={{ color: step.color }} strokeWidth={1.8} />
                  </div>

                  {/* Step badge */}
                  <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: step.color }}>
                    Adım {step.number}
                  </div>

                  <h3 className="text-white font-semibold text-base leading-snug mb-2">{step.title}</h3>
                  <p className="text-[#94A3B8] text-sm leading-relaxed">{step.description}</p>

                  {/* Visual */}
                  {step.visual}
                </motion.div>

                {/* Connector */}
                {i < steps.length - 1 && (
                  <>
                    <ConnectorLine />
                    {/* mobile connector */}
                    <div className="lg:hidden flex flex-col items-center my-4 relative h-12">
                      <div className="w-px h-full border-l-2 border-dashed border-[#1E1E24]" />
                      <motion.div
                        animate={{ y: ["-200%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute w-3 h-3 rounded-full bg-[#00C4EB] shadow-[0_0_8px_2px_#00C4EB88]"
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 3. AIDemoSection
// ─────────────────────────────────────────────

const AI_RESPONSE =
  "Olası Tanılar:\n🔴 Akut MI (olasılık: 78%)\n🟡 Unstable Angina (%15)\n🟢 Plevral Ağrı (%5)\n\nAcil Öneriler: EKG çek, troponin bak, aspirin ver...";

const DIAGNOSES = [
  { label: "Akut Miyokard İnfarktüsü", color: "#ef4444", pct: 78 },
  { label: "Unstable Angina", color: "#eab308", pct: 15 },
  { label: "Plevral Ağrı", color: "#10b981", pct: 5 },
];

const BULLETS = [
  "Kanıta dayalı ayırıcı tanı listesi",
  "Olasılık yüzdeleri ve önceliklendirme",
  "Acil müdahale önerileri",
  "ICD-10 kodlaması ve kılavuz referansları",
];

function TerminalMockup() {
  const [phase, setPhase] = useState<"idle" | "typing" | "done">("idle");
  const [displayed, setDisplayed] = useState("");
  const [showBars, setShowBars] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = () => {
    setPhase("typing");
    setDisplayed("");
    setShowBars(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(AI_RESPONSE.slice(0, i));
      if (i >= AI_RESPONSE.length) {
        clearInterval(intervalRef.current!);
        setPhase("done");
        setShowBars(true);
        // restart loop
        timeoutRef.current = setTimeout(startAnimation, 8000);
      }
    }, 40);
  };

  useEffect(() => {
    if (!inView) return;
    const delay = setTimeout(startAnimation, 800);
    return () => {
      clearTimeout(delay);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <div ref={ref} className="relative rounded-2xl border border-[#1E1E24] bg-[#0D0D10] overflow-hidden shadow-2xl">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E1E24] bg-[#141419]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 text-center text-xs text-[#94A3B8] font-mono">MEDASI AI Tanı Terminali</span>
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-[#28c840]"
          />
          <span className="text-[10px] text-[#28c840] font-mono">Canlı</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="p-5 space-y-4 min-h-[320px]">
        {/* User message */}
        <div className="flex justify-end">
          <div className="rounded-xl rounded-br-sm bg-[#1E1E24] px-4 py-3 text-sm text-[#94A3B8] max-w-[85%] font-mono leading-relaxed">
            45 yaşında erkek hasta, 3 saatlik göğüs ağrısı, sol kola yayılım, terleme ve bulantı var.
          </div>
        </div>

        {/* AI response */}
        {(phase === "typing" || phase === "done") && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm bg-[#00C4EB]/10 border border-[#00C4EB]/20 px-4 py-3 text-sm text-white max-w-[90%] font-mono whitespace-pre-line leading-relaxed">
              {displayed}
              {phase === "typing" && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-[#00C4EB]"
                >
                  ▋
                </motion.span>
              )}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {phase === "idle" && (
          <div className="flex justify-start">
            <div className="rounded-xl rounded-bl-sm bg-[#141419] border border-[#1E1E24] px-4 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-[#94A3B8]"
                />
              ))}
            </div>
          </div>
        )}

        {/* Probability bars */}
        <AnimatePresence>
          {showBars && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-[#1E1E24] bg-[#141419] p-4 space-y-3"
            >
              <div className="text-[10px] font-semibold tracking-wider uppercase text-[#94A3B8] mb-3">
                Tanı Olasılıkları
              </div>
              {DIAGNOSES.map((d, i) => (
                <div key={d.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/80">{d.label}</span>
                    <span className="font-mono" style={{ color: d.color }}>
                      {d.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1E1E24] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${d.color}aa, ${d.color})` }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function AIDemoSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Full-width dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0A0A0C 0%, #0e0818 40%, #060d18 70%, #0A0A0C 100%)",
        }}
      />
      {/* Glow blobs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background: "#00C4EB", filter: "blur(120px)" }} />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.06]" style={{ background: "#1400A6", filter: "blur(100px)" }} />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — description */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="space-y-6"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00C4EB]/30 bg-[#00C4EB]/5">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#00C4EB]"
              />
              <span className="text-xs font-semibold text-[#00C4EB] tracking-wide">Canlı Demo</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              AI Tanı Asistanı'nı{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C4EB] to-[#818cf8]">
                Deneyin
              </span>
            </h2>

            {/* Description */}
            <p className="text-[#94A3B8] text-lg leading-relaxed">
              Gerçek bir klinik senaryo. AI saniyeler içinde semptomları analiz eder, olası tanıları listeler ve öncelik sırasına koyar.
            </p>

            {/* Bullets */}
            <ul className="space-y-3">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00C4EB]/15 border border-[#00C4EB]/30 flex items-center justify-center">
                    <Check size={11} className="text-[#00C4EB]" strokeWidth={2.5} />
                  </div>
                  <span className="text-[#94A3B8] text-sm">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-[#0A0A0C]"
              style={{ background: "linear-gradient(135deg, #00C4EB, #818cf8)" }}
            >
              Hemen Dene
              <ChevronRight size={16} />
            </motion.button>
          </motion.div>

          {/* Right — terminal mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1 }}
          >
            <TerminalMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
