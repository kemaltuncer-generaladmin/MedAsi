"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calculator, ChevronRight } from "lucide-react";

type FormulaId =
  | "bmi"
  | "bsa"
  | "gfr"
  | "ideal_weight"
  | "map"
  | "corrected_calcium"
  | "anion_gap"
  | "fena"
  | "corrected_na"
  | "dosage";

const formulas: { id: FormulaId; title: string; desc: string }[] = [
  { id: "bmi", title: "Vücut Kitle İndeksi (BMI)", desc: "kg/m²" },
  { id: "bsa", title: "Vücut Yüzey Alanı (BSA)", desc: "Mosteller formülü" },
  { id: "gfr", title: "Tahmini GFR (eGFR)", desc: "CKD-EPI formülü" },
  { id: "ideal_weight", title: "İdeal Vücut Ağırlığı", desc: "Devine formülü" },
  { id: "map", title: "Ortalama Arter Basıncı (MAP)", desc: "mmHg" },
  {
    id: "corrected_calcium",
    title: "Düzeltilmiş Kalsiyum",
    desc: "Albumin bazlı",
  },
  { id: "anion_gap", title: "Anyon Gap", desc: "mEq/L" },
  { id: "fena", title: "FENa (Fraksiyone Na Atılımı)", desc: "%" },
  { id: "corrected_na", title: "Düzeltilmiş Sodyum", desc: "Hiperglisemi" },
  { id: "dosage", title: "Basit Dozaj Hesaplayıcı", desc: "mg/kg" },
];

type Fields = Record<string, string>;
type CalcResult = { value: string; interpretation?: string; color?: string };

function calcBMI(f: Fields): CalcResult {
  const w = parseFloat(f.weight),
    h = parseFloat(f.height) / 100;
  if (!w || !h) return { value: "" };
  const bmi = w / (h * h);
  const v = bmi.toFixed(1);
  let interp = "",
    color = "text-[var(--color-text-primary)]";
  if (bmi < 18.5) {
    interp = "Zayıf";
    color = "text-[var(--color-warning)]";
  } else if (bmi < 25) {
    interp = "Normal";
    color = "text-[var(--color-success)]";
  } else if (bmi < 30) {
    interp = "Fazla Kilolu";
    color = "text-[var(--color-warning)]";
  } else {
    interp = "Obez";
    color = "text-[var(--color-destructive)]";
  }
  return { value: `${v} kg/m²`, interpretation: interp, color };
}

function calcBSA(f: Fields): CalcResult {
  const w = parseFloat(f.weight),
    h = parseFloat(f.height);
  if (!w || !h) return { value: "" };
  const bsa = Math.sqrt((w * h) / 3600);
  return { value: `${bsa.toFixed(2)} m²` };
}

function calcGFR(f: Fields): CalcResult {
  const cr = parseFloat(f.creatinine),
    age = parseFloat(f.age);
  const female = f.gender === "female";
  if (!cr || !age) return { value: "" };
  let gfr =
    141 *
    Math.pow(Math.min(cr / (female ? 0.7 : 0.9), 1), female ? -0.329 : -0.411) *
    Math.pow(Math.max(cr / (female ? 0.7 : 0.9), 1), -1.209) *
    Math.pow(0.993, age) *
    (female ? 1.018 : 1);
  const v = Math.round(gfr);
  let interp = "",
    color = "text-[var(--color-text-primary)]";
  if (v >= 90) {
    interp = "Evre 1 (Normal)";
    color = "text-[var(--color-success)]";
  } else if (v >= 60) {
    interp = "Evre 2 (Hafif azalma)";
    color = "text-[var(--color-success)]";
  } else if (v >= 45) {
    interp = "Evre 3a";
    color = "text-[var(--color-warning)]";
  } else if (v >= 30) {
    interp = "Evre 3b";
    color = "text-[var(--color-warning)]";
  } else if (v >= 15) {
    interp = "Evre 4 (Ağır)";
    color = "text-[var(--color-destructive)]";
  } else {
    interp = "Evre 5 (Böbrek Yetmezliği)";
    color = "text-[var(--color-destructive)]";
  }
  return { value: `${v} mL/dak/1.73m²`, interpretation: interp, color };
}

function calcIdealWeight(f: Fields): CalcResult {
  const h = parseFloat(f.height),
    female = f.gender === "female";
  if (!h || h < 152) return { value: "" };
  const ibw = female
    ? 45.5 + 2.3 * ((h - 152.4) / 2.54)
    : 50 + 2.3 * ((h - 152.4) / 2.54);
  return { value: `${ibw.toFixed(1)} kg` };
}

function calcMAP(f: Fields): CalcResult {
  const s = parseFloat(f.systolic),
    d = parseFloat(f.diastolic);
  if (!s || !d) return { value: "" };
  const map = d + (s - d) / 3;
  let color = "text-[var(--color-text-primary)]";
  if (map < 65) color = "text-[var(--color-destructive)]";
  else if (map > 110) color = "text-[var(--color-warning)]";
  else color = "text-[var(--color-success)]";
  return {
    value: `${map.toFixed(0)} mmHg`,
    interpretation: map < 65 ? "Kritik (<65)" : "Normal",
    color,
  };
}

function calcCorrectedCa(f: Fields): CalcResult {
  const ca = parseFloat(f.calcium),
    alb = parseFloat(f.albumin);
  if (!ca || !alb) return { value: "" };
  const corrected = ca + 0.8 * (4 - alb);
  return { value: `${corrected.toFixed(2)} mg/dL` };
}

function calcAnionGap(f: Fields): CalcResult {
  const na = parseFloat(f.sodium),
    cl = parseFloat(f.chloride),
    hco3 = parseFloat(f.bicarbonate);
  if (!na || !cl || !hco3) return { value: "" };
  const ag = na - cl - hco3;
  let interp = ag > 12 ? "Yüksek (>12)" : "Normal (8-12)";
  let color =
    ag > 12 ? "text-[var(--color-destructive)]" : "text-[var(--color-success)]";
  return { value: `${ag} mEq/L`, interpretation: interp, color };
}

function calcFENa(f: Fields): CalcResult {
  const uNa = parseFloat(f.urine_na),
    sNa = parseFloat(f.serum_na);
  const uCr = parseFloat(f.urine_cr),
    sCr = parseFloat(f.serum_cr);
  if (!uNa || !sNa || !uCr || !sCr) return { value: "" };
  const fena = (uNa / sNa / (uCr / sCr)) * 100;
  let interp = fena < 1 ? "Prerenal (<1%)" : "Renal (>1%)";
  return { value: `${fena.toFixed(2)}%`, interpretation: interp };
}

function calcCorrectedNa(f: Fields): CalcResult {
  const na = parseFloat(f.sodium),
    glucose = parseFloat(f.glucose);
  if (!na || !glucose) return { value: "" };
  const corrected = na + 1.6 * ((glucose - 100) / 100);
  return { value: `${corrected.toFixed(1)} mEq/L` };
}

function calcDosage(f: Fields): CalcResult {
  const dose = parseFloat(f.dose_per_kg),
    weight = parseFloat(f.weight);
  if (!dose || !weight) return { value: "" };
  return { value: `${(dose * weight).toFixed(1)} mg` };
}

const calculators: Record<
  FormulaId,
  {
    fields: { key: string; label: string; type?: string; options?: string[] }[];
    calc: (f: Fields) => CalcResult;
  }
> = {
  bmi: {
    fields: [
      { key: "weight", label: "Ağırlık (kg)" },
      { key: "height", label: "Boy (cm)" },
    ],
    calc: calcBMI,
  },
  bsa: {
    fields: [
      { key: "weight", label: "Ağırlık (kg)" },
      { key: "height", label: "Boy (cm)" },
    ],
    calc: calcBSA,
  },
  gfr: {
    fields: [
      { key: "creatinine", label: "Kreatinin (mg/dL)" },
      { key: "age", label: "Yaş" },
      {
        key: "gender",
        label: "Cinsiyet",
        type: "select",
        options: ["male", "female"],
      },
    ],
    calc: calcGFR,
  },
  ideal_weight: {
    fields: [
      { key: "height", label: "Boy (cm)" },
      {
        key: "gender",
        label: "Cinsiyet",
        type: "select",
        options: ["male", "female"],
      },
    ],
    calc: calcIdealWeight,
  },
  map: {
    fields: [
      { key: "systolic", label: "Sistolik (mmHg)" },
      { key: "diastolic", label: "Diyastolik (mmHg)" },
    ],
    calc: calcMAP,
  },
  corrected_calcium: {
    fields: [
      { key: "calcium", label: "Total Kalsiyum (mg/dL)" },
      { key: "albumin", label: "Albumin (g/dL)" },
    ],
    calc: calcCorrectedCa,
  },
  anion_gap: {
    fields: [
      { key: "sodium", label: "Sodyum (mEq/L)" },
      { key: "chloride", label: "Klor (mEq/L)" },
      { key: "bicarbonate", label: "Bikarbonat (mEq/L)" },
    ],
    calc: calcAnionGap,
  },
  fena: {
    fields: [
      { key: "urine_na", label: "İdrar Na (mEq/L)" },
      { key: "serum_na", label: "Serum Na (mEq/L)" },
      { key: "urine_cr", label: "İdrar Cr (mg/dL)" },
      { key: "serum_cr", label: "Serum Cr (mg/dL)" },
    ],
    calc: calcFENa,
  },
  corrected_na: {
    fields: [
      { key: "sodium", label: "Serum Na (mEq/L)" },
      { key: "glucose", label: "Glukoz (mg/dL)" },
    ],
    calc: calcCorrectedNa,
  },
  dosage: {
    fields: [
      { key: "dose_per_kg", label: "Doz (mg/kg)" },
      { key: "weight", label: "Ağırlık (kg)" },
    ],
    calc: calcDosage,
  },
};

export default function ClinicalFormulePage() {
  const [selected, setSelected] = useState<FormulaId>("bmi");
  const [fields, setFields] = useState<Fields>({});
  const [result, setResult] = useState<CalcResult | null>(null);

  function calculate() {
    const res = calculators[selected].calc(fields);
    setResult(res);
  }

  function selectFormula(id: FormulaId) {
    setSelected(id);
    setFields({});
    setResult(null);
  }

  const calc = calculators[selected];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Calculator size={20} className="text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Klinik Formül Hesaplayıcıları
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Kanıta dayalı klinik formüller
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card variant="bordered" className="p-3">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2 px-2">
              Formüller
            </p>
            <div className="space-y-0.5">
              {formulas.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFormula(f.id)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center justify-between group",
                    selected === f.id
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] border-l-2 border-transparent",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-xs opacity-70">{f.desc}</p>
                  </div>
                  <ChevronRight
                    size={12}
                    className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card variant="elevated" className="p-6">
            <CardTitle className="mb-4">
              {formulas.find((f) => f.id === selected)?.title}
            </CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {calc.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select
                      value={fields[field.key] ?? ""}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                      <option value="">Seçin</option>
                      {field.options?.map((o) => (
                        <option key={o} value={o}>
                          {o === "male"
                            ? "Erkek"
                            : o === "female"
                              ? "Kadın"
                              : o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={fields[field.key] ?? ""}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder="Değer girin"
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>

            <Button variant="primary" onClick={calculate} className="w-full">
              <Calculator size={15} />
              Hesapla
            </Button>

            {result && result.value && (
              <div className="mt-5 p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                  Sonuç
                </p>
                <p
                  className={`text-3xl font-bold ${result.color ?? "text-[var(--color-primary)]"}`}
                >
                  {result.value}
                </p>
                {result.interpretation && (
                  <p
                    className={`text-sm mt-1 font-medium ${result.color ?? "text-[var(--color-text-secondary)]"}`}
                  >
                    {result.interpretation}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
