"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, readStoredTheme, SYSTEM_KEY, type ThemeOption } from "@/lib/theme";

const OPTIONS: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Aydinlik", icon: Sun },
  { value: "dark", label: "Karanlik", icon: Moon },
  { value: "night_blue", label: "Gece Mavi", icon: Palette },
  { value: "cream_contrast", label: "Krem Kontrast", icon: Palette },
  { value: "system", label: "Sistem", icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeOption>("dark");

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const latest = readStoredTheme();
      if (latest === "system") {
        applyTheme(latest);
      }
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setAndPersist = (nextTheme: ThemeOption) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);

    try {
      const raw = window.localStorage.getItem(SYSTEM_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(
        SYSTEM_KEY,
        JSON.stringify({
          ...parsed,
          theme: nextTheme,
        }),
      );
    } catch {
      window.localStorage.setItem(SYSTEM_KEY, JSON.stringify({ theme: nextTheme }));
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border p-1"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderColor: "var(--color-border)",
      }}
      aria-label="Tema secici"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = value === theme;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setAndPersist(value)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: active
                ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
                : "transparent",
              color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
            aria-pressed={active}
            title={label}
          >
            <Icon size={14} />
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
