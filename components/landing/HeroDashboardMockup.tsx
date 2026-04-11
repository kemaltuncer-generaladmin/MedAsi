"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
export function DashboardMockup() {
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
