import type { CSSProperties } from "react";
import { Activity, Brain, Plus, Stethoscope, Zap } from "lucide-react";

type DecorVariant = "landing" | "dashboard" | "auth" | "legal";

const VARIANT_STYLES: Record<
  DecorVariant,
  {
    halo: string;
    secondaryHalo: string;
    gridOpacity: string;
    iconOpacity: string;
  }
> = {
  landing: {
    halo: "rgba(0,196,235,0.14)",
    secondaryHalo: "rgba(20,0,166,0.16)",
    gridOpacity: "0.08",
    iconOpacity: "0.22",
  },
  dashboard: {
    halo: "rgba(0,196,235,0.09)",
    secondaryHalo: "rgba(56,189,248,0.1)",
    gridOpacity: "0.05",
    iconOpacity: "0.16",
  },
  auth: {
    halo: "rgba(0,229,255,0.16)",
    secondaryHalo: "rgba(20,0,166,0.18)",
    gridOpacity: "0.08",
    iconOpacity: "0.22",
  },
  legal: {
    halo: "rgba(0,196,235,0.08)",
    secondaryHalo: "rgba(14,165,233,0.08)",
    gridOpacity: "0.04",
    iconOpacity: "0.14",
  },
};

const ICONS = [
  {
    Icon: Activity,
    className: "left-[6%] top-24 hidden md:block medasi-float-slow",
    size: 28,
    rotate: -10,
  },
  {
    Icon: Brain,
    className: "right-[8%] top-36 hidden lg:block medasi-float-medium",
    size: 32,
    rotate: 8,
  },
  {
    Icon: Stethoscope,
    className: "bottom-24 left-[10%] hidden xl:block medasi-float-slow",
    size: 30,
    rotate: -12,
  },
  {
    Icon: Zap,
    className: "bottom-28 right-[12%] hidden md:block medasi-float-fast",
    size: 26,
    rotate: 12,
  },
  {
    Icon: Plus,
    className: "left-1/2 top-[18%] hidden 2xl:block medasi-drift",
    size: 24,
    rotate: 0,
  },
];

export function MedicalAmbientDecor({
  variant,
  className = "",
}: {
  variant: DecorVariant;
  className?: string;
}) {
  const theme = VARIANT_STYLES[variant];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,var(--grid-opacity)) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,var(--grid-opacity)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          ["--grid-opacity" as string]: theme.gridOpacity,
        } as CSSProperties}
      />

      <div
        className="absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl medasi-pulse-halo"
        style={{ background: theme.halo }}
      />
      <div
        className="absolute right-[-3rem] top-1/3 h-80 w-80 rounded-full blur-3xl medasi-pulse-halo"
        style={{ background: theme.secondaryHalo, animationDelay: "1.8s" }}
      />
      <div className="absolute inset-x-[18%] top-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-x-[14%] bottom-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent" />

      <div className="absolute left-[12%] top-[22%] h-32 w-32 rounded-full border border-white/10 medasi-orbit-ring" />
      <div className="absolute right-[14%] bottom-[18%] h-24 w-24 rounded-full border border-[var(--color-primary)]/15 medasi-orbit-ring" />

      {ICONS.map(({ Icon, className: iconClassName, size, rotate }, index) => (
        <div key={`${variant}-${index}`} className={`absolute ${iconClassName}`}>
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_0_30px_rgba(0,0,0,0.18)] backdrop-blur-sm"
            style={{
              color: `color-mix(in srgb, var(--color-primary) 76%, white)`,
              opacity: theme.iconOpacity,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <Icon size={size} strokeWidth={1.7} />
          </div>
        </div>
      ))}

      <svg
        viewBox="0 0 1200 240"
        className="absolute bottom-8 left-0 w-full opacity-[0.16]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 164H118L156 164L184 98L216 214L252 42L288 164H392L432 164L468 118L504 164H640L690 164L728 76L768 210L804 164H1200"
          stroke="url(#medasi-ekg-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="medasi-ekg-svg"
        />
        <defs>
          <linearGradient id="medasi-ekg-gradient" x1="0" y1="120" x2="1200" y2="120">
            <stop stopColor="transparent" />
            <stop offset="0.18" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="0.52" stopColor="#00C4EB" />
            <stop offset="0.82" stopColor="rgba(20,0,166,0.4)" />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
