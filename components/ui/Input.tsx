import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-base text-[var(--color-text-primary)]",
            "placeholder:text-[var(--color-text-disabled)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
            "disabled:pointer-events-none disabled:opacity-50",
            error ? "border-destructive focus:ring-destructive" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
        {hint && !error && (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {hint}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
