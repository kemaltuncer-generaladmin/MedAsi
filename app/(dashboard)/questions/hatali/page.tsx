"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  XCircle,
  CheckCircle,
  Play,
  Plus,
  X,
  ChevronRight,
  BookOpen,
  Calendar,
  Filter,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

const WRONG_KEY = "medasi_hatali_sorular_v1";

type Difficulty = "Kolay" | "Orta" | "Zor";
type Subject = string;

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

const OPTION_LABELS = ["A", "B", "C", "D"];

function difficultyBadgeVariant(
  d: string,
): "success" | "warning" | "destructive" {
  if (d === "Kolay") return "success";
  if (d === "Orta") return "warning";
  return "destructive";
}

function groupBySubject(items: WrongAnswer[]): Record<string, WrongAnswer[]> {
  return items.reduce(
    (acc, item) => {
      const s = item.questionSnapshot.subject;
      if (!acc[s]) acc[s] = [];
      acc[s].push(item);
      return acc;
    },
    {} as Record<string, WrongAnswer[]>,
  );
}

export default function HataliSorularPage() {
  const [wrongs, setWrongs] = useState<WrongAnswer[]>([]);
  const [mode, setMode] = useState<"list" | "practice" | "add">("list");
  const [filterSubject, setFilterSubject] = useState<string>("Tümü");
  const [showLearned, setShowLearned] = useState(false);

  // Practice state
  const [practiceQueue, setPracticeQueue] = useState<WrongAnswer[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [practiceStats, setPracticeStats] = useState({ correct: 0, wrong: 0 });

  // Manual add form
  const [manualForm, setManualForm] = useState({
    text: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "0",
    userAnswer: "1",
    subject: "Diğer",
    difficulty: "Orta" as Difficulty,
    explanation: "",
  });

  useEffect(() => {
    let active = true;

    fetch("/api/study/wrong-questions", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (!active) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length > 0) {
          setWrongs(items);
          return;
        }

        const raw = localStorage.getItem(WRONG_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setWrongs(parsed);
        await fetch("/api/study/wrong-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: parsed }),
        }).catch(() => {});
      })
      .catch(() => {
        if (!active) return;
        const raw = localStorage.getItem(WRONG_KEY);
        if (raw) setWrongs(JSON.parse(raw));
      });

    return () => {
      active = false;
    };
  }, []);

  const saveWrongs = useCallback((ws: WrongAnswer[]) => {
    setWrongs(ws);
    localStorage.setItem(WRONG_KEY, JSON.stringify(ws));
    void fetch("/api/study/wrong-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: ws }),
    }).catch(() => {});
  }, []);

  const activeWrongs = wrongs.filter((w) => !w.learned);
  const learnedWrongs = wrongs.filter((w) => w.learned);

  const allSubjects = Array.from(
    new Set(activeWrongs.map((w) => w.questionSnapshot.subject)),
  );

  const displayWrongs = (showLearned ? learnedWrongs : activeWrongs).filter(
    (w) =>
      filterSubject === "Tümü" || w.questionSnapshot.subject === filterSubject,
  );

  const grouped = groupBySubject(displayWrongs);

  // This week count
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const learnedThisWeek = learnedWrongs.filter(
    (w) => new Date(w.addedAt) >= oneWeekAgo,
  ).length;

  function markLearned(id: string) {
    saveWrongs(wrongs.map((w) => (w.id === id ? { ...w, learned: true } : w)));
    void fetch("/api/study/wrong-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, learned: true }),
    }).catch(() => {});
    toast.success("Öğrenildi olarak işaretlendi!");
  }

  function unmarkLearned(id: string) {
    saveWrongs(wrongs.map((w) => (w.id === id ? { ...w, learned: false } : w)));
    void fetch("/api/study/wrong-questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, learned: false }),
    }).catch(() => {});
  }

  function deleteWrong(id: string) {
    saveWrongs(wrongs.filter((w) => w.id !== id));
    void fetch(`/api/study/wrong-questions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
    toast.success("Soru silindi.");
  }

  function startPractice() {
    const queue = activeWrongs.filter(
      (w) =>
        filterSubject === "Tümü" ||
        w.questionSnapshot.subject === filterSubject,
    );
    if (queue.length === 0) {
      toast.error("Tekrar çalışılacak soru bulunamadı.");
      return;
    }
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    setPracticeQueue(shuffled);
    setPracticeIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setPracticeStats({ correct: 0, wrong: 0 });
    setMode("practice");
  }

  function handleSelectOption(idx: number) {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    const q = practiceQueue[practiceIndex].questionSnapshot;
    if (idx === q.correct) {
      setPracticeStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setPracticeStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
  }

  function nextQuestion() {
    if (practiceIndex >= practiceQueue.length - 1) {
      setMode("list");
      toast.success(
        `Tekrar tamamlandı! Doğru: ${practiceStats.correct}, Yanlış: ${practiceStats.wrong}`,
      );
      return;
    }
    setPracticeIndex((i) => i + 1);
    setSelectedOption(null);
    setShowExplanation(false);
  }

  function addManual() {
    if (
      !manualForm.text.trim() ||
      !manualForm.optionA ||
      !manualForm.optionB ||
      !manualForm.optionC ||
      !manualForm.optionD
    ) {
      toast.error("Lütfen soru ve tüm şıkları doldurun.");
      return;
    }
    const q: Question = {
      id: `manual_${Date.now()}`,
      text: manualForm.text.trim(),
      options: [
        manualForm.optionA,
        manualForm.optionB,
        manualForm.optionC,
        manualForm.optionD,
      ],
      correct: parseInt(manualForm.correct) as 0 | 1 | 2 | 3,
      subject: manualForm.subject,
      difficulty: manualForm.difficulty,
      explanation: manualForm.explanation.trim(),
      createdAt: new Date().toISOString(),
    };
    const newWrong: WrongAnswer = {
      id: `wrong_manual_${Date.now()}`,
      questionSnapshot: q,
      userAnswer: parseInt(manualForm.userAnswer),
      addedAt: new Date().toISOString(),
      learned: false,
    };
    saveWrongs([...wrongs, newWrong]);
    setManualForm({
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "0",
      userAnswer: "1",
      subject: "Diğer",
      difficulty: "Orta",
      explanation: "",
    });
    setMode("list");
    toast.success("Soru hatalılar listesine eklendi!");
  }

  // PRACTICE MODE
  if (mode === "practice" && practiceQueue[practiceIndex]) {
    const current = practiceQueue[practiceIndex];
    const q = current.questionSnapshot;

    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-destructive)]/10 flex items-center justify-center">
              <Play size={20} className="text-[var(--color-destructive)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Tekrar Çalış
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soru {practiceIndex + 1} / {practiceQueue.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
            <X size={15} /> Çıkış
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-[var(--color-success)]">
              {practiceStats.correct}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">Doğru</p>
          </div>
          <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-[var(--color-destructive)]">
              {practiceStats.wrong}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">Yanlış</p>
          </div>
        </div>

        <div className="w-full h-1.5 bg-[var(--color-surface-elevated)] rounded-full">
          <div
            className="h-full bg-[var(--color-destructive)] rounded-full transition-all"
            style={{
              width: `${((practiceIndex + 1) / practiceQueue.length) * 100}%`,
            }}
          />
        </div>

        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="secondary">{q.subject}</Badge>
            <Badge variant={difficultyBadgeVariant(q.difficulty)}>
              {q.difficulty}
            </Badge>
            <Badge variant="destructive" className="ml-auto">
              Hatalı Soru
            </Badge>
          </div>
          <p className="text-[var(--color-text-primary)] text-lg font-medium leading-relaxed mb-6">
            {q.text}
          </p>

          <div className="space-y-3">
            {q.options.map((opt, idx) => {
              let cls =
                "w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ";
              if (selectedOption === null) {
                cls +=
                  idx === current.userAnswer
                    ? "border-[var(--color-destructive)]/50 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)] cursor-pointer"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] cursor-pointer";
              } else if (idx === q.correct) {
                cls +=
                  "border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]";
              } else if (idx === selectedOption && idx !== q.correct) {
                cls +=
                  "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]";
              } else {
                cls +=
                  "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] opacity-50";
              }
              return (
                <button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelectOption(idx)}
                >
                  <span className="font-bold mr-2">{OPTION_LABELS[idx]}.</span>{" "}
                  {opt}
                  {selectedOption !== null && idx === q.correct && (
                    <CheckCircle size={16} className="inline ml-2" />
                  )}
                  {selectedOption === idx && idx !== q.correct && (
                    <XCircle size={16} className="inline ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {showExplanation && q.explanation && (
            <div className="mt-5 p-4 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
              <p className="text-xs font-semibold text-[var(--color-primary)] mb-1 uppercase tracking-wide">
                Açıklama
              </p>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                {q.explanation}
              </p>
            </div>
          )}
        </Card>

        {selectedOption !== null && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                markLearned(current.id);
                nextQuestion();
              }}
              className="flex-1"
            >
              <CheckCircle size={14} /> Öğrendim
            </Button>
            <Button variant="primary" onClick={nextQuestion} className="flex-1">
              {practiceIndex >= practiceQueue.length - 1 ? "Bitir" : "Sonraki"}
              <ChevronRight size={15} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ADD MANUAL MODE
  if (mode === "add") {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-destructive)]/10 flex items-center justify-center">
              <Plus size={20} className="text-[var(--color-destructive)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                Manuel Ekle
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Hatalı soru manuel olarak ekle
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode("list")}>
            <X size={15} /> İptal
          </Button>
        </div>

        <Card variant="elevated" className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Soru Metni
            </label>
            <textarea
              value={manualForm.text}
              onChange={(e) =>
                setManualForm((f) => ({ ...f, text: e.target.value }))
              }
              rows={3}
              placeholder="Soruyu yapıştırın..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
            />
          </div>

          {(["A", "B", "C", "D"] as const).map((letter, idx) => {
            const key = `option${letter}` as keyof typeof manualForm;
            return (
              <div key={letter}>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Seçenek {letter}
                </label>
                <input
                  type="text"
                  value={String(manualForm[key])}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  placeholder={`${letter} şıkkı`}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            );
          })}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Doğru Cevap", key: "correct" },
              { label: "Benim Cevabım", key: "userAnswer" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  {label}
                </label>
                <select
                  value={String(manualForm[key as keyof typeof manualForm])}
                  onChange={(e) =>
                    setManualForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  {["A", "B", "C", "D"].map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Konu
              </label>
              <input
                type="text"
                value={manualForm.subject}
                onChange={(e) =>
                  setManualForm((f) => ({ ...f, subject: e.target.value }))
                }
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Zorluk
              </label>
              <select
                value={manualForm.difficulty}
                onChange={(e) =>
                  setManualForm((f) => ({
                    ...f,
                    difficulty: e.target.value as Difficulty,
                  }))
                }
                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                {["Kolay", "Orta", "Zor"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
              Açıklama (Opsiyonel)
            </label>
            <textarea
              value={manualForm.explanation}
              onChange={(e) =>
                setManualForm((f) => ({ ...f, explanation: e.target.value }))
              }
              rows={2}
              placeholder="Doğru cevabın açıklaması..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] resize-none transition-colors"
            />
          </div>

          <Button variant="primary" onClick={addManual} className="w-full">
            <Plus size={15} /> Hatalılar Listesine Ekle
          </Button>
        </Card>
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-destructive)]/10 flex items-center justify-center">
            <XCircle size={20} className="text-[var(--color-destructive)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Hatalı Sorular
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              {activeWrongs.length} tekrar edilecek soru
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMode("add")}>
            <Plus size={14} /> Manuel Ekle
          </Button>
          <Button variant="primary" size="sm" onClick={startPractice}>
            <Play size={14} /> Tekrar Çalış
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="bordered" className="p-4 text-center">
          <XCircle
            size={16}
            className="text-[var(--color-destructive)] mx-auto mb-1"
          />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {activeWrongs.length}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Toplam Hatalı
          </p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <CheckCircle
            size={16}
            className="text-[var(--color-success)] mx-auto mb-1"
          />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {learnedWrongs.length}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Öğrenildi
          </p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <Calendar
            size={16}
            className="text-[var(--color-primary)] mx-auto mb-1"
          />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {learnedThisWeek}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Bu Hafta Öğrenildi
          </p>
        </Card>
        <Card variant="bordered" className="p-4 text-center">
          <BookOpen
            size={16}
            className="text-[var(--color-warning)] mx-auto mb-1"
          />
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {allSubjects.length}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Konu Sayısı
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter
            size={15}
            className="text-[var(--color-text-secondary)] shrink-0"
          />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="Tümü">Tüm Konular</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowLearned(!showLearned)}
            className={[
              "px-3 py-1.5 rounded-md text-sm font-medium transition-all border",
              showLearned
                ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/40 text-[var(--color-success)]"
                : "bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)]",
            ].join(" ")}
          >
            {showLearned ? "Öğrenilenleri Göster" : "Aktif Soruları Göster"}
          </button>
        </div>
      </Card>

      {/* Grouped list */}
      {displayWrongs.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <CheckCircle
            size={32}
            className="text-[var(--color-success)] mx-auto mb-3 opacity-60"
          />
          <p className="text-[var(--color-text-primary)] font-medium">
            {showLearned
              ? "Henüz öğrenilmiş soru yok."
              : "Harika! Hatalı sorunuz bulunmuyor."}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {!showLearned &&
              "Soru bankasında pratik yaparak hatalı soruları takip edin."}
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([subject, items]) => (
          <div key={subject}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                {subject}
              </h2>
              <span className="text-xs bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-[var(--color-text-secondary)]">
                {items.length}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((wrong) => {
                const q = wrong.questionSnapshot;
                return (
                  <Card key={wrong.id} variant="bordered" className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant={difficultyBadgeVariant(q.difficulty)}>
                            {q.difficulty}
                          </Badge>
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {new Date(wrong.addedAt).toLocaleDateString(
                              "tr-TR",
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)] leading-relaxed mb-3">
                          {q.text}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {q.options.map((opt, idx) => {
                            let cls = "text-xs px-3 py-1.5 rounded border ";
                            if (idx === q.correct) {
                              cls +=
                                "border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)]";
                            } else if (
                              idx === wrong.userAnswer &&
                              idx !== q.correct
                            ) {
                              cls +=
                                "border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)]";
                            } else {
                              cls +=
                                "border-[var(--color-border)] text-[var(--color-text-secondary)]";
                            }
                            return (
                              <div key={idx} className={cls}>
                                <span className="font-bold">
                                  {OPTION_LABELS[idx]}.
                                </span>{" "}
                                {opt}
                                {idx === q.correct && (
                                  <span className="ml-1 text-[0.65rem]">
                                    (Doğru)
                                  </span>
                                )}
                                {idx === wrong.userAnswer &&
                                  idx !== q.correct && (
                                    <span className="ml-1 text-[0.65rem]">
                                      (Seçtiğin)
                                    </span>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div className="mt-2 p-2 rounded bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {!wrong.learned ? (
                          <button
                            onClick={() => markLearned(wrong.id)}
                            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors"
                            title="Öğrendim"
                          >
                            <CheckCircle size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => unmarkLearned(wrong.id)}
                            className="p-1.5 rounded text-[var(--color-success)] hover:text-[var(--color-warning)] transition-colors"
                            title="Geri al"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteWrong(wrong.id)}
                          className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
