"use client";

import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { DashboardMockup } from "./HeroDashboardMockup";
import { StatItem } from "./HeroStats";

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
