"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  FlaskConical,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ClinicHero, ClinicStat } from "@/components/clinic/ClinicSurface";

type LabCategory = "hemogram" | "biyokimya" | "koagulasyon" | "goruntuleme";
type Result = {
  id: string;
  test: string;
  value: string;
  unit: string;
  normal: string;
  status: "normal" | "high" | "low" | "critical";
  date: string;
  category: LabCategory;
};

const REFERENCE: Record<string, { unit: string; normal: string; low: number; high: number }> = {
  Hemoglobin: { unit: "g/dL", normal: "12-16 (K), 13.5-17.5 (E)", low: 12, high: 17.5 },
  Hematokrit: { unit: "%", normal: "36-48 (K), 41-53 (E)", low: 36, high: 53 },
  Lokosit: { unit: "10³/µL", normal: "4.5-11.0", low: 4.5, high: 11.0 },
  Trombosit: { unit: "10³/µL", normal: "150-400", low: 150, high: 400 },
  "Glukoz (AC)": { unit: "mg/dL", normal: "70-100", low: 70, high: 100 },
  Kreatinin: { unit: "mg/dL", normal: "0.6-1.2", low: 0.6, high: 1.2 },
  Ure: { unit: "mg/dL", normal: "7-25", low: 7, high: 25 },
  Na: { unit: "mEq/L", normal: "136-145", low: 136, high: 145 },
  K: { unit: "mEq/L", normal: "3.5-5.0", low: 3.5, high: 5.0 },
  AST: { unit: "U/L", normal: "10-40", low: 10, high: 40 },
  ALT: { unit: "U/L", normal: "7-56", low: 7, high: 56 },
  TSH: { unit: "mIU/L", normal: "0.4-4.0", low: 0.4, high: 4.0 },
  "Troponin I": { unit: "ng/mL", normal: "<0.04", low: 0, high: 0.04 },
  CRP: { unit: "mg/L", normal: "<5", low: 0, high: 5 },
  "PT/INR": { unit: "", normal: "0.8-1.2", low: 0.8, high: 1.2 },
  aPTT: { unit: "sn", normal: "25-35", low: 25, high: 35 },
};

const LABS = Object.keys(REFERENCE);

export default function LabViewingPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<LabCategory>("biyokimya");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  async function analyzeLabs() {
    if (results.length === 0) {
      toast.error("Analiz için sonuç eklemelisiniz.");
      return;
    }
    setAnalyzing(true);
    try {
      const labSummary = results.map((r) => `${r.test}: ${r.value} ${r.unit} (${r.status})`).join(", ");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `LABORATUVAR VERILERI: ${labSummary}. Gorev: Sonuclari klinik tabloyla iliskilendirip oncelikli yorum yap.`,
          model: "EFFICIENT",
          module: "lab-viewing",
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInterpretation(data?.response?.text ?? data?.text ?? "");
      toast.success("Klinik analiz tamamlandı.");
    } catch {
      toast.error("Analiz motoru şu an yanıt vermiyor.");
    } finally {
      setAnalyzing(false);
    }
  }

  function addResult() {
    if (!testName || !value) {
      toast.error("Test adı ve değer zorunludur");
      return;
    }
    const ref = REFERENCE[testName];
    const num = parseFloat(value);
    let status: Result["status"] = "normal";
    if (ref) {
      if (num < ref.low * 0.8 || num > ref.high * 1.5) status = "critical";
      else if (num < ref.low) status = "low";
      else if (num > ref.high) status = "high";
    }
    setResults((prev) => [
      {
        id: Date.now().toString(),
        test: testName,
        value,
        unit: ref?.unit ?? "",
        normal: ref?.normal ?? "",
        status,
        date: new Date().toLocaleDateString("tr-TR"),
        category,
      },
      ...prev,
    ]);
    setTestName("");
    setValue("");
    setShowForm(false);
  }

  const filtered = useMemo(
    () =>
      results.filter(
        (item) =>
          (activeFilter === "all" || item.status === activeFilter || item.category === activeFilter) &&
          item.test.toLowerCase().includes(search.toLowerCase()),
      ),
    [activeFilter, results, search],
  );

  const criticalCount = results.filter((item) => item.status === "critical").length;
  const abnormalCount = results.filter((item) => item.status === "high" || item.status === "low").length;

  const statusIcon = {
    normal: Minus,
    high: TrendingUp,
    low: TrendingDown,
    critical: AlertTriangle,
  };

  return (
    <div className="space-y-6">
      <ClinicHero
        eyebrow="Lab Correlation"
        title="Lab ve görüntüleme korelasyonu"
        description="Sonuçları yalnız listeleme; anormallikleri klinik bağlama çevir, kritik sinyalleri işaretle ve AI yorumuyla derinleştir."
        icon={FlaskConical}
        actions={
          <>
            <Button variant="secondary" onClick={() => void analyzeLabs()} disabled={analyzing || results.length === 0}>
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              AI yorumu al
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              Sonuç ekle
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ClinicStat label="Toplam Sonuç" value={results.length} detail="Eklenen lab/görüntüleme girdileri" />
        <ClinicStat label="Kritik Sinyal" value={criticalCount} detail="Anında dikkat gerektiren sonuçlar" tone="var(--color-destructive)" />
        <ClinicStat label="Anormal Bulgular" value={abnormalCount} detail="Yüksek veya düşük değerler" tone="var(--color-warning)" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Sonuç Panosu</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Test ara..."
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-3 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none"
                  />
                </div>
                {["all", "critical", "high", "low", "normal"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-full px-3 py-2 text-xs font-medium ${activeFilter === filter ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]" : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]"}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
                  Sonuç bulunamadı.
                </div>
              ) : (
                filtered.map((item) => {
                  const Icon = statusIcon[item.status];
                  return (
                    <div key={item.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[var(--color-text-primary)]">{item.test}</p>
                          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                            {item.value} {item.unit} · normal: {item.normal}
                          </p>
                        </div>
                        <Icon size={16} className="text-[var(--color-primary)]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {interpretation ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain size={16} className="text-[var(--color-primary)]" />
                  Klinik AI Değerlendirmesi
                </CardTitle>
                <button onClick={() => setInterpretation(null)} className="text-[var(--color-text-secondary)]">
                  <X size={15} />
                </button>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--color-text-secondary)]">
                {interpretation}
              </p>
              <Link href="/clinic/ai-assistan" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]">
                <MessageSquare size={14} />
                Bulguları klinik asistana taşı
              </Link>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardTitle className="text-base">Klinik Uyarı</CardTitle>
            <p className="mt-5 text-sm leading-7 text-[var(--color-text-secondary)]">
              Bu araç eğitim amaçlıdır. Kritik sonuçlar ve gerçek hasta yönetimi için mutlaka hekim değerlendirmesi gerekir.
            </p>
          </Card>

          <Card>
            <CardTitle className="text-base">Hızlı Test Girişi</CardTitle>
            <div className="mt-5 space-y-4">
              <select
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              >
                <option value="">Test seçin</option>
                {LABS.map((lab) => (
                  <option key={lab} value={lab}>
                    {lab}
                  </option>
                ))}
              </select>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Sonuç değeri"
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LabCategory)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] outline-none"
              >
                <option value="biyokimya">Biyokimya</option>
                <option value="hemogram">Hemogram</option>
                <option value="koagulasyon">Koagulasyon</option>
                <option value="goruntuleme">Goruntuleme</option>
              </select>
              <Button className="w-full" onClick={addResult}>
                <Plus size={16} />
                Panele ekle
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
