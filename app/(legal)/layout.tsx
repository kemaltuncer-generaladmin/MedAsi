import type { ReactNode } from "react";
import Link from "next/link";
import { MedicalAmbientDecor } from "@/components/layout/MedicalAmbientDecor";

const LEGAL_LINKS = [
  { label: "Gizlilik Sözleşmesi", href: "/privacy" },
  { label: "Hizmet Şartları", href: "/terms" },
  { label: "Fiyatlar", href: "/pricing" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
    >
      <MedicalAmbientDecor variant="legal" />
      {/* Navbar */}
      <header
        className="relative z-10 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Link href="/" className="text-lg font-bold tracking-tight">
          MED<span style={{ color: "var(--color-primary)" }}>ASİ</span>
        </Link>
        <nav className="flex items-center gap-6">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">{children}</main>

      {/* Footer */}
      <footer
        className="relative z-10 border-t px-6 py-8 text-center text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-disabled)" }}
      >
        © {new Date().getFullYear()} MEDASI. Tüm hakları saklıdır. ·{" "}
        <Link href="/privacy" className="transition-colors">Gizlilik</Link>
        {" · "}
        <Link href="/terms" className="transition-colors">Şartlar</Link>
      </footer>
    </div>
  );
}
