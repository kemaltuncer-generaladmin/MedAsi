"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const dateStr = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <div className="text-right shrink-0">
      <p
        className="text-xl font-bold tabular-nums"
        style={{ color: "var(--color-text-primary)" }}
      >
        {timeStr}
      </p>
      <p
        className="text-xs mt-0.5 capitalize"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {dateStr}
      </p>
    </div>
  );
}
