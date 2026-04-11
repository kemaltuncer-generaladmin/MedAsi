import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface StatItem {
  label: string;
  value: string;
}

interface AccountSubpageShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  stats?: StatItem[];
  actions?: ReactNode;
  children: ReactNode;
}

export function AccountSubpageShell({
  icon: Icon,
  title,
  description,
  badge,
  stats,
  actions,
  children,
}: AccountSubpageShellProps) {
  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl border p-6 md:p-7"
        style={{
          borderColor: "color-mix(in srgb, var(--color-primary) 22%, var(--color-border))",
          background:
            "radial-gradient(110% 110% at 0% 0%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 55%), radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, var(--color-success) 10%, transparent), transparent 58%), var(--color-surface)",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/15">
              <Icon size={20} className="text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] md:text-3xl">
                  {title}
                </h1>
                {badge ? <Badge variant="outline">{badge}</Badge> : null}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)] md:text-[15px]">
                {description}
              </p>
            </div>
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>

        {stats && stats.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface-elevated) 65%, transparent)",
                }}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-disabled)]">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  );
}
