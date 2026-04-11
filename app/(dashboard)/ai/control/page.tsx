"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Cpu,
  Globe,
  AlignLeft,
  Stethoscope,
  Eye,
  CheckCircle2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

const PREFS_KEY = "medasi_ai_prefs_v1";

interface AIPrefs {
  model: "FAST" | "EFFICIENT";
  language: "tr" | "en" | "auto";
  responseLength: "short" | "medium" | "long";
  clinicalTerminology: boolean;
  showReferences: boolean;
  addDisclaimer: boolean;
}

const defaultPrefs: AIPrefs = {
  model: "EFFICIENT",
  language: "tr",
  responseLength: "medium",
  clinicalTerminology: true,
  showReferences: true,
  addDisclaimer: true,
};

function readPrefsFromStorage(): AIPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<AIPrefs>) };
  } catch {
    return null;
  }
}

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 relative shrink-0 ${enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform duration-200 absolute top-0 ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </div>
  );
}

function buildSystemPrompt(prefs: AIPrefs): string {
  const langMap = {
    tr: "Türkçe",
    en: "İngilizce",
    auto: "kullanıcı diline göre otomatik",
  };
  const lenMap = {
    short: "kısa ve öz (1-2 paragraf)",
    medium: "orta uzunlukta (3-4 paragraf)",
    long: "kapsamlı ve detaylı (5+ paragraf)",
  };

  const lines: string[] = [];
  lines.push(
    `Sen MEDASI adlı tıp eğitim platformunun merkezi AI çekirdeğinde çalışan ${prefs.model === "FAST" ? "FAST (gemini-2.5-pro)" : "EFFICIENT (gemini-2.5-flash)"} asistanısın.`,
  );
  lines.push(`Yanıtlarını ${langMap[prefs.language]} olarak ver.`);
  lines.push(`Yanıt uzunluğu: ${lenMap[prefs.responseLength]}.`);
  if (prefs.clinicalTerminology)
    lines.push("Klinik terminoloji ve tıbbi terimler kullan.");
  if (prefs.showReferences)
    lines.push("Mümkün olduğunda kaynak ve referanslara atıfta bulun.");
  if (prefs.addDisclaimer)
    lines.push(
      'Her yanıtın sonuna "Bu bilgi tıbbi tavsiye değildir, bir sağlık uzmanına danışın." uyarısını ekle.',
    );

  return lines.join("\n");
}

export default function AIControlPage() {
  const [prefs, setPrefs] = useState<AIPrefs>(defaultPrefs);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sayfa açıldığında DB'den yükle, localStorage cache olarak kullan
  useEffect(() => {
    fetch("/api/ai/prefs")
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) {
          setPrefs({ ...defaultPrefs, ...d.prefs });
          localStorage.setItem(PREFS_KEY, JSON.stringify({ ...defaultPrefs, ...d.prefs }));
        } else {
          const cached = readPrefsFromStorage();
          if (cached) setPrefs(cached);
        }
      })
      .catch(() => {
        const cached = readPrefsFromStorage();
        if (cached) setPrefs(cached);
      });
  }, []);

  const autoSave = useCallback((updated: AIPrefs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
        const response = await fetch("/api/ai/prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });

        if (!response.ok) {
          throw new Error("Kaydetme isteği başarısız.");
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setSaved(false);
        toast.error("Kayıt hatası");
      }
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function update<K extends keyof AIPrefs>(key: K, value: AIPrefs[K]) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaved(false);
    autoSave(updated);
  }

  const segmentBase =
    "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all text-center cursor-pointer border";
  const segmentActive = `${segmentBase} border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]`;
  const segmentInactive = `${segmentBase} border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            AI Kontrol Paneli
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Merkezi AI çekirdeği için model ve cevap tercihlerini özelleştirin
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 text-sm transition-all ${saved ? "text-[var(--color-success)]" : "text-transparent"}`}
        >
          <CheckCircle2 size={14} />
          Kaydedildi
        </div>
      </div>

      {/* Varsayılan Model */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu size={18} className="text-[var(--color-primary)]" />
            Varsayılan Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => update("model", "FAST")}
              className={[
                "p-4 rounded-lg border text-left transition-all",
                prefs.model === "FAST"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-secondary)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <Zap size={18} className="text-[var(--color-primary)]" />
                {prefs.model === "FAST" && (
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                FAST
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Hızlı & Güçlü
              </p>
              <Badge variant="secondary" className="text-xs mt-2">
                gemini-2.5-pro
              </Badge>
            </button>

            <button
              onClick={() => update("model", "EFFICIENT")}
              className={[
                "p-4 rounded-lg border text-left transition-all",
                prefs.model === "EFFICIENT"
                  ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-secondary)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <Zap size={18} style={{ color: "var(--color-warning)" }} />
                {prefs.model === "EFFICIENT" && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--color-warning)" }}
                  />
                )}
              </div>
              <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                EFFICIENT
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Ekonomik
              </p>
              <Badge variant="secondary" className="text-xs mt-2">
                gemini-2.5-flash
              </Badge>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Yanıt Dili */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={18} className="text-[var(--color-primary)]" />
            Yanıt Dili
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "tr" as const, label: "🇹🇷 Türkçe" },
              { value: "en" as const, label: "🇬🇧 İngilizce" },
              { value: "auto" as const, label: "🌐 Otomatik" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => update("language", opt.value)}
                className={
                  prefs.language === opt.value ? segmentActive : segmentInactive
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Yanıt Uzunluğu */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlignLeft size={18} className="text-[var(--color-primary)]" />
            Yanıt Uzunluğu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "short" as const, label: "Kısa" },
              { value: "medium" as const, label: "Orta" },
              { value: "long" as const, label: "Uzun" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => update("responseLength", opt.value)}
                className={
                  prefs.responseLength === opt.value
                    ? segmentActive
                    : segmentInactive
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-3">
            {prefs.responseLength === "short" &&
              "Kısa yanıtlar hızlı referans için idealdir (1-2 paragraf)."}
            {prefs.responseLength === "medium" &&
              "Orta uzunlukta yanıtlar denge sağlar (3-4 paragraf)."}
            {prefs.responseLength === "long" &&
              "Kapsamlı yanıtlar detaylı inceleme için uygundur (5+ paragraf)."}
          </p>
        </CardContent>
      </Card>

      {/* Tıbbi Bağlam */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope size={18} className="text-[var(--color-primary)]" />
            Tıbbi Bağlam
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Klinik terminoloji kullan
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Yanıtlarda tıbbi terimler ve klinik jargon kullan
                </p>
              </div>
              <Toggle
                enabled={prefs.clinicalTerminology}
                onToggle={() =>
                  update("clinicalTerminology", !prefs.clinicalTerminology)
                }
              />
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Referansları göster
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Kaynak ve literatür referanslarına atıfta bulun
                </p>
              </div>
              <Toggle
                enabled={prefs.showReferences}
                onToggle={() => update("showReferences", !prefs.showReferences)}
              />
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Uyarı ekle (tıbbi tavsiye değil)
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Her yanıtın sonuna sorumluluk uyarısı ekle
                </p>
              </div>
              <Toggle
                enabled={prefs.addDisclaimer}
                onToggle={() => update("addDisclaimer", !prefs.addDisclaimer)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistem Prompt Önizleme */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye size={18} className="text-[var(--color-primary)]" />
            Sistem Prompt Önizleme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            Mevcut tercihlerinize göre oluşturulan sistem talimatı:
          </p>
          <pre className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] rounded-lg p-4 whitespace-pre-wrap font-mono border border-[var(--color-border)] leading-relaxed">
            {buildSystemPrompt(prefs)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
