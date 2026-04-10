"use client";

import { useEffect, useRef, useState } from "react";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const FALLBACK_DATA = [0, 0, 0, 0, 0, 0, 0];

const WIDTH = 480;
const HEIGHT = 220;
const PADDING = { top: 20, right: 24, bottom: 36, left: 40 };

function buildPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 0; i < rest.length; i++) {
    const prev = points[i];
    const curr = rest[i];
    const cpx = (prev[0] + curr[0]) / 2;
    d += ` C ${cpx} ${prev[1]}, ${cpx} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  return d;
}

export function RegistrationChart({ data = FALLBACK_DATA }: { data?: number[] }) {
  const animRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const safeData = data.length > 0 ? data : FALLBACK_DATA;
  const maxVal = Math.max(...safeData, 1);
  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const points: [number, number][] = safeData.map((v, i) => [
    PADDING.left + (i / (safeData.length - 1)) * chartW,
    PADDING.top + (1 - v / (maxVal * 1.1)) * chartH,
  ]);

  // Animated progress 0 → 1 over ~900ms
  useEffect(() => {
    const start = performance.now();
    const duration = 900;

    function step(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    }

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Visible points up to progress
  const visibleCount = Math.max(2, Math.ceil(progress * safeData.length));
  const visiblePoints = points.slice(0, visibleCount);

  const linePath = buildPath(visiblePoints);

  // Area fill path
  let areaPath = "";
  if (visiblePoints.length >= 2) {
    const last = visiblePoints[visiblePoints.length - 1];
    const first = visiblePoints[0];
    areaPath =
      linePath +
      ` L ${last[0]} ${PADDING.top + chartH}` +
      ` L ${first[0]} ${PADDING.top + chartH} Z`;
  }

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];
  const latestPoint = points[points.length - 1];

  // Horizontal grid lines
  const gridLines = yTicks.slice(1).map((tick) => {
    const y = PADDING.top + (1 - tick / (maxVal * 1.1)) * chartH;
    return y;
  });

  return (
    <div className="w-full" style={{ minHeight: `${HEIGHT}px` }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: `${HEIGHT}px` }}
        aria-label="7 günlük kayıt trendi"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-primary)"
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary)"
              stopOpacity="0.02"
            />
          </linearGradient>
          <filter id="glowDot">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PADDING.left}
            y1={y}
            x2={WIDTH - PADDING.right}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => {
          const y = PADDING.top + (1 - tick / (maxVal * 1.1)) * chartH;
          return (
            <text
              key={tick}
              x={PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-text-secondary)"
            >
              {tick}
            </text>
          );
        })}

        {/* X-axis day labels */}
        {DAYS.map((day, i) => {
          const x = PADDING.left + (i / (data.length - 1)) * chartW;
          const y = PADDING.top + chartH + 20;
          return (
            <text
              key={day}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-secondary)"
            >
              {day}
            </text>
          );
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data point dots */}
        {visiblePoints.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3.5"
            fill="var(--color-primary)"
            opacity={i === visiblePoints.length - 1 ? 0 : 0.85}
          />
        ))}

        {/* Animated glowing dot at the latest visible point */}
        {visiblePoints.length > 0 && progress > 0.95 && (
          <>
            {/* Outer pulse ring */}
            <circle
              cx={latestPoint[0]}
              cy={latestPoint[1]}
              r="10"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              opacity="0.3"
            >
              <animate
                attributeName="r"
                values="6;14;6"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0;0.4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Inner solid dot */}
            <circle
              cx={latestPoint[0]}
              cy={latestPoint[1]}
              r="5"
              fill="var(--color-primary)"
              filter="url(#glowDot)"
            />
            {/* Value label */}
            <rect
              x={latestPoint[0] - 16}
              y={latestPoint[1] - 28}
              width="32"
              height="18"
              rx="5"
              fill="var(--color-primary)"
            />
            <text
              x={latestPoint[0]}
              y={latestPoint[1] - 15}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="black"
            >
              {safeData[safeData.length - 1]}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
