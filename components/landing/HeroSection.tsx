"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useInView, useAnimation, AnimatePresence } from "framer-motion";
import {
  Activity,
  Brain,
  GraduationCap,
  LayoutDashboard,
  Stethoscope,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0A0A0C",
  surface: "#141419",
  border: "#1E1E24",
  cyan: "#00C4EB",
  indigo: "#1400A6",
  white: "#FFFFFF",
  muted: "#94A3B8",
};

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, suffix = "") {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return { ref, display: count.toLocaleString("tr-TR") + suffix };
}

// ─────────────────────────────────────────────
// CIRCUIT BOARD SVG BACKGROUND
// ─────────────────────────────────────────────
function CircuitBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <style>{`
        @keyframes drawLine {
          0%   { stroke-dashoffset: 1200; opacity: 0; }
          10%  { opacity: 1; }
          80%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.25; }
        }
        .cl { stroke: #00C4EB; stroke-opacity: 0.18; fill: none; stroke-dasharray: 1200; animation: drawLine 6s ease-in-out infinite; }
        .cl:nth-child(1)  { animation-delay: 0s; }
        .cl:nth-child(2)  { animation-delay: 0.8s; }
        .cl:nth-child(3)  { animation-delay: 1.6s; }
        .cl:nth-child(4)  { animation-delay: 2.4s; }
        .cl:nth-child(5)  { animation-delay: 3.2s; }
        .cl:nth-child(6)  { animation-delay: 4.0s; }
        .cl:nth-child(7)  { animation-delay: 4.8s; }
        .cl:nth-child(8)  { animation-delay: 0.4s; }
        .cl:nth-child(9)  { animation-delay: 1.2s; }
        .cl:nth-child(10) { animation-delay: 2.0s; }

        .node { fill: #00C4EB; fill-opacity: 0.35; animation: nodePulse 3s ease-in-out infinite; }
        @keyframes nodePulse {
          0%, 100% { r: 3; fill-opacity: 0.2; }
          50%       { r: 5; fill-opacity: 0.5; }
        }
      `}</style>

      {/* Horizontal traces */}
      <path className="cl" d="M0 180 H 200 L 240 140 H 520 L 560 180 H 900" strokeWidth="1.5"/>
      <path className="cl" d="M100 320 H 300 L 340 280 H 700 L 740 320 H 1100 L 1140 280 H 1400" strokeWidth="1"/>
      <path className="cl" d="M0 500 H 150 L 190 460 H 480 L 520 500 H 800" strokeWidth="1.5"/>
      <path className="cl" d="M200 650 H 450 L 490 690 H 680 L 720 650 H 1000 L 1040 610 H 1300" strokeWidth="1"/>
      <path className="cl" d="M0 780 H 340 L 380 740 H 600 L 640 780 H 1920" strokeWidth="1"/>

      {/* Vertical traces */}
      <path className="cl" d="M240 0 V 140 L 280 180 V 400 L 240 440 V 700" strokeWidth="1.5"/>
      <path className="cl" d="M560 180 V 320 L 600 360 V 580 L 560 620 V 850" strokeWidth="1"/>
      <path className="cl" d="M900 0 V 180 L 940 220 V 500 L 900 540 V 900" strokeWidth="1.5"/>
      <path className="cl" d="M1200 100 V 280 L 1160 320 V 600 L 1200 640 V 900" strokeWidth="1"/>
      <path className="cl" d="M400 400 V 500 L 440 540 V 700 L 400 740 V 900" strokeWidth="1"/>

      {/* Junction nodes */}
      <circle className="node" cx="240" cy="140" r="3" style={{ animationDelay: "0.5s" }} />
      <circle className="node" cx="560" cy="180" r="3" style={{ animationDelay: "1.2s" }} />
      <circle className="node" cx="340" cy="280" r="3" style={{ animationDelay: "2.0s" }} />
      <circle className="node" cx="740" cy="320" r="3" style={{ animationDelay: "0.8s" }} />
      <circle className="node" cx="380" cy="740" r="3" style={{ animationDelay: "1.5s" }} />
      <circle className="node" cx="900" cy="180" r="3" style={{ animationDelay: "2.5s" }} />
      <circle className="node" cx="600" cy="360" r="3" style={{ animationDelay: "3.0s" }} />
    </svg>
  );
}

// ─────────────────────────────────────────────
// ANIMATED CHART (inside mockup)
// ─────────────────────────────────────────────
function LiveChart() {
  const [points, setPoints] = useState<number[]>([40, 45, 38, 55, 50, 60, 52, 65, 58, 70, 62, 75]);

  useEffect(() => {
    const id = setInterval(() => {
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(20, Math.min(90, last + (Math.random() - 0.45) * 12));
        return [...prev.slice(1), Math.round(next)];
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const w = 200;
  const h = 70;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - (p / 100) * h,
  }));
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area =
    `M${coords[0].x},${h} ` +
    coords.map((c) => `L${c.x},${c.y}`).join(" ") +
    ` L${coords[coords.length - 1].x},${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00C4EB" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00C4EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartGrad)" />
      <polyline points={polyline} fill="none" stroke="#00C4EB" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {coords.slice(-1).map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="#00C4EB" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// TYPEWRITER inside mockup
// ─────────────────────────────────────────────
const TYPEWRITER_SEQUENCES = [
  "Hasta: 45y erkek, göğüs ağrısı, terleme...",
  "Ön tanı: AKS dışlanamaz. EKG ve troponin öneriyorum.",
];

function TypewriterChat() {
  const [phase, setPhase] = useState<"typing" | "response" | "pause">("typing");
  const [displayed, setDisplayed] = useState("");
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (phase === "typing") {
      if (charIdx < TYPEWRITER_SEQUENCES[0].length) {
        const t = setTimeout(() => {
          setDisplayed(TYPEWRITER_SEQUENCES[0].slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, 45);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("response"), 600);
        return () => clearTimeout(t);
      }
    }
    if (phase === "response") {
      const t = setTimeout(() => setPhase("pause"), 3000);
      return () => clearTimeout(t);
    }
    if (phase === "pause") {
      const t = setTimeout(() => {
        setDisplayed("");
        setCharIdx(0);
        setPhase("typing");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [phase, charIdx]);

  return (
    <div className="space-y-2 mt-2">
      {/* User message */}
      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{ background: "#1E1E2A", color: C.muted, minHeight: "2.5rem" }}
      >
        <span style={{ color: C.cyan, fontSize: "0.65rem", fontWeight: 600 }}>SEN  </span>
        <span>{displayed}</span>
        {phase === "typing" && (
          <span
            className="inline-block w-0.5 h-3 ml-0.5 align-middle"
            style={{ background: C.cyan, animation: "blink 0.8s step-end infinite" }}
          />
        )}
      </div>
      {/* AI response */}
      <AnimatePresence>
        {phase === "response" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgba(0,196,235,0.08)", border: "1px solid rgba(0,196,235,0.2)", color: C.white }}
          >
            <span style={{ color: C.cyan, fontSize: "0.65rem", fontWeight: 600 }}>MEDASI AI  </span>
            {TYPEWRITER_SEQUENCES[1]}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// BROWSER MOCKUP
// ─────────────────────────────────────────────
function DashboardMockup() {
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveCard((p) => (p + 1) % 3), 2000);
    return () => clearInterval(id);
  }, []);

  const metrics = [
    { label: "Nabız", value: "72", unit: "bpm", color: "#F43F5E" },
    { label: "SpO2", value: "98", unit: "%", color: "#22C55E" },
    { label: "Tanı Acc.", value: "94", unit: "%", color: C.cyan },
  ];

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: Brain, label: "AI Asistan" },
    { icon: Stethoscope, label: "Klinik" },
    { icon: GraduationCap, label: "Eğitim" },
  ];

  return (
    <div className="relative">
      {/* Glow behind mockup */}
      <div
        className="absolute inset-0 -z-10 rounded-2xl"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,196,235,0.18) 0%, transparent 70%)`,
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
      />

      {/* Browser window */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{ border: `1px solid ${C.border}`, background: C.surface }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "#0F0F14", borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
          </div>
          <div
            className="flex-1 mx-4 rounded-md px-3 py-1 text-xs flex items-center gap-2"
            style={{ background: "#1A1A22", color: C.muted }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
              <path d="M5 1a4 4 0 100 8A4 4 0 005 1z" stroke="#22C55E" strokeWidth="1.2"/>
              <path d="M5 3v3l1.5 1.5" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            medasi.com.tr/dashboard
          </div>
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: "360px" }}>
          {/* Sidebar */}
          <div
            className="flex flex-col gap-1 py-4 px-2 shrink-0"
            style={{ width: "120px", background: "#0F0F14", borderRight: `1px solid ${C.border}` }}
          >
            <div className="px-2 mb-3">
              <span className="text-xs font-bold" style={{ color: C.white }}>
                MED<span style={{ color: C.cyan }}>ASI</span>
              </span>
            </div>
            {navItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-all"
                style={{
                  background: i === 0 ? "rgba(0,196,235,0.12)" : "transparent",
                  color: i === 0 ? C.cyan : C.muted,
                  fontSize: "0.65rem",
                }}
              >
                <item.icon size={12} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: C.white }}>
                Hasta Analizi
              </span>
              <div
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,196,235,0.1)", color: C.cyan, fontSize: "0.6rem" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: C.cyan, animation: "pulse 1.5s infinite" }}
                />
                Canlı
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-2">
              {metrics.map((m, i) => (
                <motion.div
                  key={i}
                  animate={{
                    borderColor: activeCard === i ? m.color : C.border,
                    boxShadow: activeCard === i ? `0 0 12px ${m.color}33` : "none",
                  }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg p-2"
                  style={{ background: "#0F0F14", border: `1px solid ${C.border}` }}
                >
                  <div className="text-xs" style={{ color: C.muted, fontSize: "0.55rem" }}>
                    {m.label}
                  </div>
                  <div className="font-bold" style={{ color: m.color, fontSize: "0.9rem" }}>
                    {m.value}
                    <span className="text-xs font-normal ml-0.5" style={{ fontSize: "0.55rem", color: C.muted }}>
                      {m.unit}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Chart */}
            <div
              className="rounded-lg p-3 flex-1"
              style={{ background: "#0F0F14", border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: C.muted, fontSize: "0.6rem" }}>Vital Trend</span>
                <Activity size={10} color={C.cyan} />
              </div>
              <LiveChart />
            </div>

            {/* Chat */}
            <div
              className="rounded-lg p-2"
              style={{ background: "#0F0F14", border: `1px solid ${C.border}` }}
            >
              <TypewriterChat />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating badge cards */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute -left-12 top-16 rounded-xl px-3 py-2 shadow-lg hidden xl:flex items-center gap-2"
        style={{ background: C.surface, border: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}
      >
        <Zap size={14} color={C.cyan} />
        <span className="text-xs font-semibold" style={{ color: C.white }}>
          AI Yanıtı: <span style={{ color: C.cyan }}>1.2s</span>
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.5 }}
        className="absolute -right-10 top-32 rounded-xl px-3 py-2 shadow-lg hidden xl:flex items-center gap-2"
        style={{ background: C.surface, border: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}
      >
        <Brain size={14} color="#A855F7" />
        <span className="text-xs font-semibold" style={{ color: C.white }}>
          400K+ Vaka
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-3 py-2 shadow-lg hidden xl:flex items-center gap-2 whitespace-nowrap"
        style={{ background: C.surface, border: `1px solid rgba(0,196,235,0.3)` }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "#22C55E", boxShadow: "0 0 6px #22C55E" }}
        />
        <span className="text-xs" style={{ color: C.muted }}>
          Kanıta Dayalı Tıp
        </span>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT ITEM
// ─────────────────────────────────────────────
function StatItem({
  target,
  suffix,
  label,
  delay,
}: {
  target: number;
  suffix: string;
  label: string;
  delay?: number;
}) {
  const { ref, display } = useCountUp(target, 2000, suffix);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay ?? 0 }}
      className="flex flex-col"
    >
      <span className="text-2xl font-bold" style={{ color: C.cyan }}>
        {display}
      </span>
      <span className="text-xs mt-0.5" style={{ color: C.muted }}>
        {label}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────

// Anchor href → section id eşleşmesi (Türkçe karakterleri koruyarak)
const NAV_LINKS = [
  { label: "Özellikler", href: "#özellikler" },
  { label: "Nasıl Çalışır", href: "#nasıl-çalışır" },
  { label: "Fiyatlar", href: "#fiyatlar" },
  { label: "SSS", href: "#sss" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Mobil menü açıkken body scroll kilitle
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // ESC tuşuyla menüyü kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Ana navigasyon"
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled || mobileOpen ? "rgba(10,10,12,0.95)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(16px)" : "none",
          borderBottom: scrolled || mobileOpen ? `1px solid ${C.border}` : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ color: C.white }}
            aria-label="Medasi ana sayfaya git"
          >
            MED<span style={{ color: C.cyan }}>ASI</span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm transition-colors duration-200"
                style={{ color: C.muted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center text-sm px-4 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-[#1E1E24] hover:text-white"
              style={{ color: C.muted }}
            >
              Giriş Yap
            </a>
            <a
              href="/register"
              className="inline-flex items-center text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 hover:-translate-y-px"
              style={{
                background: C.cyan,
                color: "#0A0A0C",
                boxShadow: `0 0 20px rgba(0,196,235,0.35)`,
              }}
            >
              Ücretsiz Başla
            </a>

            {/* Hamburger — yalnızca mobilde görünür */}
            <button
              type="button"
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-lg transition-colors"
              style={{ color: C.white }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            >
              <span
                className="block w-5 h-0.5 transition-all duration-200 origin-center"
                style={{
                  background: C.white,
                  transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all duration-200"
                style={{
                  background: C.white,
                  opacity: mobileOpen ? 0 : 1,
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all duration-200 origin-center"
                style={{
                  background: C.white,
                  transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              id="mobile-menu"
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="md:hidden overflow-hidden"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <div className="px-6 py-5 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-base py-3 border-b transition-colors"
                    style={{
                      color: C.muted,
                      borderColor: C.border,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 mt-5">
                  <a
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ color: C.white, borderColor: C.border }}
                  >
                    Giriş Yap
                  </a>
                  <a
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold"
                    style={{ background: C.cyan, color: "#0A0A0C" }}
                  >
                    Ücretsiz Başla →
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

// ─────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────
export function HeroSection() {
  const headlineLines = [
    { text: "Tıp Öğrencileri İçin", cyan: false },
    { text: "Yapay Zeka Asistanı", cyan: true },
    { text: "1. Sınıftan TUS'a Kadar", cyan: false },
  ];

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ background: C.bg, paddingTop: "5rem" }}
      aria-label="Ana sayfa hero bölümü"
    >
      {/* ── Backgrounds (dekoratif) ── */}
      <CircuitBackground />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Cyan glow blob */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          width: "600px",
          height: "600px",
          top: "-150px",
          left: "-100px",
          background: `radial-gradient(circle, rgba(0,196,235,0.12) 0%, transparent 70%)`,
          animation: "floatBlob1 12s ease-in-out infinite",
        }}
      />
      {/* Indigo glow blob */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          width: "700px",
          height: "700px",
          bottom: "-200px",
          right: "-150px",
          background: `radial-gradient(circle, rgba(20,0,166,0.25) 0%, transparent 70%)`,
          animation: "floatBlob2 15s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, 30px) scale(1.05); }
          66%  { transform: translate(-20px, 50px) scale(0.97); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-50px, -40px) scale(1.08); }
        }
      `}</style>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-8">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full text-xs font-medium"
              style={{
                background: "rgba(0,196,235,0.08)",
                border: `1px solid rgba(0,196,235,0.25)`,
                color: C.cyan,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: C.cyan,
                  boxShadow: `0 0 6px ${C.cyan}`,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              Google Gemini ile Güçlendirildi
            </motion.div>

            {/* Headline */}
            <div className="flex flex-col gap-1">
              {headlineLines.map((line, i) => (
                <motion.h1
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.15 * i + 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold leading-tight"
                  style={
                    line.cyan
                      ? {
                          background: `linear-gradient(90deg, ${C.cyan} 0%, #7DD3FC 100%)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }
                      : { color: C.white }
                  }
                >
                  {line.text}
                </motion.h1>
              ))}
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="text-base leading-relaxed max-w-lg"
              style={{ color: C.muted }}
            >
              400.000+ klinik vaka, Gemini destekli AI tanı asistanı ve sınıfa özel
              öğrenme içerikleriyle 1. sınıftan TUS'a tüm yolculuğunda yanında.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6"
              style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
            >
              <StatItem target={400} suffix="K+" label="Klinik Vaka" delay={0.85} />
              <StatItem target={2800} suffix="+" label="Aktif Kullanıcı" delay={0.95} />
              <StatItem target={94} suffix="%" label="TUS Başarı Oranı" delay={1.05} />
              <div className="flex flex-col">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 1.15 }}
                  className="text-2xl font-bold"
                  style={{ color: C.cyan }}
                >
                  7/24
                </motion.span>
                <span className="text-xs mt-0.5" style={{ color: C.muted }}>
                  Erişim
                </span>
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex flex-wrap gap-4"
            >
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  background: C.cyan,
                  color: "#0A0A0C",
                  boxShadow: `0 0 30px rgba(0,196,235,0.4), 0 4px 20px rgba(0,196,235,0.2)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 50px rgba(0,196,235,0.6), 0 6px 30px rgba(0,196,235,0.3)`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 30px rgba(0,196,235,0.4), 0 4px 20px rgba(0,196,235,0.2)`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Ücretsiz Başla →
              </a>
              <button
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{
                  background: "transparent",
                  color: C.white,
                  border: `1px solid ${C.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.cyan;
                  e.currentTarget.style.color = C.cyan;
                  e.currentTarget.style.background = "rgba(0,196,235,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.white;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  ▶
                </span>
                Demo İzle
              </button>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN — Mockup ── */}
          <div className="relative hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// MARQUEE BAND
// ─────────────────────────────────────────────
const UNIVERSITIES = [
  "Hacettepe Tıp",
  "İstanbul Tıp",
  "Ege Üniversitesi",
  "Marmara Tıp",
  "Ankara Tıp",
  "GATA",
  "Cerrahpaşa",
  "Dokuz Eylül",
];

export function MarqueeBand() {
  const doubled = [...UNIVERSITIES, ...UNIVERSITIES];

  return (
    <div
      className="relative overflow-hidden py-4"
      aria-label="Güvenen üniversiteler"
      role="region"
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to right, ${C.surface}, transparent)` }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${C.surface}, transparent)` }}
      />

      <div className="marquee-track">
        {/* Label prefix — only on first */}
        <div
          className="flex items-center gap-2 px-8 shrink-0"
          style={{ color: C.muted, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em" }}
        >
          <Stethoscope size={14} color={C.cyan} />
          <span style={{ color: C.cyan }}>Güvenen Kurumlar</span>
          <span className="mx-4" style={{ color: C.border }}>|</span>
        </div>

        {doubled.map((uni, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-6 shrink-0"
            style={{ color: C.muted, fontSize: "0.85rem", whiteSpace: "nowrap" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: C.cyan, opacity: 0.5 }}
            />
            {uni}
          </div>
        ))}
      </div>
    </div>
  );
}
