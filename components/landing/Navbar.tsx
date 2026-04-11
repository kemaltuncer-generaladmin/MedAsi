"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0A0A0C",
  surface: "#141419",
  border: "#1E1E24",
  cyan: "#00C4EB",
  indigo: "#1400A6",
  white: "#FFFFFF",
  muted: "#94A3B8",
};

// Anchor href → section id eşleşmesi (Türkçe karakterleri koruyarak)
const NAV_LINKS = [
  { label: "Özellikler", href: "#özellikler" },
  { label: "Nasıl Çalışır", href: "#nasıl-çalışır" },
  { label: "Fiyatlar", href: "#fiyatlar" },
  { label: "SSS", href: "#sss" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Mobil menü açıkken body scroll kilitle
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // ESC tuşuyla menüyü kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Ana navigasyon"
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled || mobileOpen ? "rgba(10,10,12,0.95)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(16px)" : "none",
          borderBottom: scrolled || mobileOpen ? `1px solid ${C.border}` : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ color: C.white }}
            aria-label="Medasi ana sayfaya git"
          >
            MED<span style={{ color: C.cyan }}>ASI</span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm transition-colors duration-200"
                style={{ color: C.muted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden sm:inline-flex items-center text-sm px-4 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-[#1E1E24] hover:text-white"
              style={{ color: C.muted }}
            >
              Giriş Yap
            </a>
            <a
              href="/register"
              className="inline-flex items-center text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 hover:-translate-y-px"
              style={{
                background: C.cyan,
                color: "#0A0A0C",
                boxShadow: `0 0 20px rgba(0,196,235,0.35)`,
              }}
            >
              Ücretsiz Başla
            </a>

            {/* Hamburger — yalnızca mobilde görünür */}
            <button
              type="button"
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-lg transition-colors"
              style={{ color: C.white }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            >
              <span
                className="block w-5 h-0.5 transition-all duration-200 origin-center"
                style={{
                  background: C.white,
                  transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all duration-200"
                style={{
                  background: C.white,
                  opacity: mobileOpen ? 0 : 1,
                }}
              />
              <span
                className="block w-5 h-0.5 transition-all duration-200 origin-center"
                style={{
                  background: C.white,
                  transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              id="mobile-menu"
              key="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="md:hidden overflow-hidden"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <div className="px-6 py-5 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-base py-3 border-b transition-colors"
                    style={{
                      color: C.muted,
                      borderColor: C.border,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 mt-5">
                  <a
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ color: C.white, borderColor: C.border }}
                  >
                    Giriş Yap
                  </a>
                  <a
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold"
                    style={{ background: C.cyan, color: "#0A0A0C" }}
                  >
                    Ücretsiz Başla →
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
