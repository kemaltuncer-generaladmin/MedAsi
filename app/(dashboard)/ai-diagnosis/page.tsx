"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";
import { ClinicHero } from "@/components/clinic/ClinicSurface";

type DiagnosisItem = {
  name: string;
  probability?: number;
  explanation?: string;
  supporting?: string[];
  against?: string[];
};

type DiagnosisResult = {
  urgency?: "low" | "medium" | "high";
  headline?: string;
  diagnoses?: DiagnosisItem[];
  tests?: string[];
  redFlags?: string[];
  nextStep?: string;
};

function normalizeResult(rawText: string): DiagnosisResult {
  try {
    const parsed = JSON.parse(rawText) as DiagnosisResult;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // JSON olmayan serbest metin yanıtlarını aşağıdaki fallback ile işleriz.
  }

  const blocks = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    urgency: /acil|kritik|yüksek/i.test(rawText)
      ? "high"
      : /orta/i.test(rawText)
        ? "medium"
        : "low",
    headline: blocks[0] ?? "Yapısal yanıt alınamadı",
    diagnoses: blocks.slice(0, 4).map((line, index) => ({
      name: line.replace(/^[-*•]\s*/, "").slice(0, 80) || `Olası Tanı ${index + 1}`,
      probability: Math.max(20, 85 - index * 15),
      explanation: line,
    })),
    tests: blocks.filter((line) => /tetkik|test|ekg|kan|görüntüleme/i.test(line)).slice(0, 6),
    redFlags: blocks.filter((line) => /uyarı|red flag|alarm|kritik/i.test(line)).slice(0, 4),
    nextStep: blocks[4] ?? "Öncelikli tetkik ve kliniğe göre karar ver.",
  };
}

export default function AiDiagnosisPage() {
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [vitals, setVitals] = useState("");
  const [history, setHistory] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const caseSummary = useMemo(
    () =>
      [
        age ? `Yaş/Cinsiyet: ${age}` : "",
        chiefComplaint ? `Başvuru: ${chiefComplaint}` : "",
        vitals ? `Vital/Lab: ${vitals}` : "",
        history ? `Ek öykü: ${history}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [age, chiefComplaint, history, vitals],
  );

  async function analyzeCase() {
    if (caseSummary.length < 40) {
      toast.error("Profesyonel bir analiz için biraz daha klinik bağlam gir.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: [
            "Aşağıdaki olguyu ai-diagnosis modülü olarak değerlendir.",
            "JSON dön.",
            `Şema: {"urgency":"low|medium|high","headline":"...","diagnoses":[{"name":"...","probability":75,"explanation":"...","supporting":["..."],"against":["..."]}],"tests":["..."],"redFlags":["..."],"nextStep":"..."}`,
            caseSummary,
          ].join("\n\n"),
          model: "FAST",
          module: "ai-diagnosis",
        }),
      });

      const data = await res.json();
      const text = data?.response?.text ?? data?.text ?? "";
      if (!text) throw new Error("AI yanıtı alınamadı");
      setResult(normalizeResult(text));
      toast.success("Klinik reasoning tamamlandı.");
    } catch {
      toast.error("Tanı akışı şu an kurulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Clinical Reasoning"
        title="AI tanı motoru"
        description="Semptomu yalnız listeye değil, önceliklendirilmiş differential diagnosis zincirine, test planına ve risk çerçevesine çevir."
        icon={Stethoscope}
        actions={
          <Button onClick={analyzeCase} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            Tanı akışını kur
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse size={16} className="text-[var(--color-primary)]" />
            Olgu Girişi
          </CardTitle>
          <div className="mt-5 space-y-4">
            <input
              value={age}
              onChange={(event) => setAge(event.target.value)}
              placeholder="Örn: 45 yaş kadın"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />
            <textarea
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
              placeholder="Başvuru nedeni ve temel semptomlar"
              className="min-h-[130px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />
            <textarea
              value={vitals}
              onChange={(event) => setVitals(event.target.value)}
              placeholder="Vital bulgular, EKG, laboratuvar, görüntüleme"
              className="min-h-[120px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />
            <textarea
              value={history}
              onChange={(event) => setHistory(event.target.value)}
              placeholder="Ek öykü, ilaçlar, riskler, kronik durumlar"
              className="min-h-[120px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none"
            />
            <div className="rounded-3xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/6 px-4 py-4 text-sm leading-7 text-[var(--color-text-secondary)]">
              Bu alan eğitim ve reasoning pratiği içindir; gerçek klinik karar yerine geçmez.
            </div>
          </div>
        </Card>

        {!result && !loading ? (
          <Card className="flex min-h-[560px] flex-col items-center justify-center text-center">
            <ShieldAlert size={44} className="text-[var(--color-text-secondary)]" />
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-text-primary)]">
              Differential workspace hazır
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)]">
              Sol taraftaki olgu bağlamı girildiğinde sistem aciliyet, olası tanılar, tetkik öncelikleri ve kritik red flag’leri aynı çerçevede döndürür.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="medasi-panel-title">Decision Layer</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                    {result?.headline || "Ayırıcı tanı üretildi"}
                  </h2>
                </div>
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
                  {result?.urgency?.toUpperCase() ?? "MEDIUM"}
                </span>
              </div>
            </Card>

            <Card>
              <CardTitle className="text-base">Olası Tanılar</CardTitle>
              <div className="mt-5 space-y-4">
                {(result?.diagnoses ?? []).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{item.name}</p>
                      <span className="text-sm font-semibold text-[var(--color-primary)]">
                        %{item.probability ?? 0}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 size={16} className="text-[var(--color-success)]" />
                  Tetkik Önceliği
                </CardTitle>
                <div className="mt-5 space-y-3">
                  {(result?.tests ?? []).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TriangleAlert size={16} className="text-[var(--color-warning)]" />
                  Red Flags
                </CardTitle>
                <div className="mt-5 space-y-3">
                  {(result?.redFlags ?? []).map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle size={16} className="text-[var(--color-primary)]" />
                Sonraki En İyi Adım
              </CardTitle>
              <CardContent className="mt-4 text-sm leading-7 text-[var(--color-text-primary)]">
                {result?.nextStep ?? "Tetkik ve klinik korelasyona göre sonraki adımı belirle."}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
