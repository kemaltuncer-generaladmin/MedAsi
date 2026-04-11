"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Shield, Zap, Building2 } from "lucide-react";
import Link from "next/link";
import { C } from "./salesTokens";

// ─────────────────────────────────────────────
// FOOTER CTA
// ─────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full opacity-30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: C.cyan,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const PRODUCT_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Asistan", href: "/ai-assistant" },
  { label: "Vaka RPG", href: "/case-rpg" },
  { label: "Flashcard", href: "/flashcards" },
  { label: "Klinik Yönetim", href: "/clinic" },
  { label: "Fiyatlar", href: "/pricing" },
];

const SUPPORT_LINKS = [
  { label: "SSS", href: "/#sss" },
  { label: "İletişim", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Dokümantasyon", href: "/docs" },
];

const LEGAL_LINKS = [
  { label: "Gizlilik Sözleşmesi", href: "/privacy" },
  { label: "Hizmet Şartları", href: "/terms" },
  { label: "Fiyatlar", href: "/pricing" },
  { label: "KVKK Başvurusu", href: "mailto:kvkk@medasi.com.tr" },
];

export function FooterCTA() {
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" });

  return (
    <>
      {/* CTA Section */}
      <section
        ref={ctaRef}
        className="w-full py-24 px-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${C.indigo} 0%, #0a1a4a 40%, #003a4a 70%, ${C.cyan}33 100%)`,
        }}
      >
        <FloatingParticles />

        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ color: C.text }}>
              Geleceğin Tıbbını{" "}
              <span style={{ color: C.cyan }}>Bugünden Deneyimleyin</span>
            </h2>
            <p className="text-lg md:text-xl mb-10" style={{ color: "#CBD5E1" }}>
              14 gün ücretsiz, kredi kartı olmadan. 2.800+ tıpçı zaten kullanıyor.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base shadow-xl transition-all"
                  style={{ background: "#ffffff", color: C.bg }}
                >
                  Ücretsiz Hesap Oluştur
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base border-2 transition-all hover:bg-white/10"
                  style={{ borderColor: "#ffffff66", color: C.text }}
                >
                  Planları İncele
                </motion.button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { icon: Shield, label: "KVKK Uyumlu" },
                { icon: Zap, label: "1.2sn Yanıt" },
                { icon: Building2, label: "400K+ Vaka" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#CBD5E1",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: C.cyan }} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }} className="w-full">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Logo + Desc */}
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <span className="text-2xl font-black tracking-tight" style={{ color: C.text }}>
                  MED<span style={{ color: C.cyan }}>ASI</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed mb-6" style={{ color: C.muted }}>
                Türkiye&apos;nin medikal AI platformu. Tıp öğrencileri ve hekimler için yapay zeka destekli eğitim ve klinik çözümler.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                {[
                  {
                    label: "Twitter/X",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Instagram",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    ),
                  },
                ].map(({ label, svg }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
                    style={{ border: `1px solid ${C.border}`, color: C.muted }}
                  >
                    {svg}
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Ürün
              </h4>
              <ul className="space-y-3">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Destek
              </h4>
              <ul className="space-y-3">
                {SUPPORT_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: C.text }}>
                Yasal
              </h4>
              <ul className="space-y-3">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: C.muted }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <p className="text-sm" style={{ color: C.muted }}>
              © 2026 MEDASI. Tüm hakları saklıdır.
            </p>
            <p className="text-sm flex items-center gap-2" style={{ color: C.muted }}>
              Türkiye&apos;nin medikal AI platformu
              <span>🇹🇷</span>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
