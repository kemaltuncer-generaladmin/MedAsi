"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Star } from "lucide-react";
import { C } from "./salesTokens";

// ─────────────────────────────────────────────
// TESTIMONIALS SECTION
// ─────────────────────────────────────────────
interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  gradient: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Vaka RPG modülüyle staj öncesi hazırlandım, hiç sıkılmadan. Kliniğe ilk günden güvenle girdim.",
    name: "Zeynep K.",
    role: "Hacettepe Tıp • 4. Sınıf",
    initials: "ZK",
    gradient: "linear-gradient(135deg, #00C4EB, #1400A6)",
  },
  {
    quote: "TUS AI koçu benim için özel soru seti oluşturdu. Zayıf olduğum konuları haftada bitirdim.",
    name: "Mert O.",
    role: "Ankara Tıp • 6. Sınıf — TUS Hazırlık",
    initials: "MO",
    gradient: "linear-gradient(135deg, #6366f1, #a855f7)",
  },
  {
    quote: "Flashcard AI gerçekten işe yarıyor. Histoloji ezberlerim %80 azaldı, sınava çok daha hazır hissediyorum.",
    name: "Elif Y.",
    role: "Ege Üniversitesi • 3. Sınıf",
    initials: "EY",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
  {
    quote: "OSCE simülasyonu sayesinde kliniğe güvenle giriyorum. Sorular gerçekten sınav standartında.",
    name: "Burak A.",
    role: "Marmara Tıp • 5. Sınıf",
    initials: "BA",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
  },
  {
    quote: "Spot notlar AI özeti sınavdan 1 hafta önce kurtarıcım oldu. Başka türlü yetiştirilemezdi.",
    name: "Selin T.",
    role: "İstanbul Tıp • 2. Sınıf",
    initials: "ST",
    gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
  },
  {
    quote: "TUS'a 3 ay kala Pro'ya geçtim. Hayatımın en iyi yatırımıydı. Hedeflediğim puanı aldım.",
    name: "Can D.",
    role: "Cerrahpaşa Tıp • TUS Hazırlık",
    initials: "CD",
    gradient: "linear-gradient(135deg, #00C4EB, #10b981)",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" style={{ color: C.gold }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "#CBD5E1" }}>
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: testimonial.gradient }}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: C.text }}>
            {testimonial.name}
          </p>
          <p className="text-xs" style={{ color: C.muted }}>
            {testimonial.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const totalPages = TESTIMONIALS.length - 2; // 0..3 for desktop (show 3 at a time)
  const mobileTotalPages = TESTIMONIALS.length;

  const advance = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [advance]);

  const visibleDesktop = [
    TESTIMONIALS[page % TESTIMONIALS.length],
    TESTIMONIALS[(page + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(page + 2) % TESTIMONIALS.length],
  ];

  return (
    <section
      ref={ref}
      style={{ background: C.bg }}
      className="w-full py-24 px-4"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
            Kullanıcılarımız{" "}
            <span style={{ color: C.cyan }}>Ne Diyor?</span>
          </h2>
        </motion.div>

        {/* Desktop: 3 cards */}
        <div className="hidden md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-3 gap-6"
            >
              {visibleDesktop.map((t, i) => (
                <TestimonialCard key={`${page}-${i}`} testimonial={t} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile: 1 card */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`mobile-${page}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
            >
              <TestimonialCard testimonial={TESTIMONIALS[page % mobileTotalPages]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width: i === page ? "24px" : "8px",
                height: "8px",
                background: i === page ? C.cyan : C.border,
              }}
              aria-label={`Sayfa ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
