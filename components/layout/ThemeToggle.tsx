"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyTheme, readStoredTheme, SYSTEM_KEY, type ThemeOption } from "@/lib/theme";

const PRIMARY_OPTIONS: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Aydinlik", icon: Sun },
  { value: "dark", label: "Karanlik", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

const ACCENT_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: "night_blue", label: "Gece Mavi" },
  { value: "cream_contrast", label: "Krem Kontrast" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeOption>("dark");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const setAndPersist = (nextTheme: ThemeOption) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setPaletteOpen(false);

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
      ref={rootRef}
      className="relative inline-flex items-center gap-1 rounded-2xl border p-1"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderColor: "var(--color-border)",
      }}
      aria-label="Tema secici"
    >
      {PRIMARY_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = value === theme;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setAndPersist(value)}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-150 hover:bg-white/5"
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
            <span className="hidden xl:inline">{label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setPaletteOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-150 hover:bg-white/5"
        style={{
          backgroundColor: paletteOpen
            ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
            : "transparent",
          color: paletteOpen ? "var(--color-primary)" : "var(--color-text-secondary)",
        }}
        aria-expanded={paletteOpen}
        aria-haspopup="menu"
        aria-label="Tema paletini ac"
        title="Tema paleti"
      >
        <Palette size={14} />
        <span className="hidden xl:inline">Palet</span>
      </button>

      {paletteOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] rounded-2xl border p-1.5 shadow-lg backdrop-blur-xl"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            borderColor: "var(--color-border-strong)",
          }}
        >
          {ACCENT_OPTIONS.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => setAndPersist(option.value)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors"
                style={{
                  backgroundColor: active
                    ? "color-mix(in srgb, var(--color-primary) 12%, transparent)"
                    : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}
              >
                {option.label}
                {active ? <Check size={14} className="text-[var(--color-primary)]" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
