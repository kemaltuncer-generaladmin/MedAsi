"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Sparkles,
  Brain,
  Loader2,
  Tags,
  Bookmark,
  Copy,
  ListChecks,
  Layers,
  CheckSquare,
  Square,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

interface Material {
  id: string;
  name: string;
  status: string;
  file_type?: string;
  created_at?: string;
}

export default function AiNotlarPage() {
  const [loading, setLoading] = useState(false);
  const [rawNote, setRawNote] = useState("");
  const [processedNote, setProcessedNote] = useState<any>(null);
  const [subject, setSubject] = useState<string | null>(null);

  // Materyal seçici state
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [topicInput, setTopicInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setMaterialsLoading(true);
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      const ready = (data.materials ?? []).filter(
        (m: Material) => m.status === "ready"
      );
      setMaterials(ready);
    } catch {
      toast.error("Materyaller yüklenemedi");
    } finally {
      setMaterialsLoading(false);
    }
  }

  function toggleMaterial(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAiNote() {
    if (selectedIds.size === 0) {
      toast.error("Lütfen en az bir materyal seçin");
      return;
    }
    if (!topicInput.trim()) {
      toast.error("Lütfen bir konu başlığı girin");
      return;
    }
    setAiLoading(true);
    setAiResult("");
    const loadingId = toast.loading("AI notu oluşturuluyor...");
    try {
      const selectedNames = materials
        .filter((m) => selectedIds.has(m.id))
        .map((m) => m.name)
        .join(", ");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${topicInput} konusunda yüklediğim materyallere dayanarak kapsamlı bir ders notu oluştur. Seçili materyaller: ${selectedNames}`,
          model: "EFFICIENT",
          module: "source-ai-notlar",
        }),
      });
      const data = await res.json();
      const text = data?.response?.text ?? data?.text ?? "";
      setAiResult(text);
      toast.success("Not oluşturuldu!", { id: loadingId });
    } catch {
      toast.error("AI notu oluşturulamadı", { id: loadingId });
    } finally {
      setAiLoading(false);
    }
  }

  function copyAiResult() {
    navigator.clipboard.writeText(aiResult);
    toast.success("Kopyalandı!");
  }

  function downloadAiResult() {
    const blob = new Blob([aiResult], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topicInput.replace(/\s+/g, "_") || "ai-not"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("İndirildi!");
  }

  async function processNote() {
    if (rawNote.length < 20) {
      toast.error("Analiz için çok kısa bir not girdiniz.");
      return;
    }
    setLoading(true);
    setProcessedNote(null);
    const loadingId = toast.loading("Notlar branş bazlı analiz ediliyor...");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawNote,
          model: "EFFICIENT",
          module: "source-ai-notlar",
        }),
      });

      const data = await res.json();
      const text = data?.response?.text ?? data?.text ?? "";

      const subjectMatch = text.match(/BRANŞ:\s*([^\n]+)/i);
      if (subjectMatch) setSubject(subjectMatch[1].trim());

      setProcessedNote(text);
      toast.success("Notlar yapılandırıldı!", { id: loadingId });
    } catch (e) {
      toast.error("Notlar işlenemedi.", { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/10 flex items-center justify-center border border-[var(--color-secondary)]/20">
            <FileText size={20} className="text-[var(--color-secondary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Notlar</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Ham notlarını yapılandırılmış klinik verilere dönüştür
            </p>
          </div>
        </div>
      </div>

      {/* Materyal Seçici + AI Not Oluşturma */}
      <Card variant="bordered" className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-secondary)]" />
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">
            Materyallerden AI Not Oluştur
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Materyal Listesi */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Materyaller{" "}
              {selectedIds.size > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--color-secondary)]/20 text-[var(--color-secondary)] text-[10px] font-bold">
                  {selectedIds.size} seçildi
                </span>
              )}
            </label>
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden max-h-52 overflow-y-auto">
              {materialsLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 size={14} className="animate-spin" />
                  Materyaller yükleniyor...
                </div>
              ) : materials.length === 0 ? (
                <p className="p-4 text-sm text-[var(--color-text-secondary)]">
                  Hazır materyal bulunamadı. Önce materyal yükleyin.
                </p>
              ) : (
                materials.map((m) => {
                  const selected = selectedIds.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMaterial(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors border-b border-[var(--color-border)] last:border-b-0 ${selected ? "bg-[var(--color-secondary)]/10 text-[var(--color-text-primary)]" : "hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]"}`}
                    >
                      {selected ? (
                        <CheckSquare
                          size={14}
                          className="text-[var(--color-secondary)] shrink-0"
                        />
                      ) : (
                        <Square size={14} className="shrink-0" />
                      )}
                      <span className="line-clamp-1">{m.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Konu + Buton */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5 block">
                Konu Başlığı
              </label>
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="örn: Kalp yetmezliği, Pnömoni, Diyabet..."
                className={inputCls}
              />
            </div>
            <Button
              onClick={handleAiNote}
              disabled={aiLoading || selectedIds.size === 0 || !topicInput.trim()}
              className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90"
            >
              {aiLoading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
              AI Notu Oluştur
            </Button>
            {selectedIds.size > 0 && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                {selectedIds.size} materyal seçildi:{" "}
                {materials
                  .filter((m) => selectedIds.has(m.id))
                  .map((m) => m.name)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* AI Sonucu */}
        {aiResult && (
          <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Oluşturulan Not
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="xs" onClick={copyAiResult}>
                  <Copy size={12} />
                  Kopyala
                </Button>
                <Button variant="ghost" size="xs" onClick={downloadAiResult}>
                  <Download size={12} />
                  İndir
                </Button>
              </div>
            </div>
            <textarea
              readOnly
              value={aiResult}
              rows={10}
              className={`${inputCls} resize-none`}
            />
          </div>
        )}
      </Card>

      {/* Mevcut Ham Not Analizi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon: Giriş Alanı */}
        <div className="space-y-4">
          <Card
            variant="bordered"
            className="p-0 overflow-hidden h-[500px] flex flex-col"
          >
            <div className="px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center gap-2">
              <Bookmark
                size={14}
                className="text-[var(--color-text-secondary)]"
              />
              <span className="text-xs font-bold uppercase tracking-wider">
                Ham Ders Notları / Klinik Gözlemler
              </span>
            </div>
            <textarea
              className="flex-1 p-6 bg-transparent resize-none focus:outline-none text-sm leading-relaxed text-[var(--color-text-primary)]"
              placeholder="Ders notlarını, hasta öykülerini veya karmaşık tıbbi metinleri buraya yapıştır..."
              value={rawNote}
              onChange={(e) => setRawNote(e.target.value)}
            />
            <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)]">
              <Button
                onClick={processNote}
                disabled={loading || rawNote.length < 20}
                className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Sparkles size={16} className="mr-2" />
                )}
                Analiz Et ve Yapılandır
              </Button>
            </div>
          </Card>
        </div>

        {/* Sağ Kolon: Çıktı Alanı */}
        <div className="space-y-4">
          {!processedNote && !loading ? (
            <Card
              variant="elevated"
              className="h-[500px] flex flex-col items-center justify-center text-center p-12 border-dashed border-2"
            >
              <Brain
                size={48}
                className="text-[var(--color-text-disabled)] mb-4"
              />
              <p className="text-[var(--color-text-secondary)] text-sm">
                Soldaki alana notlarını girip "Analiz Et" butonuna bastığında,
                burada özetler, anahtar kavramlar ve flashcard önerileri
                belirecek.
              </p>
            </Card>
          ) : (
            <Card
              variant="bordered"
              className="p-0 overflow-hidden h-[500px] flex flex-col"
            >
              <div className="px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks
                    size={14}
                    className="text-[var(--color-success)]"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Yapılandırılmış Zeka
                  </span>
                  {subject && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {subject}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      navigator.clipboard.writeText(processedNote ?? "");
                      toast.success("Not kopyalandı!");
                    }}
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto bg-[var(--color-background)]">
                {loading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-[var(--color-surface)] rounded w-3/4"></div>
                    <div className="h-4 bg-[var(--color-surface)] rounded w-full"></div>
                    <div className="h-4 bg-[var(--color-surface)] rounded w-5/6"></div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    {processedNote}
                  </div>
                )}
              </div>
              <div className="p-4 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() =>
                    (window.location.href = "/dashboard/flashcards/flashcard")
                  }
                >
                  <Layers size={14} className="mr-2" /> Flashcard'lara Dönüştür
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/5 p-4 flex gap-3">
        <Tags size={20} className="text-[var(--color-secondary)] shrink-0" />
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
          <strong>İpucu:</strong> Notlarını yapılandırdıktan sonra
          "Flashcard'lara Dönüştür" butonuna basarak, AI Notlar'daki verilerin
          doğrudan Flashcard AI modülüne aktarılmasını sağlayabilirsin. Bu,{" "}
          <strong>Grup C'den Grup B'ye</strong> veri akışını temsil eder.
        </p>
      </div>
    </div>
  );
}
