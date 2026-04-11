"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { C } from "./salesTokens";

// ─────────────────────────────────────────────
// FAQ SECTION
// ─────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "MEDASI hangi tıp öğrencilerine uygundur?",
    answer:
      "1. sınıftan 6. sınıfa kadar tüm tıp öğrencileri ve TUS hazırlık sürecindeki mezunlar için tasarlandı. Her sınıfa özel içerik, sorular ve AI desteği sunulur. Kayıt sırasında dönemini seçersen içerikler otomatik kişiselleşir.",
  },
  {
    question: "Ücretsiz plan neler içeriyor?",
    answer:
      "Yapay zeka olmadan tüm temel araçlar ücretsiz: Pomodoro zamanlayıcı, ders ve staj planlayıcısı, klinik not alma, 5 hastaya kadar takip ve günlük brifing. Kredi kartı gerektirmez, süre sınırı yoktur.",
  },
  {
    question: "14 günlük denemede neden kredi kartı isteniyor?",
    answer:
      "Giriş ve Pro planların 14 günlük denemesi için kredi kartı bilgisi alınmaktadır. Deneme süresince ücret kesilmez; deneme bitmeden 24 saat önce e-posta ile bilgilendirilirsiniz. İstediğiniz zaman iptal edebilirsiniz.",
  },
  {
    question: "Gemini AI yanıtları ne kadar güvenilir?",
    answer:
      "Google Gemini ile güçlendirilmiş yapay zekamız güncel tıbbi kılavuzlarla (UpToDate, WHO, TTB) desteklenmektedir. Her yanıt kaynak referansıyla sunulur. Yine de klinik kararlar için uzmana danışılmasını öneririz.",
  },
  {
    question: "TUS hazırlığında MEDASI nasıl yardımcı oluyor?",
    answer:
      "TUS AI Koçu zayıf olduğun konuları tespit eder ve sana özel günlük soru setleri oluşturur. OSCE simülasyonları, Vaka RPG ve Medikal Terminal ile pratik bilgini pekiştirirsin. Performans grafiklerin haftalık raporlanır.",
  },
  {
    question: "Veri gizliliğim nasıl korunuyor?",
    answer:
      "KVKK uyumlu altyapı, Supabase şifreli depolama ve end-to-end şifreleme ile verileriniz korunur. Kişisel verileriniz hiçbir zaman üçüncü taraflarla paylaşılmaz.",
  },
  {
    question: "Kurumsal / grup lisans nasıl çalışıyor?",
    answer:
      "Tıp fakülteleri ve TUS hazırlık grupları için toplu lisans indirimi sunuyoruz. Fakülte bazlı öğrenci yönetimi, ilerleme takibi ve özel SSO entegrasyonu içerir. Demo talep formundan bizimle iletişime geçin.",
  },
  {
    question: "Planımı değiştirebilir miyim?",
    answer:
      "Dilediğiniz zaman yükseltme veya düşürme yapabilirsiniz. Yükseltme anında aktif olur; düşürme mevcut dönem sonunda geçerlidir. Kalan süre için orantılı iade sağlanır.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="sss"
      ref={ref}
      style={{ background: C.surface }}
      className="w-full py-24 px-4"
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
            Sıkça Sorulan{" "}
            <span style={{ color: C.cyan }}>Sorular</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${isOpen ? C.cyan + "66" : C.border}`, background: C.bg }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none group"
                >
                  <span
                    className="font-semibold text-sm md:text-base transition-colors duration-200"
                    style={{ color: isOpen ? C.cyan : C.text }}
                  >
                    {item.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 ml-4"
                  >
                    <ChevronDown className="w-5 h-5" style={{ color: isOpen ? C.cyan : C.muted }} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p
                        className="px-5 pb-5 text-sm leading-relaxed"
                        style={{ color: C.muted }}
                      >
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
