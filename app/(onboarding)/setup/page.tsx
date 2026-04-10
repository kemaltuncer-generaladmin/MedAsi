"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Target,
  Loader2,
  Calendar,
  Clock,
  Sun,
  Sunset,
  Moon,
  Shuffle,
  MessageSquare,
} from "lucide-react";
import { ProgressStepper } from "@/components/onboarding/ProgressStepper";
import { completeOnboarding } from "@/lib/actions/onboarding";

// ─── Sabitler ────────────────────────────────────────────────
const STEP_LABELS = ["Hoş Geldin", "Dönem", "Çalışma Düzeni", "Hazır!"];

interface YearCard {
  value: string;
  label: string;
  sub: string;
  emoji: string;
}

const YEARS: YearCard[] = [
  { value: "1", label: "1. Sınıf", sub: "Temel Tıp Bilimleri", emoji: "📚" },
  { value: "2", label: "2. Sınıf", sub: "Temel Tıp Bilimleri", emoji: "📚" },
  { value: "3", label: "3. Sınıf", sub: "Temel Tıp Bilimleri", emoji: "🔬" },
  { value: "4", label: "4. Sınıf", sub: "Klinik Dönem", emoji: "🏥" },
  { value: "5", label: "5. Sınıf", sub: "Klinik Dönem", emoji: "🏥" },
  { value: "6", label: "6. Sınıf", sub: "Klinik Dönem", emoji: "🩺" },
  { value: "tus", label: "TUS Hazırlık", sub: "Uzmanlık Sınavı", emoji: "🎯" },
];

const GOALS = [
  { key: "tus_sorulari", label: "TUS sınav soruları" },
  { key: "osce", label: "OSCE pratiği" },
  { key: "klinik_vaka", label: "Klinik vaka çözümü" },
  { key: "temel_bilim", label: "Temel bilim konuları" },
  { key: "ders_notu", label: "Ders notu özeti" },
  { key: "lab_yorum", label: "Laboratuvar yorumlama" },
  { key: "soru_bankasi", label: "Soru bankası" },
  { key: "staj_hazirlik", label: "Staj hazırlığı" },
];

const WEEKLY_HOURS = [
  { value: "1-5", label: "1–5 saat" },
  { value: "5-10", label: "5–10 saat" },
  { value: "10-20", label: "10–20 saat" },
  { value: "20+", label: "20+ saat" },
];

const STUDY_TIMES = [
  { value: "sabah", label: "Sabah", sub: "06:00 – 12:00", Icon: Sun },
  { value: "oglen", label: "Öğleden Sonra", sub: "12:00 – 18:00", Icon: Sun },
  { value: "aksam", label: "Akşam", sub: "18:00 – 23:00", Icon: Sunset },
  { value: "gece", label: "Gece", sub: "23:00+", Icon: Moon },
  { value: "esnek", label: "Esnek", sub: "Değişken", Icon: Shuffle },
];

const COMMUNICATION_STYLES = [
  { value: "formal", label: "Resmi ve Akademik", sub: "Profesyonel bir dil" },
  { value: "friendly", label: "Samimi ve Motive Edici", sub: "Arkadaşça bir yaklaşım" },
  { value: "socratic", label: "Sokratik (Düşündürücü)", sub: "Sorularla yönlendirme" },
];

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.25 },
  }),
};

export default function SetupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [studyLevel, setStudyLevel] = useState<string>("");
  const [tusExamDate, setTusExamDate] = useState<string>("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<string>("");
  const [studyTime, setStudyTime] = useState<string>("");
  const [communicationStyle, setCommunicationStyle] = useState<string>("friendly");

  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  }

  function handleNext() {
    if (step === 2 && !studyLevel) { setError("Lütfen dönemini seç."); return; }
    if (step === 3 && selectedGoals.length === 0) { setError("En az bir hedef seç."); return; }
    if (step === 3 && !weeklyHours) { setError("Haftalık çalışma süresini seç."); return; }
    if (step === 3 && !studyTime) { setError("Tercih ettiğin çalışma zamanını seç."); return; }
    if (step === 3 && !communicationStyle) { setError("Lütfen bir iletişim tarzı seç."); return; }
    go(step + 1);
  }

  function toggleGoal(key: string) {
    setSelectedGoals((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]
    );
  }

  function handleFinish() {
    startTransition(async () => {
      const result = await completeOnboarding({
        studyLevel,
        goals: selectedGoals,
        weeklyStudyHours: weeklyHours,
        preferredStudyTime: studyTime,
        tusExamDate: tusExamDate || undefined,
        communicationStyle,
      });

      if (!result.success) {
        setError(result.error ?? "Bir hata oluştu.");
        return;
      }

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#00C4EB", "#1400A6", "#ffffff"],
      });
      setTimeout(() => router.push("/dashboard"), 1200);
    });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#0A0A0C" }}
    >
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-wider" style={{ color: "#fff" }}>
            MED<span style={{ color: "#00C4EB" }}>ASI</span>
          </span>
        </div>

        <ProgressStepper currentStep={step} labels={STEP_LABELS} />

        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "#141419", border: "1px solid #1E1E24", minHeight: 380 }}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="p-8"
            >
              {/* STEP 1 */}
              {step === 1 && (
                <div className="flex flex-col items-center text-center gap-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                    style={{ background: "rgba(0,196,235,0.12)" }}
                  >
                    👋
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>
                      MEDASI&apos;ya Hoş Geldin!
                    </h1>
                    <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                      Sana özel bir öğrenme deneyimi hazırlamak için birkaç soru sormamız gerekiyor.
                      Bu yalnızca 1 dakika sürer.
                    </p>
                  </div>
                  <div className="w-full space-y-3 text-left">
                    {[
                      { icon: "🤖", text: "Kişiselleştirilmiş Gemini AI asistanı" },
                      { icon: "📋", text: "Sınıfına özel sorular ve içerik" },
                      { icon: "🎯", text: "TUS odaklı performans analizi" },
                    ].map(({ icon, text }) => (
                      <div
                        key={text}
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                          background: "rgba(0,196,235,0.06)",
                          border: "1px solid rgba(0,196,235,0.15)",
                        }}
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium" style={{ color: "#CBD5E1" }}>
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => go(2)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm text-black transition-all hover:opacity-90"
                    style={{ background: "#00C4EB", boxShadow: "0 0 20px rgba(0,196,235,0.4)" }}
                  >
                    Hadi Başlayalım <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-1" style={{ color: "#fff" }}>
                      Hangi dönemdesin?
                    </h2>
                    <p className="text-sm" style={{ color: "#94A3B8" }}>
                      Sana en uygun içeriği hazırlayabilmek için dönemini seç.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {YEARS.map((y) => {
                      const sel = studyLevel === y.value;
                      return (
                        <button
                          key={y.value}
                          onClick={() => { setStudyLevel(y.value); setError(null); }}
                          className="rounded-xl p-4 text-left transition-all duration-200"
                          style={{
                            background: sel ? "rgba(0,196,235,0.12)" : "#0d0d12",
                            border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                          }}
                        >
                          <div className="text-2xl mb-1">{y.emoji}</div>
                          <div
                            className="text-sm font-bold"
                            style={{ color: sel ? "#00C4EB" : "#fff" }}
                          >
                            {y.label}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                            {y.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {studyLevel === "tus" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <label
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: "#CBD5E1" }}
                      >
                        <Calendar size={14} style={{ color: "#00C4EB" }} />
                        TUS Sınav Tarihi (opsiyonel)
                      </label>
                      <input
                        type="month"
                        value={tusExamDate}
                        onChange={(e) => setTusExamDate(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                        style={{
                          background: "#0d0d12",
                          border: "1px solid #1E1E24",
                          color: "#fff",
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1" style={{ color: "#fff" }}>
                      Nasıl Çalışıyorsun?
                    </h2>
                    <p className="text-sm" style={{ color: "#94A3B8" }}>
                      AI asistanın sana göre ayarlanacak.
                    </p>
                  </div>

                  {/* Hedefler */}
                  <div className="space-y-2">
                    <label
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      Odaklanmak istediğin konular
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GOALS.map((g) => {
                        const sel = selectedGoals.includes(g.key);
                        return (
                          <button
                            key={g.key}
                            onClick={() => toggleGoal(g.key)}
                            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.15)" : "#0d0d12",
                              border: sel ? "1px solid #00C4EB" : "1px solid #1E1E24",
                              color: sel ? "#00C4EB" : "#94A3B8",
                            }}
                          >
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Haftalık Saat */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      <Clock size={12} /> Haftalık ortalama çalışma süresi
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {WEEKLY_HOURS.map((h) => {
                        const sel = weeklyHours === h.value;
                        return (
                          <button
                            key={h.value}
                            onClick={() => setWeeklyHours(h.value)}
                            className="rounded-xl py-2.5 text-sm font-medium transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.12)" : "#0d0d12",
                              border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                              color: sel ? "#00C4EB" : "#94A3B8",
                            }}
                          >
                            {h.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                                    {/* Çalışma Zamanı */}
                  <div className="space-y-2">
                    <label
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      Tercih ettiğin çalışma zamanı
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {STUDY_TIMES.map(({ value, label, sub, Icon }) => {
                        const sel = studyTime === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setStudyTime(value)}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.10)" : "#0d0d12",
                              border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                            }}
                          >
                            <Icon
                              size={16}
                              style={{ color: sel ? "#00C4EB" : "#64748B", flexShrink: 0 }}
                            />
                            <div>
                              <div
                                className="text-sm font-medium"
                                style={{ color: sel ? "#00C4EB" : "#CBD5E1" }}
                              >
                                {label}
                              </div>
                              <div className="text-xs" style={{ color: "#64748B" }}>{sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* İletişim Tarzı */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      <MessageSquare size={12} /> AI İletişim Tarzı (Çevresel Beyin)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {COMMUNICATION_STYLES.map(({ value, label, sub }) => {
                        const sel = communicationStyle === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setCommunicationStyle(value)}
                            className="rounded-xl py-3 px-3 text-center transition-all"
                            style={{
                              background: sel ? "rgba(0,196,235,0.12)" : "#0d0d12",
                              border: sel ? "2px solid #00C4EB" : "2px solid #1E1E24",
                            }}
                          >
                            <div
                              className="text-sm font-medium mb-1"
                              style={{ color: sel ? "#00C4EB" : "#CBD5E1" }}
                            >
                              {label}
                            </div>
                            <div className="text-xs" style={{ color: "#64748B" }}>
                              {sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="flex flex-col items-center text-center gap-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(0,196,235,0.15)",
                      border: "2px solid #00C4EB",
                    }}
                  >
                    <CheckCircle2 size={40} style={{ color: "#00C4EB" }} />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>
                      Profilin Hazır! 🚀
                    </h2>
                    <p className="text-sm" style={{ color: "#94A3B8" }}>
                      Gemini AI artık sana özel içerikler ve tavsiyeler oluşturmaya hazır.
                    </p>
                  </div>

                  {/* Özet */}
                  <div
                    className="w-full rounded-xl p-4 space-y-3 text-left"
                    style={{ background: "#0d0d12", border: "1px solid #1E1E24" }}
                  >
                    <SummaryRow
                      icon={<BookOpen size={14} />}
                      label="Dönem"
                      value={YEARS.find((y) => y.value === studyLevel)?.label ?? studyLevel}
                    />
                    <SummaryRow
                      icon={<Target size={14} />}
                      label="Hedefler"
                      value={selectedGoals
                        .map((k) => GOALS.find((g) => g.key === k)?.label)
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <SummaryRow
                      icon={<Clock size={14} />}
                      label="Haftalık çalışma"
                      value={WEEKLY_HOURS.find((h) => h.value === weeklyHours)?.label ?? ""}
                    />
                                        <SummaryRow
                      icon={<Sun size={14} />}
                      label="Çalışma zamanı"
                      value={STUDY_TIMES.find((t) => t.value === studyTime)?.label ?? ""}
                    />
                    <SummaryRow
                      icon={<MessageSquare size={14} />}
                      label="İletişim Tarzı"
                      value={COMMUNICATION_STYLES.find((c) => c.value === communicationStyle)?.label ?? ""}
                    />
                  </div>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <button
                    onClick={handleFinish}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm text-black transition-all hover:opacity-90 disabled:opacity-60"
                    style={{
                      background: "#00C4EB",
                      boxShadow: "0 0 24px rgba(0,196,235,0.45)",
                    }}
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Kaydediliyor…
                      </>
                    ) : (
                      <>
                        Dashboard&apos;a Git <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error (steps 2-3) */}
        {error && step !== 4 && (
          <p className="text-center text-sm text-red-400 mt-3">{error}</p>
        )}

        {/* Navigation (steps 2-3) */}
        {step > 1 && step < 4 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => go(step - 1)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-all"
              style={{
                color: "#94A3B8",
                border: "1px solid #1E1E24",
                background: "#141419",
              }}
            >
              <ArrowLeft size={14} /> Geri
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 text-sm px-6 py-2 rounded-xl font-semibold text-black transition-all hover:opacity-90"
              style={{ background: "#00C4EB" }}
            >
              İleri <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span style={{ color: "#00C4EB", marginTop: 2 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs" style={{ color: "#64748B" }}>
          {label}:{" "}
        </span>
        <span className="text-sm font-medium" style={{ color: "#CBD5E1" }}>
          {value}
        </span>
      </div>
    </div>
  );
}
