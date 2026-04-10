"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Gamepad2,
  Heart,
  Thermometer,
  Activity,
  Zap,
  Trophy,
  RotateCcw,
  ChevronRight,
  Star,
  Target,
  User,
  Stethoscope,
  FlaskConical,
  Brain,
  CheckCircle2,
  XCircle,
  Swords,
  ShieldCheck,
  TrendingUp,
  ChevronLeft, AlertTriangle
}  from "lucide-react";
import toast from "react-hot-toast";

type Specialty = { id: string; label: string; icon: string; color: string };
type Difficulty = "easy" | "medium" | "hard";
type CaseStep = {
  question: string;
  options: string[];
  correct: number;
  feedback: string;
};
type CaseData = {
  patientName: string;
  age: number;
  gender: "male" | "female";
  complaint: string;
  vitals: { temp: string; pulse: string; bp: string; spo2: string };
  narrative: string;
  steps: CaseStep[];
};

const specialties: Specialty[] = [
  {
    id: "internal",
    label: "Dahiliye",
    icon: "❤️",
    color: "var(--color-destructive)",
  },
  {
    id: "small-rotations",
    label: "Küçük Stajlar",
    icon: "🧠",
    color: "var(--color-primary)",
  },
  {
    id: "obgyn",
    label: "Kadın Doğum",
    icon: "🏥",
    color: "var(--color-success)",
  },
  {
    id: "emergency",
    label: "Acil Tıp",
    icon: "🚨",
    color: "var(--color-warning)",
  },
  { id: "pediatrics", label: "Pediatri", icon: "👶", color: "#A78BFA" },
  { id: "surgery", label: "Genel Cerrahi", icon: "🔬", color: "#FB923C" },
];

const difficultyConfig = {
  easy: { label: "Kolay", variant: "success" as const, xpBonus: 1 },
  medium: { label: "Orta", variant: "warning" as const, xpBonus: 2 },
  hard: { label: "Zor", variant: "destructive" as const, xpBonus: 3 },
};

export default function CaseRPGPage() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(
    null,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [xp, setXP] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [completedCases, setCompletedCases] = useState(0);
  const [caseFinished, setCaseFinished] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const specialtyLabel =
    specialties.find((s) => s.id === selectedSpecialty)?.label ?? "";

  async function startCase() {
    if (!selectedSpecialty) {
      toast.error("Lütfen bir uzmanlık alanı seçin");
      return;
    }
    setLoading(true);
    try {
      const diffLabel = difficultyConfig[difficulty].label;
      const message = `${specialtyLabel} alanında ${diffLabel} zorlukta interaktif bir tıbbi vaka oluştur.

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "patientName": "Türkçe isim",
  "age": 45,
  "gender": "male",
  "complaint": "Baş şikayeti 1 cümle",
  "vitals": { "temp": "37.2", "pulse": "88", "bp": "130/85", "spo2": "96" },
  "narrative": "Anamnez ve klinik tablo 3-4 cümle",
  "steps": [
    {
      "question": "Klinik karar sorusu",
      "options": ["A) Seçenek", "B) Seçenek", "C) Seçenek", "D) Seçenek"],
      "correct": 0,
      "feedback": "Doğru cevabın açıklaması 2 cümle"
    },
    {
      "question": "Soru 2",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 1,
      "feedback": "Açıklama"
    },
    {
      "question": "Soru 3",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 2,
      "feedback": "Açıklama"
    }
  ]
}`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, model: "FAST", module: "case-rpg" }),
      });

      if (!res.ok) {
        if (res.status === 429)
          throw new Error("Günlük AI limitinize ulaştınız");
        throw new Error("Vaka oluşturulamadı");
      }

      const data = await res.json();
      const text = data.response?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Vaka verisi işlenemedi");

      const parsed: CaseData = JSON.parse(jsonMatch[0]);
      setCaseData(parsed);
      setCurrentStep(0);
      setSelectedOption(null);
      setShowFeedback(false);
      setXP(0);
      setCaseFinished(false);
      setCorrectAnswers(0);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Vaka oluşturulurken hata oluştu",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectOption(idx: number) {
    if (showFeedback) return;
    setSelectedOption(idx);
    setShowFeedback(true);

    if (!caseData) return;
    const step = caseData.steps[currentStep];
    const isCorrect = idx === step.correct;
    const earned = isCorrect ? 50 * difficultyConfig[difficulty].xpBonus : 10;
    setXP((prev) => prev + earned);
    if (isCorrect) setCorrectAnswers((prev) => prev + 1);
  }

  function nextStep() {
    if (!caseData) return;
    if (currentStep < caseData.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      setCaseFinished(true);
      setTotalXP((prev) => prev + xp);
      setCompletedCases((prev) => prev + 1);
    }
  }

  function exitCase() {
    setCaseData(null);
    setCaseFinished(false);
    setSelectedOption(null);
    setShowFeedback(false);
    setCurrentStep(0);
  }

  /* ── RESULTS SCREEN ─────────────────────────────────────────────── */
  if (caseFinished && caseData) {
    const accuracy = Math.round((correctAnswers / caseData.steps.length) * 100);
    const isPerfect = accuracy === 100;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 py-12">
        {/* Trophy glow ring */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-36 h-36 rounded-full blur-2xl opacity-30"
            style={{ background: isPerfect ? "var(--color-primary)" : "var(--color-warning)" }}
          />
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center border-2"
            style={{
              background: "var(--color-surface-elevated)",
              borderColor: isPerfect ? "var(--color-primary)" : "var(--color-warning)",
            }}
          >
            <Trophy
              size={44}
              style={{ color: isPerfect ? "var(--color-primary)" : "var(--color-warning)" }}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {isPerfect ? "Mükemmel Performans!" : "Vaka Tamamlandı!"}
          </h2>
          <p style={{ color: "var(--color-text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
              {caseData.patientName}
            </span>{" "}
            vakasını tamamladın
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
          {[
            {
              label: "Kazanılan XP",
              value: `+${xp}`,
              icon: Zap,
              color: "var(--color-primary)",
              bg: "var(--color-primary)",
            },
            {
              label: "Doğruluk",
              value: `%${accuracy}`,
              icon: Target,
              color: accuracy >= 70 ? "var(--color-success)" : "var(--color-warning)",
              bg: accuracy >= 70 ? "var(--color-success)" : "var(--color-warning)",
            },
            {
              label: "Toplam XP",
              value: totalXP + xp,
              icon: Star,
              color: "var(--color-warning)",
              bg: "var(--color-warning)",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border"
              style={{
                background: "var(--color-surface-elevated)",
                borderColor: "var(--color-border)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${s.bg} 15%, transparent)` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-center" style={{ color: "var(--color-text-secondary)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Accuracy bar */}
        <div
          className="w-full max-w-lg rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--color-text-secondary)" }}>Performans</span>
            <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {correctAnswers} / {caseData.steps.length} doğru
            </span>
          </div>
          <div
            className="h-2.5 w-full rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${accuracy}%`,
                background: accuracy >= 70 ? "var(--color-success)" : "var(--color-warning)",
              }}
            />
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-lg">
          <Button
            variant="primary"
            onClick={startCase}
            loading={loading}
            className="flex-1 gap-2"
          >
            <RotateCcw size={15} />
            Yeni Vaka
          </Button>
          <Button variant="ghost" onClick={exitCase} className="flex-1 gap-2">
            <ChevronLeft size={15} />
            Lobiye Dön
          </Button>
        </div>
      </div>
    );
  }

  /* ── ACTIVE CASE SCREEN ─────────────────────────────────────────── */
  if (caseData) {
    const step = caseData.steps[currentStep];
    const progress =
      ((currentStep + (showFeedback ? 1 : 0)) / caseData.steps.length) * 100;

    return (
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">

        {/* Case header bar */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl border"
          style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{specialtyLabel}</Badge>
            <Badge variant={difficultyConfig[difficulty].variant}>
              {difficultyConfig[difficulty].label}
            </Badge>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex flex-col items-center gap-1 flex-1 max-w-xs">
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "var(--color-primary)" }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Adım {currentStep + 1} / {caseData.steps.length}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <Zap size={13} style={{ color: "var(--color-warning)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                {xp} XP
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={exitCase}>
              Çıkış
            </Button>
          </div>
        </div>

        {/* Mobile progress */}
        <div className="sm:hidden space-y-1">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "var(--color-primary)" }}
            />
          </div>
          <p className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
            Adım {currentStep + 1} / {caseData.steps.length}
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Patient sidebar */}
          <div
            className="lg:col-span-1 rounded-2xl border p-5 flex flex-col gap-5"
            style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
          >
            {/* Avatar + identity */}
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, transparent), color-mix(in srgb, var(--color-secondary) 15%, transparent))",
                  borderColor: "var(--color-border)",
                }}
              >
                <User size={32} style={{ color: "var(--color-text-secondary)" }} />
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                  {caseData.patientName}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {caseData.age} yaş &middot;{" "}
                  {caseData.gender === "male" ? "Erkek" : "Kadın"}
                </p>
              </div>
              <div
                className="w-full px-3 py-2 rounded-xl border text-sm italic leading-relaxed"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                "{caseData.complaint}"
              </div>
            </div>

            {/* Vitals grid */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Vital Bulgular
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    icon: Thermometer,
                    label: "Ateş",
                    value: `${caseData.vitals.temp}°C`,
                    color: "var(--color-destructive)",
                  },
                  {
                    icon: Heart,
                    label: "Nabız",
                    value: `${caseData.vitals.pulse} bpm`,
                    color: "#F472B6",
                  },
                  {
                    icon: Activity,
                    label: "TA",
                    value: caseData.vitals.bp,
                    color: "var(--color-primary)",
                  },
                  {
                    icon: Zap,
                    label: "SpO2",
                    value: `${caseData.vitals.spo2}%`,
                    color: "var(--color-success)",
                  },
                ].map((v) => (
                  <div
                    key={v.label}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border"
                    style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                  >
                    <v.icon size={15} style={{ color: v.color }} />
                    <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {v.value}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {v.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Narrative */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)" }}
                >
                  <Stethoscope size={14} style={{ color: "var(--color-primary)" }} />
                </div>
                <CardTitle className="text-sm font-semibold">Hasta Anamnezi</CardTitle>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {caseData.narrative}
              </p>
            </div>

            {/* Question card */}
            <div
              className="rounded-2xl border p-5 flex flex-col gap-4"
              style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "color-mix(in srgb, var(--color-secondary) 20%, transparent)" }}
                >
                  <Brain size={14} style={{ color: "#818CF8" }} />
                </div>
                <p
                  className="text-sm font-semibold leading-relaxed"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {step.question}
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2">
                {step.options.map((opt, idx) => {
                  const isCorrect = idx === step.correct;
                  const isSelected = idx === selectedOption;

                  let borderColor = "var(--color-border)";
                  let bgColor = "transparent";
                  let textColor = "var(--color-text-secondary)";
                  let hoverClass = "hover:border-[var(--color-primary)] hover:text-white";

                  if (showFeedback) {
                    hoverClass = "";
                    if (isCorrect) {
                      borderColor = "var(--color-success)";
                      bgColor = "color-mix(in srgb, var(--color-success) 10%, transparent)";
                      textColor = "var(--color-success)";
                    } else if (isSelected) {
                      borderColor = "var(--color-destructive)";
                      bgColor = "color-mix(in srgb, var(--color-destructive) 10%, transparent)";
                      textColor = "var(--color-destructive)";
                    } else {
                      textColor = "var(--color-text-disabled)";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => selectOption(idx)}
                      disabled={showFeedback}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 flex items-center gap-3 ${hoverClass}`}
                      style={{ borderColor, background: bgColor, color: textColor }}
                    >
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
                        style={{
                          borderColor: showFeedback
                            ? isCorrect
                              ? "var(--color-success)"
                              : isSelected
                                ? "var(--color-destructive)"
                                : "var(--color-border)"
                            : "currentColor",
                          color: "inherit",
                        }}
                      >
                        {["A", "B", "C", "D"][idx]}
                      </span>
                      <span>{opt.replace(/^[A-D]\)\s*/, "")}</span>
                      {showFeedback && isCorrect && (
                        <CheckCircle2 size={15} className="ml-auto flex-shrink-0" style={{ color: "var(--color-success)" }} />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle size={15} className="ml-auto flex-shrink-0" style={{ color: "var(--color-destructive)" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback box */}
              {showFeedback && (
                <div
                  className="rounded-xl border p-4 text-sm space-y-1.5"
                  style={
                    selectedOption === step.correct
                      ? {
                          background: "color-mix(in srgb, var(--color-success) 8%, transparent)",
                          borderColor: "color-mix(in srgb, var(--color-success) 35%, transparent)",
                        }
                      : {
                          background: "color-mix(in srgb, var(--color-destructive) 8%, transparent)",
                          borderColor: "color-mix(in srgb, var(--color-destructive) 35%, transparent)",
                        }
                  }
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {selectedOption === step.correct ? (
                      <>
                        <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} />
                        <span style={{ color: "var(--color-success)" }}>Doğru cevap!</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={15} style={{ color: "var(--color-destructive)" }} />
                        <span style={{ color: "var(--color-destructive)" }}>Yanlış cevap</span>
                      </>
                    )}
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--color-warning) 20%, transparent)", color: "var(--color-warning)" }}
                    >
                      +{selectedOption === step.correct
                        ? 50 * difficultyConfig[difficulty].xpBonus
                        : 10}{" "}
                      XP
                    </span>
                  </div>
                  <p style={{ color: "var(--color-text-secondary)" }}>{step.feedback}</p>
                </div>
              )}

              {showFeedback && (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  className="w-full gap-2"
                >
                  {currentStep < caseData.steps.length - 1 ? (
                    <>
                      Sonraki Adım <ChevronRight size={15} />
                    </>
                  ) : (
                    <>
                      <Trophy size={15} /> Vakayı Tamamla
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── START / LOBBY SCREEN ───────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-7 max-w-4xl mx-auto">

      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-2xl border p-7"
        style={{
          background: "linear-gradient(135deg, var(--color-surface-elevated), var(--color-surface))",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-10 -right-10 w-52 h-52 rounded-full blur-3xl pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--color-primary) 8%, transparent)" }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
              }}
            >
              <Gamepad2 size={26} style={{ color: "var(--color-primary)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Vaka RPG
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Simüle vakalarla klinik düşünme becerini geliştir
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2.5">
            {[
              { icon: Trophy, value: completedCases, label: "Vaka", color: "var(--color-primary)" },
              { icon: Star, value: totalXP, label: "XP", color: "var(--color-warning)" },
              {
                icon: TrendingUp,
                value: `%${completedCases > 0 ? Math.round((correctAnswers / (completedCases * 3)) * 100) : 0}`,
                label: "Doğruluk",
                color: "var(--color-success)",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center px-3 py-2 rounded-xl border gap-0.5"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <s.icon size={14} style={{ color: s.color }} />
                <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {s.value}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
        <span>Yasal Uyarı: Bu araç eğitim amaçlı bir simülasyondur ve profesyonel tıbbi tavsiye yerine geçmez.</span>
      </div>

      {/* Specialty selection */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Uzmanlık Alanı Seç
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {specialties.map((s) => {
            const isActive = selectedSpecialty === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSpecialty(s.id)}
                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-150"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                    : "var(--color-surface-elevated)",
                  borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                }}
              >
                <span
                  className="text-2xl transition-transform duration-150 group-hover:scale-110"
                  style={{ lineHeight: 1 }}
                >
                  {s.icon}
                </span>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{
                    color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  }}
                >
                  {s.label}
                </span>
                {isActive && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty selection */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Zorluk Seviyesi
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(difficultyConfig) as Difficulty[]).map((d) => {
            const isActive = difficulty === d;
            const colorMap = {
              easy: "var(--color-success)",
              medium: "var(--color-warning)",
              hard: "var(--color-destructive)",
            };
            const col = colorMap[d];

            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all duration-150"
                style={{
                  background: isActive
                    ? `color-mix(in srgb, ${col} 10%, transparent)`
                    : "var(--color-surface-elevated)",
                  borderColor: isActive ? col : "var(--color-border)",
                }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: isActive ? col : "var(--color-text-secondary)" }}
                >
                  {difficultyConfig[d].label}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, ${col} 20%, transparent)`
                      : "var(--color-border)",
                    color: isActive ? col : "var(--color-text-disabled)",
                  }}
                >
                  ×{difficultyConfig[d].xpBonus} XP çarpanı
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch strip */}
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border p-5"
        style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)" }}
          >
            <Swords size={18} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            {selectedSpecialty ? (
              <>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {specialtyLabel} &middot; {difficultyConfig[difficulty].label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  FAST Model &middot; Interaktif klinik simülasyon
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Başlamak için uzmanlık alanı ve zorluk seçin
              </p>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={startCase}
          className="w-full sm:w-auto gap-2 px-8"
        >
          {!loading && <Gamepad2 size={17} />}
          {loading ? "Vaka Oluşturuluyor..." : "Vakayı Başlat"}
        </Button>
      </div>

      {/* Achievements */}
      {completedCases > 0 && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--color-warning) 15%, transparent)" }}
            >
              <ShieldCheck size={15} style={{ color: "var(--color-warning)" }} />
            </div>
            <CardTitle className="text-sm font-semibold">Başarım Rozetleri</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            {completedCases >= 1 && (
              <Badge variant="success" className="gap-1.5 py-1 px-3">
                <Trophy size={11} /> İlk Vaka
              </Badge>
            )}
            {completedCases >= 5 && (
              <Badge variant="warning" className="gap-1.5 py-1 px-3">
                <Star size={11} /> 5 Vaka
              </Badge>
            )}
            {totalXP >= 500 && (
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                <Zap size={11} /> 500 XP
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
