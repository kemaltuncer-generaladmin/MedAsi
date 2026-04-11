"use client";

import { useRef, useState, useEffect, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  debounce = 300,
  placeholder = "Ara...",
  className = "",
  ...props
}: SearchInputProps) {
  const [internal, setInternal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (val: string) => {
    setInternal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), debounce);
  };

  return (
    <div
      className={[
        "relative flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)]",
        "focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-transparent",
        className,
      ].join(" ")}
    >
      <Search
        size={16}
        className="absolute left-3 text-[var(--color-text-secondary)]"
      />
      <input
        type="text"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2 pl-9 pr-8 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] outline-none"
        {...props}
      />
      {internal && (
        <button
          type="button"
          onClick={() => handleChange("")}
          className="absolute right-2 rounded p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label="Temizle"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
