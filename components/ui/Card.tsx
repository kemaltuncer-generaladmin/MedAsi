import type { ReactNode } from "react";

type Variant = "default" | "elevated" | "bordered";

interface CardProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
}

const variantClass: Record<Variant, string> = {
  default: "glass-panel",
  elevated: "glass-panel bg-[var(--color-surface-elevated)]",
  bordered: "glass-panel",
};

export function Card({
  children,
  variant = "default",
  className = "",
  style,
}: CardProps) {
  return (
    <div
      style={style}
      className={["rounded-3xl p-6", variantClass[variant], className].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div style={style}
      className={["mb-4", className].join(" ")}>{children}</div>;
}

export function CardTitle({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <h3
      style={style}
      className={[
        "text-lg font-semibold text-[var(--color-text-primary)]",
        className,
      ].join(" ")}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={["text-[var(--color-text-secondary)]", className].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardDescription({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p
      style={style}
      className={[
        "text-sm text-[var(--color-text-secondary)]",
        className,
      ].join(" ")}
    >
      {children}
    </p>
  );
}

export function CardFooter({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}
      className={["mt-4 flex items-center", className].join(" ")}>
      {children}
    </div>
  );
}
