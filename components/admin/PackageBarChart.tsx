"use client";

import { useEffect, useState } from "react";

interface PackageDistribution {
  name: string;
  count: number;
  percentage: number;
}

interface PackageBarChartProps {
  distribution: PackageDistribution[];
}

const ACCENT_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
];

export function PackageBarChart({ distribution }: PackageBarChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(id);
  }, []);

  if (distribution.length === 0) {
    return (
      <p
        className="text-sm py-8 text-center"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Henüz paket dağılımı verisi yok.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {distribution.map((pkg, i) => {
        const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
        return (
          <div key={pkg.name}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="text-sm font-medium capitalize"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {pkg.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {pkg.count.toLocaleString("tr-TR")} kullanıcı
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color }}
                >
                  %{pkg.percentage}
                </span>
              </div>
            </div>

            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-border)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: color,
                  width: animated ? `${pkg.percentage}%` : "0%",
                  transition: "width 700ms cubic-bezier(0.4,0,0.2,1)",
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
