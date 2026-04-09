"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen,
  Plus,
  Play,
  X,
  ChevronRight,
  CheckCircle,
  XCircle,
  Filter,
  BarChart2,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "medasi_soru_bankasi_v1";
const WRONG_KEY = "medasi_hatali_sorular_v1";

type Difficulty = "Kolay" | "Orta" | "Zor";
type Subject =
  | "Anatomi"
  | "Fizyoloji"
  | "Farmakoloji"
  | "Patoloji"
  | "Dahiliye"
  | "Cerrahi"
  | "Pediatri"
  | "Kardiyoloji"
  | "Nöroloji"
  | "Psikiyatri"
  | "Diğer";

interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  subject: Subject;
  difficulty: Difficulty;
  explanation: string;
  createdAt: string;
}

interface WrongAnswer {
  id: string;
  questionSnapshot: Question;
  userAnswer: number;
  addedAt: string;
  learned: boolean;
}

const SUBJECTS: Subject[] = [
  "Anatomi",
  "Fizyoloji",
  "Farmakoloji",
  "Patoloji",
  "Dahiliye",
  "Cerrahi",
  "Pediatri",
  "Kardiyoloji",
  "Nöroloji",
  "Psikiyatri",
  "Diğer",
];

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "sample_1",
    text: "Kalbin pacemaker'ı olarak görev yapan yapı hangisidir?",
    options: ["AV nod", "SA nod", "His demeti", "Purkinje lifleri"],
    correct: 1,
    subject: "Kardiyoloji",
    difficulty: "Kolay",
    explanation:
      "Sinoatriyal (SA) nod, kalbin doğal pace-maker'ıdır. Dakikada 60-100 impuls üreterek normal sinüs ritmini sağlar.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_2",
    text: "Akut miyokard enfarktüsünde ilk yükselen kardiyak biyobelirteç hangisidir?",
    options: ["CK-MB", "Troponin I", "Miyoglobin", "LDH"],
    correct: 2,
    subject: "Dahiliye",
    difficulty: "Orta",
    explanation:
      "Miyoglobin, MI sonrası 1-3 saatte yükselir ve ilk yükselen belirteçtir. Ancak özgüllüğü düşük olduğu için troponin ile birlikte değerlendirilmelidir.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_3",
    text: "Beta-laktamazlara dirençli penisilin hangisidir?",
    options: ["Ampisilin", "Amoksisilin", "Metisilin", "Piperasilin"],
    correct: 2,
    subject: "Farmakoloji",
    difficulty: "Kolay",
    explanation:
      "Metisilin, beta-laktamaz enzimlerine karşı dirençlidir. Günümüzde klinikte kullanılmasa da MRSA adı bu antibiyotikten gelmektedir.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_4",
    text: "Karaciğer sinüzoidlerini döşeyen hücre tipi hangisidir?",
    options: [
      "Hepatosit",
      "Kupffer hücresi",
      "Ito hücresi",
      "Sinüzoidal endotel hücresi",
    ],
    correct: 3,
    subject: "Anatomi",
    difficulty: "Orta",
    explanation:
      "Karaciğer sinüzoidleri, özel fenestrasyonlu sinüzoidal endotel hücreleriyle döşelidir. Kupffer hücreleri ise sinüzoidlerin içinde bulunan makrofajlardır.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample_5",
    text: "Çocuklarda en sık görülen akut lösemi tipi hangisidir?",
    options: [
      "AML (Akut Miyeloid Lösemi)",
      "CML (Kronik Miyeloid Lösemi)",
      "ALL (Akut Lenfoblastik Lösemi)",
      "CLL (Kronik Lenfositik Lösemi)",
    ],
    correct: 2,
    subject: "Pediatri",
    difficulty: "Kolay",
    explanation:
      "ALL, çocuklarda en sık görülen lösemi tipidir ve tüm çocukluk çağı lösemilerinin yaklaşık %75-80'ini oluşturur. 2-5 yaş en sık görüldüğü dönemdir.",
    createdAt: new Date().toISOString(),
  },
];

const OPTION_LABELS = ["A", "B", "C", "D"];

function difficultyBadgeVariant(
  d: Difficulty,
): "success" | "warning" | "destructive" {
  if (d === "Kolay") return "success";
  if (d === "Orta") return "warning";
  return "destructive";
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<"list" | "practice" | "add">("list");
  const [filterSubject, setFilterSubject] = useState<Subject | "Tümü">("Tümü");
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | "Tümü">(
    "Tümü",
  );

  // Practice state
  const [practiceQueue, setPracticeQueue] = useState<Question[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    wrong: 0,
    skipped: 0,
  });
  const [sessionAttempts, setSessionAttempts] = useState<any[]>([]);

  // Add question form
  const [form, setForm] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "0",
    subject: "Anatomi" as Subject,
    difficulty: "Orta" as Difficulty,
    explanation: "",
  });

  const [showExplanationInList, setShowExplanationInList] = useState<
    string | null
  >(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setQuestions(JSON.parse(raw));
    } else {
      setQuestions(SAMPLE_QUESTIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_QUESTIONS));
    }
  }, []);

  const saveQuestions = useCallback((qs: Question[]) => {
    setQuestions(qs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(qs));
  }, []);

  const filteredQuestions = questions.filter((q) => {
    if (filterSubject !== "Tümü" && q.subject !== filterSubject) return false;
    if (filterDifficulty !== "Tümü" && q.difficulty !== filterDifficulty)
      return false;
    return true;
  });

  function startPractice() {
    if (filteredQuestions.length === 0) {
      toast.error("Seçili kriterlere uygun soru bulunamadı.");
      return;
    }
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setPracticeQueue(shuffled);
    setPracticeIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setSessionStats({ correct: 0, wrong: 0, skipped: 0 });
    setSessionAttempts([]);
    setMode("practice");
  }

  function handleSelectOption(idx: number) {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    const q = practiceQueue[practiceIndex];
    setSessionAttempts(prev => [...prev, { subject: q.subject, difficulty: q.difficulty, questionText: q.text, isCorrect: idx === q.correct }]);
    if (idx === q.correct) {
      setSessionStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setSessionStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      // Save to wrong answers
      const wrongRaw = localStorage.getItem(WRONG_KEY);
      let wrongs: WrongAnswer[] = [];
      try {
        wrongs = wrongRaw ? JSON.parse(wrongRaw) : [];
      } catch {
        wrongs = [];
      }
      const already = wrongs.find(
        (w) => w.questionSnapshot.id === q.id && !w.learned,
      );
      if (!already) {
        wrongs.push({
          id: `wrong_${Date.now()}`,
          questionSnapshot: q,
          userAnswer: idx,
          addedAt: new Date().toISOString(),
          learned: false,
        });
        localStorage.setItem(WRONG_KEY, JSON.stringify(wrongs));
      }
    }
  }

  function nextQuestion() {
    if (practiceIndex >= practiceQueue.length - 1) {
      setMode("list");
      toast.success(
        `Pratik tamamlandı! Doğru: ${sessionStats.correct + (selectedOption === practiceQueue[practiceIndex].correct ? 1 : 0)}, Yanlış: ${sessionStats.wrong}`,
      );
      fetch('/api/questions/submit-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results: sessionAttempts }) }).catch(console.error);
      setSessionAttempts([]);
      return;
    }
    setPracticeIndex((i) => i + 1);
    setSelectedOption(null);
    setShowExplanation(false);
  }

  function skipQuestion() {
    setSessionStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    nextQuestion();
  }

  function addQuestion() {
    if (
      !form.text.trim() ||
      !form.optionA ||
      !form.optionB ||
      !form.optionC ||
      !form.optionD
    ) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    const newQ: Question = {
      id: `q_${Date.now()}`,
      text: form.text.trim(),
      options: [form.optionA, form.optionB, form.optionC, form.optionD],
      correct: parseInt(form.correct) as 0 | 1 | 2 | 3,
      subject: form.subject,
      difficulty: form.difficulty,
      explanation: form.explanation.trim(),
      createdAt: new Date().toISOString(),
    };
    saveQuestions([...questions, newQ]);
    setForm({
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "0",
      subject: "Anatomi",
      difficulty: "Orta",
      explanation: "",
    });
    setMode("list");
    toast.success("Soru eklendi!");
  }

  function deleteQuestion(id: string) {
    saveQuestions(questions.filter((q) => q.id !== id));
    toast.success("Soru silindi.");
  }

  const currentQ = practiceQueue[practiceIndex];

  // ─── PRACTICE MODE ────────────────────────────────────────────────────────
  if (mode === "practice" && currentQ) {
    const progressPct = ((practiceIndex + 1) / practiceQueue.length) * 100;
    const isCorrectAnswer = selectedOption !== null && selectedOption === currentQ.correct;
    const isWrongAnswer = selectedOption !== null && selectedOption !== currentQ.correct;

    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shadow-sm">
              <Play size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
                Pratik Modu
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soru {practiceIndex + 1} / {practiceQueue.length}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMode("list")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-all"
          >
            <X size={14} /> Çıkış
          </button>
        </div>

        {/* Progress bar + label */}
        <div className="flex flex-col gap-1.5">
          <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]/40">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
            <span>{Math.round(progressPct)}% tamamlandı</span>
            <span>{practiceQueue.length - practiceIndex - 1} soru kaldı</span>
          </div>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 px-2">
            <CheckCircle size={18} className="text-[var(--color-success)]" />
            <p className="text-2xl font-bold text-[var(--color-success)] leading-none">
              {sessionStats.correct}
            </p>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Doğru</p>
          </div>
          <div className="flex flex-col items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 px-2">
            <XCircle size={18} className="text-[var(--color-destructive)]" />
            <p className="text-2xl font-bold text-[var(--color-destructive)] leading-none">
              {sessionStats.wrong}
            </p>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Yanlış</p>
          </div>
          <div className="flex flex-col items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 px-2">
            <ChevronRight size={18} className="text-[var(--color-text-secondary)]" />
            <p className="text-2xl font-bold text-[var(--color-text-secondary)] leading-none">
              {sessionStats.skipped}
            </p>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">Atlandı</p>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          {/* Card header strip */}
          <div className="px-6 pt-5 pb-4 border-b border-[var(--color-border)]/60">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="secondary">{currentQ.subject}</Badge>
              <Badge variant={difficultyBadgeVariant(currentQ.difficulty)}>
                {currentQ.difficulty}
              </Badge>
            </div>
            <p className="text-[var(--color-text-primary)] text-lg font-semibold leading-relaxed">
              {currentQ.text}
            </p>
          </div>

          {/* Options */}
          <div className="px-6 py-5 space-y-3">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correct;
              const answered = selectedOption !== null;

              let baseClass =
                "w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-base font-medium transition-all duration-200 ";

              if (!answered) {
                baseClass +=
                  "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:shadow-sm cursor-pointer";
              } else if (isCorrect) {
                baseClass +=
                  "border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)] shadow-sm";
              } else if (isSelected) {
                baseClass +=
                  "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] shadow-sm";
              } else {
                baseClass +=
                  "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] opacity-40 cursor-default";
              }

              return (
                <button
                  key={idx}
                  className={baseClass}
                  onClick={() => handleSelectOption(idx)}
                >
                  {/* Option label bubble */}
                  <span
                    className={[
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
                      !answered
                        ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : isCorrect
                        ? "bg-[var(--color-success)] text-white"
                        : isSelected
                        ? "bg-[var(--color-destructive)] text-white"
                        : "bg-[var(--color-border)] text-[var(--color-text-secondary)]",
                    ].join(" ")}
                  >
                    {OPTION_LABELS[idx]}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                  {answered && isCorrect && (
                    <CheckCircle size={18} className="flex-shrink-0 text-[var(--color-success)]" />
                  )}
                  {answered && isSelected && !isCorrect && (
                    <XCircle size={18} className="flex-shrink-0 text-[var(--color-destructive)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && currentQ.explanation && (
            <div className="mx-6 mb-6 p-4 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
              <p className="text-xs font-bold text-[var(--color-primary)] mb-1.5 uppercase tracking-widest">
                Aciklama
              </p>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Result banner */}
          {selectedOption !== null && (
            <div
              className={[
                "mx-6 mb-6 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2",
                isCorrectAnswer
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30"
                  : "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30",
              ].join(" ")}
            >
              {isCorrectAnswer ? (
                <>
                  <CheckCircle size={16} className="flex-shrink-0" />
                  Dogru cevap! Harika!
                </>
              ) : (
                <>
                  <XCircle size={16} className="flex-shrink-0" />
                  Yanlis. Dogru cevap: <strong>{OPTION_LABELS[currentQ.correct]}</strong>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {selectedOption === null && (
            <button
              onClick={skipQuestion}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
            >
              Atla
            </button>
          )}
          {selectedOption !== null && (
            <button
              onClick={nextQuestion}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
            >
              {practiceIndex >= practiceQueue.length - 1 ? "Pratigi Bitir" : "Sonraki Soru"}
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── ADD QUESTION MODE ────────────────────────────────────────────────────
  if (mode === "add") {
    const inputClass =
      "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all";

    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shadow-sm">
              <Plus size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
                Soru Ekle
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soru bankasına yeni soru ekle
              </p>
            </div>
          </div>
          <button
            onClick={() => setMode("list")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-all"
          >
            <X size={14} /> İptal
          </button>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Soru Metni
              </label>
              <textarea
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
                rows={3}
                placeholder="Soruyu buraya yazın..."
                className={inputClass + " resize-none"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["A", "B", "C", "D"] as const).map((letter, idx) => {
                const key = `option${letter}` as keyof typeof form;
                const isCorrectOption = form.correct === String(idx);
                return (
                  <div key={letter}>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                      <span
                        className={[
                          "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                          isCorrectOption
                            ? "bg-[var(--color-success)] text-white"
                            : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
                        ].join(" ")}
                      >
                        {letter}
                      </span>
                      Seçenek {letter}
                      {isCorrectOption && (
                        <span className="text-xs text-[var(--color-success)] font-normal">(Doğru)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={String(form[key])}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      placeholder={`${letter} şıkkı`}
                      className={inputClass}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  Doğru Cevap
                </label>
                <select
                  value={form.correct}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, correct: e.target.value }))
                  }
                  className={inputClass}
                >
                  {["A", "B", "C", "D"].map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  Konu
                </label>
                <select
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subject: e.target.value as Subject,
                    }))
                  }
                  className={inputClass}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  Zorluk
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      difficulty: e.target.value as Difficulty,
                    }))
                  }
                  className={inputClass}
                >
                  {(["Kolay", "Orta", "Zor"] as Difficulty[]).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Açıklama <span className="font-normal text-[var(--color-text-secondary)]">(Opsiyonel)</span>
              </label>
              <textarea
                value={form.explanation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, explanation: e.target.value }))
                }
                rows={2}
                placeholder="Doğru cevabın açıklaması..."
                className={inputClass + " resize-none"}
              />
            </div>

            <button
              onClick={addQuestion}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-sm"
            >
              <Plus size={16} /> Soruyu Ekle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST MODE ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center shadow-sm">
            <BookOpen size={22} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] leading-tight">
              Soru Bankası
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              {questions.length} soru mevcut
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("add")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all"
          >
            <Plus size={15} /> Soru Ekle
          </button>
          <button
            onClick={startPractice}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
          >
            <Play size={15} /> Pratik Başlat
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Toplam Soru",
            value: questions.length,
            icon: <BookOpen size={18} />,
            color: "text-[var(--color-primary)]",
            bg: "bg-[var(--color-primary)]/10",
          },
          {
            label: "Kolay",
            value: questions.filter((q) => q.difficulty === "Kolay").length,
            icon: <BarChart2 size={18} />,
            color: "text-[var(--color-success)]",
            bg: "bg-[var(--color-success)]/10",
          },
          {
            label: "Orta",
            value: questions.filter((q) => q.difficulty === "Orta").length,
            icon: <BarChart2 size={18} />,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            label: "Zor",
            value: questions.filter((q) => q.difficulty === "Zor").length,
            icon: <BarChart2 size={18} />,
            color: "text-[var(--color-destructive)]",
            bg: "bg-[var(--color-destructive)]/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl py-5 px-3 text-center hover:border-[var(--color-primary)]/30 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] leading-none">
              {stat.value}
            </p>
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-5 py-3.5">
        <Filter size={15} className="text-[var(--color-text-secondary)] shrink-0" />
        <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
          Filtrele:
        </span>
        <select
          value={filterSubject}
          onChange={(e) =>
            setFilterSubject(e.target.value as Subject | "Tümü")
          }
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="Tümü">Tüm Konular</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) =>
            setFilterDifficulty(e.target.value as Difficulty | "Tümü")
          }
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="Tümü">Tüm Zorluklar</option>
          {(["Kolay", "Orta", "Zor"] as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-xs font-medium text-[var(--color-text-secondary)] ml-auto">
          {filteredQuestions.length} soru gösteriliyor
        </span>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/8 flex items-center justify-center">
              <BookOpen size={26} className="text-[var(--color-text-secondary)] opacity-50" />
            </div>
            <p className="text-[var(--color-text-secondary)] font-medium">
              Kriterlere uygun soru bulunamadı.
            </p>
          </div>
        )}
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <Badge variant="secondary">{q.subject}</Badge>
                  <Badge variant={difficultyBadgeVariant(q.difficulty)}>
                    {q.difficulty}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-relaxed mb-4">
                  {q.text}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={[
                        "flex items-center gap-2 text-sm px-3 py-2 rounded-xl border",
                        idx === q.correct
                          ? "border-[var(--color-success)]/40 bg-[var(--color-success)]/8 text-[var(--color-success)] font-medium"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                          idx === q.correct
                            ? "bg-[var(--color-success)] text-white"
                            : "bg-[var(--color-border)] text-[var(--color-text-secondary)]",
                        ].join(" ")}
                      >
                        {OPTION_LABELS[idx]}
                      </span>
                      {opt}
                    </div>
                  ))}
                </div>
                {showExplanationInList === q.id && q.explanation && (
                  <div className="mt-4 p-3.5 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                    <p className="text-xs font-bold text-[var(--color-primary)] mb-1.5 uppercase tracking-widest">
                      Aciklama
                    </p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {q.explanation && (
                  <button
                    onClick={() =>
                      setShowExplanationInList(
                        showExplanationInList === q.id ? null : q.id,
                      )
                    }
                    className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all"
                    title="Açıklamayı göster"
                  >
                    {showExplanationInList === q.id ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-all"
                  title="Sil"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
