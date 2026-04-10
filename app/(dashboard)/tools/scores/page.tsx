"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Activity, ChevronRight } from "lucide-react";

type ScoreId =
  | "heart"
  | "chads2"
  | "wells_dvt"
  | "glasgow"
  | "news"
  | "curb65"
  | "grace"
  | "cha2ds2";

type CriteriaItem = { key: string; label: string; points: number };
type Score = {
  id: ScoreId;
  title: string;
  purpose: string;
  criteria: CriteriaItem[];
  interpret: (score: number) => { risk: string; color: string; action: string };
};

const scores: Score[] = [
  {
    id: "heart",
    title: "HEART Skoru",
    purpose: "Akut göğüs ağrısı risk değerlendirmesi",
    criteria: [
      { key: "history_high", label: "Anamnez: Yüksek şüpheli (2p)", points: 2 },
      { key: "history_mod", label: "Anamnez: Orta şüpheli (1p)", points: 1 },
      {
        key: "ecg_lbbb",
        label: "EKG: LBBB / LVH / ST depresyonu (1p)",
        points: 1,
      },
      { key: "ecg_new", label: "EKG: Yeni ST elevasyonu (2p)", points: 2 },
      { key: "age_65", label: "Yaş ≥ 65 (2p)", points: 2 },
      { key: "age_4564", label: "Yaş 45-64 (1p)", points: 1 },
      { key: "risk_3plus", label: "≥3 risk faktörü (2p)", points: 2 },
      { key: "risk_12", label: "1-2 risk faktörü (1p)", points: 1 },
      { key: "troponin_3x", label: "Troponin >3x üst sınır (2p)", points: 2 },
      {
        key: "troponin_1to3",
        label: "Troponin 1-3x üst sınır (1p)",
        points: 1,
      },
    ],
    interpret: (s) => {
      if (s <= 3)
        return {
          risk: "Düşük Risk",
          color: "text-[var(--color-success)]",
          action: "Taburcu düşünülebilir",
        };
      if (s <= 6)
        return {
          risk: "Orta Risk",
          color: "text-[var(--color-warning)]",
          action: "Gözlem ve ileri tetkik",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Acil kardiyoloji",
      };
    },
  },
  {
    id: "chads2",
    title: "CHADS₂ Skoru",
    purpose: "AF hastalarında inme riski",
    criteria: [
      { key: "chf", label: "Konjestif kalp yetmezliği (1p)", points: 1 },
      { key: "htn", label: "Hipertansiyon (1p)", points: 1 },
      { key: "age75", label: "Yaş ≥ 75 (1p)", points: 1 },
      { key: "dm", label: "Diyabetes mellitus (1p)", points: 1 },
      { key: "stroke", label: "İnme / TIA öyküsü (2p)", points: 2 },
    ],
    interpret: (s) => {
      if (s === 0)
        return {
          risk: "Düşük Risk (%1.9/yıl)",
          color: "text-[var(--color-success)]",
          action: "Aspirin düşünülebilir",
        };
      if (s === 1)
        return {
          risk: "Orta Risk (%2.8/yıl)",
          color: "text-[var(--color-warning)]",
          action: "Aspirin veya antikoagülan",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Oral antikoagülan önerilir",
      };
    },
  },
  {
    id: "wells_dvt",
    title: "Wells DVT Skoru",
    purpose: "Derin ven trombozu olasılığı",
    criteria: [
      {
        key: "paralysis",
        label: "Bacak felci / immobilizasyon (1p)",
        points: 1,
      },
      {
        key: "bedridden",
        label: "Son 3 günde yatak istirahati / büyük cerrahi (1p)",
        points: 1,
      },
      {
        key: "tenderness",
        label: "Bacakta lokalize hassasiyet (1p)",
        points: 1,
      },
      { key: "swelling", label: "Bacakta şişlik (1p)", points: 1 },
      { key: "calf_diff", label: "Baldır çevresi farkı ≥3 cm (1p)", points: 1 },
      {
        key: "pitting",
        label: "Etkilenen bacakta non-pitting ödem (1p)",
        points: 1,
      },
      { key: "collateral", label: "Yüzeyel venöz kollateral (1p)", points: 1 },
      { key: "malignancy", label: "Aktif malignite (1p)", points: 1 },
      {
        key: "alternative",
        label: "Alternatif tanı daha olası (-2p)",
        points: -2,
      },
    ],
    interpret: (s) => {
      if (s <= 0)
        return {
          risk: "Düşük Olasılık",
          color: "text-[var(--color-success)]",
          action: "D-dimer ile dışla",
        };
      if (s <= 2)
        return {
          risk: "Orta Olasılık",
          color: "text-[var(--color-warning)]",
          action: "D-dimer + Ultrason",
        };
      return {
        risk: "Yüksek Olasılık",
        color: "text-[var(--color-destructive)]",
        action: "Doppler USG acil",
      };
    },
  },
  {
    id: "glasgow",
    title: "Glasgow Koma Skalası",
    purpose: "Bilinç düzeyi değerlendirmesi",
    criteria: [
      { key: "eye4", label: "Göz açma: Kendiliğinden (4p)", points: 4 },
      { key: "eye3", label: "Göz açma: Sese yanıt (3p)", points: 3 },
      { key: "eye2", label: "Göz açma: Ağrıya yanıt (2p)", points: 2 },
      { key: "eye1", label: "Göz açma: Yok (1p)", points: 1 },
      { key: "verbal5", label: "Sözel: Oryante (5p)", points: 5 },
      { key: "verbal4", label: "Sözel: Konfüze (4p)", points: 4 },
      { key: "verbal3", label: "Sözel: Uygunsuz kelimeler (3p)", points: 3 },
      { key: "motor6", label: "Motor: Komuta uyar (6p)", points: 6 },
      { key: "motor5", label: "Motor: Ağrıyı lokalize eder (5p)", points: 5 },
      { key: "motor4", label: "Motor: Fleksiyon (4p)", points: 4 },
    ],
    interpret: (s) => {
      if (s >= 13)
        return {
          risk: "Hafif Bilinç Bozukluğu",
          color: "text-[var(--color-warning)]",
          action: "Gözlem",
        };
      if (s >= 9)
        return {
          risk: "Orta Bilinç Bozukluğu",
          color: "text-[var(--color-warning)]",
          action: "Yakın takip",
        };
      return {
        risk: "Ağır Bilinç Bozukluğu (Koma)",
        color: "text-[var(--color-destructive)]",
        action: "Yoğun bakım",
      };
    },
  },
  {
    id: "curb65",
    title: "CURB-65 Skoru",
    purpose: "Pnömoni şiddet değerlendirmesi",
    criteria: [
      { key: "confusion", label: "Konfüzyon (1p)", points: 1 },
      { key: "urea", label: "Üre > 7 mmol/L (1p)", points: 1 },
      { key: "resp", label: "Solunum hızı ≥ 30/dak (1p)", points: 1 },
      {
        key: "bp",
        label: "KB: Sistolik <90 veya Diyastolik <60 (1p)",
        points: 1,
      },
      { key: "age65", label: "Yaş ≥ 65 (1p)", points: 1 },
    ],
    interpret: (s) => {
      if (s <= 1)
        return {
          risk: "Düşük Risk",
          color: "text-[var(--color-success)]",
          action: "Ayaktan tedavi",
        };
      if (s === 2)
        return {
          risk: "Orta Risk",
          color: "text-[var(--color-warning)]",
          action: "Kısa süreli hastane veya takip",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Acil hastane yatışı / YBÜ",
      };
    },
  },
  {
    id: "news",
    title: "NEWS2 Skoru",
    purpose: "Erken uyarı sistemi",
    criteria: [
      { key: "spo2_low", label: "SpO2 ≤ 91% (3p)", points: 3 },
      { key: "spo2_mod", label: "SpO2 92-93% (2p)", points: 2 },
      { key: "rr_high", label: "Solunum hızı ≥ 25/dak (3p)", points: 3 },
      { key: "rr_low", label: "Solunum hızı ≤ 8/dak (3p)", points: 3 },
      { key: "hr_high", label: "Nabız ≥ 131/dak (3p)", points: 3 },
      { key: "sbp_low", label: "Sistolik KB ≤ 90 mmHg (3p)", points: 3 },
      { key: "temp_low", label: "Ateş ≤ 35°C (3p)", points: 3 },
      { key: "temp_high", label: "Ateş ≥ 39.1°C (2p)", points: 2 },
      { key: "avpu", label: "Bilinç: Ses/Ağrı/Yanıtsız (3p)", points: 3 },
    ],
    interpret: (s) => {
      if (s <= 4)
        return {
          risk: "Düşük Risk",
          color: "text-[var(--color-success)]",
          action: "4-12 saatlik takip",
        };
      if (s <= 6)
        return {
          risk: "Orta Risk",
          color: "text-[var(--color-warning)]",
          action: "Acil değerlendirme",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Acil YBÜ değerlendirmesi",
      };
    },
  },
  {
    id: "grace",
    title: "GRACE Skoru (Basit)",
    purpose: "AKS hastane içi mortalite",
    criteria: [
      { key: "age70", label: "Yaş ≥ 70 (2p)", points: 2 },
      { key: "age5070", label: "Yaş 50-69 (1p)", points: 1 },
      { key: "sbp90", label: "Sistolik KB < 90 (3p)", points: 3 },
      { key: "sbp120", label: "Sistolik KB 90-120 (2p)", points: 2 },
      { key: "cr_high", label: "Kreatinin > 2.0 mg/dL (2p)", points: 2 },
      { key: "cardiac_arrest", label: "Kardiyak arrest (3p)", points: 3 },
      { key: "st_dev", label: "ST deviasyonu (2p)", points: 2 },
      { key: "trop_pos", label: "Pozitif troponin (2p)", points: 2 },
    ],
    interpret: (s) => {
      if (s <= 4)
        return {
          risk: "Düşük Risk",
          color: "text-[var(--color-success)]",
          action: "Erken taburcu düşünülebilir",
        };
      if (s <= 7)
        return {
          risk: "Orta Risk",
          color: "text-[var(--color-warning)]",
          action: "Kardiyoloji konsültasyonu",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Erken invazif strateji",
      };
    },
  },
  {
    id: "cha2ds2",
    title: "CHA₂DS₂-VASc Skoru",
    purpose: "AF inme riski (genişletilmiş)",
    criteria: [
      {
        key: "chf",
        label: "Kalp yetmezliği / LV disfonksiyon (1p)",
        points: 1,
      },
      { key: "htn", label: "Hipertansiyon (1p)", points: 1 },
      { key: "age75", label: "Yaş ≥ 75 (2p)", points: 2 },
      { key: "dm", label: "Diyabetes mellitus (1p)", points: 1 },
      { key: "stroke", label: "İnme / TIA / TE öyküsü (2p)", points: 2 },
      { key: "vascular", label: "Vasküler hastalık (1p)", points: 1 },
      { key: "age6574", label: "Yaş 65-74 (1p)", points: 1 },
      { key: "female", label: "Kadın cinsiyet (1p)", points: 1 },
    ],
    interpret: (s) => {
      if (s === 0)
        return {
          risk: "Düşük Risk",
          color: "text-[var(--color-success)]",
          action: "Antikoagülan gerekmez",
        };
      if (s === 1)
        return {
          risk: "Orta Risk (Kadın hariç)",
          color: "text-[var(--color-warning)]",
          action: "Bireysel karar",
        };
      return {
        risk: "Yüksek Risk",
        color: "text-[var(--color-destructive)]",
        action: "Oral antikoagülan önerilir",
      };
    },
  },
];

export default function ScoresPage() {
  const [selected, setSelected] = useState<ScoreId>("heart");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function selectScore(id: ScoreId) {
    setSelected(id);
    setChecked({});
  }

  const current = scores.find((s) => s.id === selected)!;
  const total = current.criteria
    .filter((c) => checked[c.key])
    .reduce((sum, c) => sum + c.points, 0);
  const interpretation = current.interpret(total);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center">
          <Activity size={20} className="text-[var(--color-success)]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Skor Hesaplayıcılar
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Kanıta dayalı klinik karar destek skorları
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <Card variant="bordered" className="p-3">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2 px-2">
              Skorlar
            </p>
            <div className="space-y-0.5">
              {scores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectScore(s.id)}
                  className={[
                    "w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex items-center justify-between group",
                    selected === s.id
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] border-l-2 border-transparent",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs opacity-70">{s.purpose}</p>
                  </div>
                  <ChevronRight
                    size={12}
                    className="shrink-0 opacity-40 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card variant="elevated" className="p-6">
            <CardTitle className="mb-1">{current.title}</CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              {current.purpose}
            </p>

            <div className="space-y-2 mb-5">
              {current.criteria.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[c.key]}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [c.key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[var(--color-primary)] rounded"
                  />
                  <span className="text-sm text-[var(--color-text-primary)] flex-1">
                    {c.label}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-primary)] shrink-0">
                    {c.points > 0 ? `+${c.points}` : c.points}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Toplam Skor
              </p>
              <p className="text-4xl font-bold text-[var(--color-primary)]">
                {total}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border ${total === 0 ? "border-[var(--color-border)] bg-[var(--color-surface)]" : "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5"}`}
            >
              <p className={`text-lg font-bold ${interpretation.color}`}>
                {interpretation.risk}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {interpretation.action}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChecked({})}
              className="mt-3 w-full"
            >
              Sıfırla
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
