"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Zap, Loader2, CheckCircle, XCircle, AlertTriangle, PlayCircle, RotateCcw, Brain
} from "lucide-react";
import toast from "react-hot-toast";

interface Question {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

type Phase = "idle" | "loading" | "exam" | "result";

export default function ZilliSinavPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState("");

  async function startExam() {
    setPhase("loading");
    setAnswers([]);
    setCurrentIdx(0);
    setSelected(null);
    setEvaluation("");
    const loadingId = toast.loading("AI 5 soru üretiyor...");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `5 adet medikal çoktan seçmeli soru üret. JSON formatında dön. Format:
[
  {
    "text": "Soru metni",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Açıklama"
  }
]
Sadece JSON dön, başka metin ekleme.`,
          model: "EFFICIENT",
          module: "questions-fabrika",
        }),
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error("Günlük AI limitinize ulaştınız");
        throw new Error("AI yanıt vermedi");
      }

      const data = await res.json();
      const aiText: string = data.response?.text || "";
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Sorular ayrıştırılamadı");

      const parsed: Omit<Question, "id">[] = JSON.parse(jsonMatch[0]);
      const qs: Question[] = parsed.slice(0, 5).map((q, i) => ({ ...q, id: `q_${i}` }));
      setQuestions(qs);
      setPhase("exam");
      toast.success("5 soru hazır!", { id: loadingId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu", { id: loadingId });
      setPhase("idle");
    }
  }

  function handleAnswer(optIdx: number) {
    if (selected !== null) return;
    setSelected(optIdx);
  }

  function nextQuestion() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentIdx + 1 >= questions.length) {
      finishExam(newAnswers);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  async function finishExam(finalAnswers: number[]) {
    setPhase("loading");
    const score = finalAnswers.filter((a, i) => a === questions[i].correct).length;
    const loadingId = toast.loading("Performansınız değerlendiriliyor...");

    try {
      const summaryLines = questions.map((q, i) => {
        const correct = finalAnswers[i] === q.correct;
        return `Soru ${i + 1}: ${q.text}\nVerilen cevap: ${q.options[finalAnswers[i]]}\nDoğru cevap: ${q.options[q.correct]}\nSonuç: ${correct ? "DOĞRU" : "YANLIŞ"}`;
      }).join("\n\n");

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Öğrencinin sınav performansını değerlendir. Skor: ${score}/5.\n\n${summaryLines}\n\nKısa, motive edici ve yapıcı bir değerlendirme yaz.`,
          model: "EFFICIENT",
          module: "questions-fabrika",
        }),
      });

      const data = await res.json();
      setEvaluation(data.response?.text || "Değerlendirme alınamadı.");
      toast.success("Değerlendirme hazır!", { id: loadingId });
    } catch {
      setEvaluation(`${score}/5 soru doğru yanıtladınız.`);
      toast.dismiss(loadingId);
    } finally {
      setPhase("result");
    }
  }

  const score = answers.filter((a, i) => a === questions[i]?.correct).length;
  const currentQ = questions[currentIdx];

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
          <Zap size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Zilli Sınav</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">AI adaptif sınav — 5 soru, anlık değerlendirme</p>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 text-xs text-[var(--color-warning)]">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Eğitim amaçlı simülasyon. AI soruları rastgele üretir, gerçek sınav soruları değildir.</span>
      </div>

      {phase === "idle" && (
        <Card variant="elevated" className="flex flex-col items-center justify-center text-center p-12 border-dashed border-2">
          <PlayCircle size={64} className="text-[var(--color-primary)] mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">Zilli Sınav</h2>
          <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
            AI 5 adet medikal soru üretir. Soruları yanıtladıktan sonra AI performansınızı değerlendirir ve
            geri bildirim verir.
          </p>
          <div className="flex gap-4 mb-8">
            <Badge variant="outline" className="px-4 py-2">5 Soru</Badge>
            <Badge variant="outline" className="px-4 py-2">Çoktan Seçmeli</Badge>
            <Badge variant="outline" className="px-4 py-2">AI Değerlendirme</Badge>
          </div>
          <Button size="lg" onClick={startExam} className="px-12 h-14 text-lg">
            Sınavı Başlat
          </Button>
        </Card>
      )}

      {phase === "loading" && (
        <Card variant="elevated" className="flex flex-col items-center justify-center p-16 gap-4">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <p className="text-[var(--color-text-secondary)] text-sm">İşleniyor...</p>
        </Card>
      )}

      {phase === "exam" && currentQ && (
        <Card variant="elevated" className="p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Soru {currentIdx + 1} / {questions.length}</Badge>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < currentIdx
                      ? "bg-[var(--color-success)]"
                      : i === currentIdx
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-border)]"
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-base font-semibold leading-relaxed">{currentQ.text}</p>

          <div className="flex flex-col gap-3">
            {currentQ.options.map((opt, i) => {
              let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ";
              if (selected === null) {
                cls += "border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 cursor-pointer";
              } else if (i === currentQ.correct) {
                cls += "border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]";
              } else if (i === selected) {
                cls += "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]";
              } else {
                cls += "border-[var(--color-border)] opacity-50";
              }
              return (
                <button key={i} className={cls} onClick={() => handleAnswer(i)} disabled={selected !== null}>
                  <div className="flex items-center gap-2">
                    {selected !== null && i === currentQ.correct && <CheckCircle size={14} />}
                    {selected !== null && i === selected && i !== currentQ.correct && <XCircle size={14} />}
                    {opt}
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              <Brain size={12} className="inline mr-1 text-[var(--color-primary)]" />
              {currentQ.explanation}
            </div>
          )}

          <Button onClick={nextQuestion} disabled={selected === null} className="w-full">
            {currentIdx + 1 >= questions.length ? "Sınavı Bitir ve Değerlendir" : "Sonraki Soru"}
          </Button>
        </Card>
      )}

      {phase === "result" && (
        <div className="flex flex-col gap-4">
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-[var(--color-primary)]">{score}/{questions.length}</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Sınav Tamamlandı</h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              {score === questions.length ? "Mükemmel!" : score >= 3 ? "İyi iş!" : "Daha fazla çalışman gerekiyor."}
            </p>
            <div className="text-sm text-left leading-relaxed text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] rounded-xl p-4 border border-[var(--color-border)] whitespace-pre-wrap">
              {evaluation}
            </div>
          </Card>
          <Button variant="ghost" onClick={() => setPhase("idle")} className="w-full">
            <RotateCcw size={14} className="mr-2" /> Yeni Sınav Başlat
          </Button>
        </div>
      )}
    </div>
  );
}
