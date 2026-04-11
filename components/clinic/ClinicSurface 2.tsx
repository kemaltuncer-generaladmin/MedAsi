"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function ClinicHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  accent = "var(--color-primary)",
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="glass-panel overflow-hidden rounded-3xl p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-disabled)]">
            <Icon size={14} />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-semibold leading-tight text-[var(--color-text-primary)] md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] md:text-base">
            {description}
          </p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function ClinicStat({
  label,
  value,
  detail,
  tone = "var(--color-primary)",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      <p className="medasi-panel-title">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{detail}</p>
      <div className="mt-4 h-1.5 w-16 rounded-full" style={{ backgroundColor: tone }} />
    </div>
  );
}

export function ClinicMiniLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-white/5 px-4 py-4 transition-colors hover:bg-white/10"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{detail}</p>
      </div>
      <ArrowRight size={15} className="text-[var(--color-primary)]" />
    </Link>
  );
}
