"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  cyan: "#00C4EB",
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
// STAT ITEM
// ─────────────────────────────────────────────
export function StatItem({
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
