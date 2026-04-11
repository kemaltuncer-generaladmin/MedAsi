"use client";

import type { LucideIcon } from "lucide-react";

interface Tab {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({
  tabs,
  activeKey,
  onChange,
  className = "",
  size = "md",
}: TabsProps) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div
      role="tablist"
      className={[
        "flex gap-1 rounded-lg bg-[var(--color-surface)] p-1 border border-[var(--color-border)]",
        className,
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={[
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150",
              sizeClass,
              active
                ? "bg-[var(--color-primary)] text-black shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]",
            ].join(" ")}
          >
            {Icon && <Icon size={size === "sm" ? 14 : 16} />}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active
                    ? "bg-black/20 text-black"
                    : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]",
                ].join(" ")}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
