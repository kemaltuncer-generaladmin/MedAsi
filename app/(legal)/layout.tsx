import type { ReactNode } from "react";
import Link from "next/link";

const LEGAL_LINKS = [
  { label: "Gizlilik Sözleşmesi", href: "/privacy" },
  { label: "Hizmet Şartları", href: "/terms" },
  { label: "Fiyatlar", href: "/pricing" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: "#0A0A0C", color: "#FFFFFF", minHeight: "100vh" }}>
      {/* Navbar */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "#1E1E24" }}
      >
        <Link href="/" className="text-lg font-bold tracking-tight">
          MED<span style={{ color: "#00C4EB" }}>ASİ</span>
        </Link>
        <nav className="flex items-center gap-6">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm transition-colors hover:text-white"
              style={{ color: "#94A3B8" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">{children}</main>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 text-center text-sm"
        style={{ borderColor: "#1E1E24", color: "#64748B" }}
      >
        © {new Date().getFullYear()} MEDASI. Tüm hakları saklıdır. ·{" "}
        <Link href="/privacy" className="hover:text-white transition-colors">Gizlilik</Link>
        {" · "}
        <Link href="/terms" className="hover:text-white transition-colors">Şartlar</Link>
      </footer>
    </div>
  );
}
