import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(135deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_72%,white))] text-[var(--color-text-inverse)] hover:opacity-95 hover:shadow-lg",
  secondary:
    "bg-[color-mix(in_srgb,var(--color-secondary)_18%,transparent)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[color-mix(in_srgb,var(--color-secondary)_24%,transparent)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5",
  destructive:
    "bg-[var(--color-destructive)] text-[var(--color-text-inverse)] hover:opacity-90 hover:shadow-md",
};

const sizeClass: Record<Size, string> = {
  xs: "h-7 px-2 text-xs rounded-md",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base rounded-xl",
  lg: "px-6 py-3 text-lg rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-base",
        "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
