"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmLabel = "Onayla",
  cancelLabel = "Vazge\u00e7",
  variant = "default",
  loading,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-lg animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Kapat"
        >
          <X size={18} />
        </button>

        {title && (
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] pr-8">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {onConfirm && (
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "primary"}
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
