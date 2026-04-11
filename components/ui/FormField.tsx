import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className = "",
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={["flex flex-col gap-1.5", className].join(" ")}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-[var(--color-text-primary)]"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--color-destructive)]">*</span>
        )}
      </label>
      {children}
      {error && (
        <span className="text-xs text-[var(--color-destructive)]" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="text-xs text-[var(--color-text-secondary)]">
          {hint}
        </span>
      )}
    </div>
  );
}
