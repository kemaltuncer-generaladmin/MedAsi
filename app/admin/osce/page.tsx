"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Edit3,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";

/* ─── Types ─── */

interface OsceCasePayload {
  specialty: string;
  difficulty: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    vitals: { bp: string; hr: string; rr: string; temp: string; spo2: string };
  };
  chiefComplaint: string;
  hiddenDiagnosis: string;
  anamnesis: Record<string, string>;
  physicalExam: Record<string, string>;
  labs: Record<string, string>;
  criticalActions: string[];
  traps: string[];
}

interface ScenarioRow {
  id: string;
  status: string;
  specialty: string;
  difficulty: string;
  casePayload: OsceCasePayload | null;
  anonymizedFields: unknown;
  createdAt: string;
}

/* ─── Constants ─── */

const SPECIALTIES = [
  "Dahiliye",
  "Pediatri",
  "Genel Cerrahi",
  "Kadın Doğum",
  "Küçük Stajlar",
  "Acil Tıp",
];

const DIFFICULTIES = ["kolay", "orta", "zor"] as const;

const EMPTY_CASE: OsceCasePayload = {
  specialty: "Dahiliye",
  difficulty: "orta",
  patient: {
    name: "",
    age: 45,
    gender: "Erkek",
    occupation: "",
    vitals: { bp: "120/80", hr: "78", rr: "18", temp: "36.6", spo2: "98%" },
  },
  chiefComplaint: "",
  hiddenDiagnosis: "",
  anamnesis: {
    onset: "",
    duration: "",
    character: "",
    radiation: "",
    aggravating: "",
    relieving: "",
    associated: "",
    pmh: "",
    fh: "",
    meds: "",
    allergies: "",
    social: "",
  },
  physicalExam: {
    general: "",
    cvs: "",
    resp: "",
    abdomen: "",
    neuro: "",
    skin: "",
    specific: "",
  },
  labs: {
    CBC: "",
    BMP: "",
    LFT: "",
    troponin: "",
    CRP: "",
    lipase: "",
    ECG: "",
    CXR: "",
    USG: "",
    CT: "",
    UA: "",
    ABG: "",
  },
  criticalActions: [""],
  traps: [""],
};

const ANAMNESIS_LABELS: Record<string, string> = {
  onset: "Başlangıç",
  duration: "Süre",
  character: "Karakter",
  radiation: "Yayılım",
  aggravating: "Artıran Faktörler",
  relieving: "Azaltan Faktörler",
  associated: "Eşlik Eden Semptomlar",
  pmh: "Özgeçmiş",
  fh: "Soygeçmiş",
  meds: "Kullandığı İlaçlar",
  allergies: "Alerjiler",
  social: "Sosyal Öykü",
};

const EXAM_LABELS: Record<string, string> = {
  general: "Genel Görünüm",
  cvs: "Kardiyovasküler",
  resp: "Solunum",
  abdomen: "Batın",
  neuro: "Nörolojik",
  skin: "Cilt",
  specific: "Spesifik Bulgular",
};

const LAB_LABELS: Record<string, string> = {
  CBC: "Tam Kan Sayımı",
  BMP: "Biyokimya (BUN/Cr/Elektrolit)",
  LFT: "Karaciğer Fonksiyon",
  troponin: "Troponin",
  CRP: "CRP / Sedimantasyon",
  lipase: "Lipaz / Amilaz",
  ECG: "EKG",
  CXR: "Akciğer Grafisi",
  USG: "USG",
  CT: "BT",
  UA: "İdrar Tahlili",
  ABG: "Kan Gazı",
};

/* ─── Helpers ─── */

function validateCase(c: OsceCasePayload): string | null {
  if (!c.patient.name.trim()) return "Hasta adı boş olamaz";
  if (!c.chiefComplaint.trim()) return "Baş şikayet boş olamaz";
  if (!c.hiddenDiagnosis.trim()) return "Gizli tanı boş olamaz";
  if (!c.specialty) return "Uzmanlık alanı seçilmeli";
  if (c.patient.age < 0 || c.patient.age > 120) return "Geçersiz yaş";

  const filledAnamnesis = Object.values(c.anamnesis).filter((v) => v.trim()).length;
  if (filledAnamnesis < 4) return "En az 4 anamnez alanı doldurulmalı";

  const filledExam = Object.values(c.physicalExam).filter((v) => v.trim()).length;
  if (filledExam < 3) return "En az 3 muayene bulgusu doldurulmalı";

  const filledLabs = Object.values(c.labs).filter((v) => v.trim()).length;
  if (filledLabs < 3) return "En az 3 laboratuvar sonucu doldurulmalı";

  const actions = c.criticalActions.filter((a) => a.trim());
  if (actions.length === 0) return "En az 1 kritik aksiyon girilmeli";

  return null;
}

/* ─── Main Component ─── */

export default function AdminOsceScenarioPage() {
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"approved" | "pending" | "rejected">("approved");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonInput, setJsonInput] = useState("");

  const [formData, setFormData] = useState<OsceCasePayload>(structuredClone(EMPTY_CASE));

  /* ─── Fetch ─── */

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (specialtyFilter) params.set("specialty", specialtyFilter);
      const res = await fetch(`/api/admin/osce/scenarios?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yüklenemedi");
      setScenarios(data.scenarios || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Senaryolar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, specialtyFilter]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  /* ─── Handlers ─── */

  function openNewEditor() {
    setFormData(structuredClone(EMPTY_CASE));
    setEditingId(null);
    setShowEditor(true);
    setShowJsonImport(false);
  }

  function openEditEditor(row: ScenarioRow) {
    if (!row.casePayload) return;
    setFormData(structuredClone(row.casePayload));
    setEditingId(row.id);
    setShowEditor(true);
    setShowJsonImport(false);
  }

  function handleJsonImport() {
    try {
      const parsed = JSON.parse(jsonInput) as OsceCasePayload;
      if (!parsed.patient || !parsed.chiefComplaint) {
        throw new Error("Geçersiz format");
      }
      setFormData({
        ...structuredClone(EMPTY_CASE),
        ...parsed,
        patient: { ...EMPTY_CASE.patient, ...parsed.patient, vitals: { ...EMPTY_CASE.patient.vitals, ...(parsed.patient?.vitals || {}) } },
        anamnesis: { ...EMPTY_CASE.anamnesis, ...(parsed.anamnesis || {}) },
        physicalExam: { ...EMPTY_CASE.physicalExam, ...(parsed.physicalExam || {}) },
        labs: { ...EMPTY_CASE.labs, ...(parsed.labs || {}) },
        criticalActions: parsed.criticalActions?.length ? parsed.criticalActions : [""],
        traps: parsed.traps?.length ? parsed.traps : [""],
      });
      setShowJsonImport(false);
      toast.success("JSON başarıyla içe aktarıldı");
    } catch {
      toast.error("Geçersiz JSON formatı");
    }
  }

  function copyAsJson(row: ScenarioRow) {
    if (!row.casePayload) return;
    navigator.clipboard.writeText(JSON.stringify(row.casePayload, null, 2));
    toast.success("JSON panoya kopyalandı");
  }

  async function saveScenario() {
    const error = validateCase(formData);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const cleanedData = {
        ...formData,
        criticalActions: formData.criticalActions.filter((a) => a.trim()),
        traps: formData.traps.filter((t) => t.trim()),
      };

      const res = await fetch("/api/admin/osce/scenarios", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { scenarioId: editingId, decision: "approved", casePayload: cleanedData }
            : { casePayload: cleanedData, status: "approved" },
        ),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt başarısız");

      toast.success(editingId ? "Senaryo güncellendi" : "Senaryo havuza eklendi");
      setShowEditor(false);
      setEditingId(null);
      fetchScenarios();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function applyDecision(scenarioId: string, decision: "approved" | "rejected") {
    try {
      const res = await fetch("/api/admin/osce/scenarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      toast.success(decision === "approved" ? "Senaryo onaylandı" : "Senaryo reddedildi");
      fetchScenarios();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    }
  }

  async function deleteScenario(scenarioId: string) {
    if (!confirm("Bu senaryoyu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch("/api/admin/osce/scenarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Silme başarısız");
      toast.success("Senaryo silindi");
      fetchScenarios();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Silme başarısız");
    }
  }

  /* ─── Form field helpers ─── */

  function updateFormField(path: string, value: string | number) {
    setFormData((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function updateArrayItem(field: "criticalActions" | "traps", index: number, value: string) {
    setFormData((prev) => {
      const next = structuredClone(prev);
      next[field][index] = value;
      return next;
    });
  }

  function addArrayItem(field: "criticalActions" | "traps") {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  }

  function removeArrayItem(field: "criticalActions" | "traps", index: number) {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  /* ─── Filtered list ─── */

  const filteredScenarios = scenarios.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const payload = s.casePayload;
    return (
      s.specialty.toLowerCase().includes(q) ||
      (payload?.chiefComplaint || "").toLowerCase().includes(q) ||
      (payload?.hiddenDiagnosis || "").toLowerCase().includes(q) ||
      (payload?.patient?.name || "").toLowerCase().includes(q)
    );
  });

  const approvedCount = statusFilter === "approved" ? filteredScenarios.length : 0;

  /* ─── Editor Panel ─── */

  if (showEditor) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{editingId ? "Senaryoyu Düzenle" : "Yeni OSCE İstasyonu Ekle"}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Tüm alanları doldurun. Hasta, sınav sırasında bu verilere göre yanıt verecek.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setShowEditor(false)}>
            <X size={16} className="mr-1" /> Kapat
          </Button>
        </div>

        {/* JSON Import Toggle */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowJsonImport(!showJsonImport)}>
            <ClipboardList size={14} className="mr-1.5" />
            {showJsonImport ? "Formu Göster" : "JSON ile İçe Aktar"}
          </Button>
          {!showJsonImport && (
            <Button variant="ghost" size="sm" onClick={() => {
              const json = JSON.stringify(formData, null, 2);
              navigator.clipboard.writeText(json);
              toast.success("Mevcut form JSON olarak kopyalandı");
            }}>
              <Copy size={14} className="mr-1.5" />
              Formu JSON Olarak Kopyala
            </Button>
          )}
        </div>

        {showJsonImport ? (
          <Card variant="bordered" className="p-5 space-y-4">
            <p className="text-sm font-semibold">JSON Yapıştır</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Vaka JSON&apos;ını yapıştırın. Format: {`{ "specialty", "difficulty", "patient", "chiefComplaint", "hiddenDiagnosis", "anamnesis", "physicalExam", "labs", "criticalActions", "traps" }`}
            </p>
            <textarea
              className="w-full h-64 p-3 rounded-xl text-xs font-mono leading-relaxed resize-none"
              style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{ "specialty": "Dahiliye", ... }'
            />
            <Button onClick={handleJsonImport} disabled={!jsonInput.trim()}>
              <Check size={14} className="mr-1.5" /> İçe Aktar ve Forma Doldur
            </Button>
          </Card>
        ) : (
          <>
            {/* Section: Temel Bilgiler */}
            <Card variant="bordered" className="p-5 space-y-4">
              <p className="text-sm font-bold flex items-center gap-2">
                <Stethoscope size={14} className="text-[var(--color-primary)]" />
                Temel Bilgiler
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Uzmanlık Alanı *</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.specialty}
                    onChange={(e) => updateFormField("specialty", e.target.value)}
                  >
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Zorluk *</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.difficulty}
                    onChange={(e) => updateFormField("difficulty", e.target.value)}
                  >
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Baş Şikayet *</label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                  value={formData.chiefComplaint}
                  onChange={(e) => updateFormField("chiefComplaint", e.target.value)}
                  placeholder="Örn: Göğüs ağrısı ve nefes darlığı"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Gizli Tanı (Doğru Tanı) *</label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                  value={formData.hiddenDiagnosis}
                  onChange={(e) => updateFormField("hiddenDiagnosis", e.target.value)}
                  placeholder="Örn: Akut koroner sendrom"
                />
              </div>
            </Card>

            {/* Section: Hasta Bilgileri */}
            <Card variant="bordered" className="p-5 space-y-4">
              <p className="text-sm font-bold">Hasta Bilgileri</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Ad *</label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.patient.name}
                    onChange={(e) => updateFormField("patient.name", e.target.value)}
                    placeholder="A. Yılmaz" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Yaş</label>
                  <input type="number" className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.patient.age}
                    onChange={(e) => updateFormField("patient.age", parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Cinsiyet</label>
                  <select className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.patient.gender}
                    onChange={(e) => updateFormField("patient.gender", e.target.value)}>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Meslek</label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                    value={formData.patient.occupation}
                    onChange={(e) => updateFormField("patient.occupation", e.target.value)}
                    placeholder="Memur" />
                </div>
              </div>

              <p className="text-xs font-semibold mt-2">Vital Bulgular</p>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { key: "bp", label: "TA", ph: "120/80" },
                  { key: "hr", label: "Nabız", ph: "78" },
                  { key: "rr", label: "SS", ph: "18" },
                  { key: "temp", label: "Ateş", ph: "36.6" },
                  { key: "spo2", label: "SpO2", ph: "98%" },
                ].map((v) => (
                  <div key={v.key}>
                    <label className="text-[10px] font-semibold mb-1 block text-[var(--color-text-muted)]">{v.label}</label>
                    <input className="w-full px-2 py-1.5 rounded-lg text-xs text-center"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={formData.patient.vitals[v.key as keyof typeof formData.patient.vitals]}
                      onChange={(e) => updateFormField(`patient.vitals.${v.key}`, e.target.value)}
                      placeholder={v.ph} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Section: Anamnez */}
            <Card variant="bordered" className="p-5 space-y-3">
              <p className="text-sm font-bold">Anamnez Verileri (Hasta Yanıtları)</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Hasta bu bilgileri öğrenci sorduğunda paylaşacak.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ANAMNESIS_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold mb-1 block">{label}</label>
                    <input className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={formData.anamnesis[key] || ""}
                      onChange={(e) => updateFormField(`anamnesis.${key}`, e.target.value)}
                      placeholder={`${label} bilgisi...`} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Section: Fizik Muayene */}
            <Card variant="bordered" className="p-5 space-y-3">
              <p className="text-sm font-bold">Fizik Muayene Bulguları</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(EXAM_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold mb-1 block">{label}</label>
                    <input className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={formData.physicalExam[key] || ""}
                      onChange={(e) => updateFormField(`physicalExam.${key}`, e.target.value)}
                      placeholder={`${label} bulgusu...`} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Section: Lab */}
            <Card variant="bordered" className="p-5 space-y-3">
              <p className="text-sm font-bold">Laboratuvar & Görüntüleme Sonuçları</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(LAB_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold mb-1 block">{label}</label>
                    <input className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={formData.labs[key] || ""}
                      onChange={(e) => updateFormField(`labs.${key}`, e.target.value)}
                      placeholder={`${label} sonucu...`} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Section: Kritik Aksiyonlar & Tuzaklar */}
            <Card variant="bordered" className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold mb-2">Kritik Aksiyonlar *</p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">Öğrencinin yapması gereken kritik adımlar.</p>
                {formData.criticalActions.map((action, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={action}
                      onChange={(e) => updateArrayItem("criticalActions", i, e.target.value)}
                      placeholder={`Kritik aksiyon ${i + 1}`} />
                    {formData.criticalActions.length > 1 && (
                      <button onClick={() => removeArrayItem("criticalActions", i)} className="p-2 text-[var(--color-destructive)]">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addArrayItem("criticalActions")}>
                  <Plus size={12} className="mr-1" /> Ekle
                </Button>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">Tuzaklar</p>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">Öğrencinin düşebileceği hatalar.</p>
                {formData.traps.map((trap, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
                      value={trap}
                      onChange={(e) => updateArrayItem("traps", i, e.target.value)}
                      placeholder={`Tuzak ${i + 1}`} />
                    {formData.traps.length > 1 && (
                      <button onClick={() => removeArrayItem("traps", i)} className="p-2 text-[var(--color-destructive)]">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addArrayItem("traps")}>
                  <Plus size={12} className="mr-1" /> Ekle
                </Button>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowEditor(false)} className="flex-1">
                İptal
              </Button>
              <Button onClick={saveScenario} disabled={saving} className="flex-[2]">
                {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Check size={14} className="mr-2" />}
                {editingId ? "Güncelle" : "Havuza Ekle (Onaylı)"}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ─── Main List View ─── */

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OSCE İstasyon Havuzu</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Kullanıcılara sunulan OSCE istasyonlarını yönetin. Onaylı senaryolar sınav havuzunda aktiftir.
          </p>
        </div>
        <Button onClick={openNewEditor}>
          <Plus size={16} className="mr-1.5" />
          Yeni İstasyon Ekle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {(["approved", "pending", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={
                statusFilter === s
                  ? { background: "var(--color-primary)", color: "#fff" }
                  : { color: "var(--color-text-secondary)" }
              }
            >
              {s === "approved" ? "Onaylı" : s === "pending" ? "Bekleyen" : "Reddedilen"}
            </button>
          ))}
        </div>

        <select
          className="px-3 py-2 rounded-lg text-xs"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
        >
          <option value="">Tüm Uzmanlıklar</option>
          {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Şikayet, tanı veya hasta adı ile ara..."
          />
        </div>
      </div>

      {/* Stats */}
      {statusFilter === "approved" && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <ClipboardList size={13} className="text-[var(--color-primary)]" />
          Havuzda <span className="font-bold text-[var(--color-text-primary)]">{approvedCount}</span> onaylı istasyon mevcut
          {specialtyFilter && <> • <span className="font-semibold">{specialtyFilter}</span> filtresi aktif</>}
        </div>
      )}

      {/* List */}
      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">Yükleniyor...</p>
        </Card>
      ) : filteredScenarios.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle size={20} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {searchQuery ? "Arama sonucu bulunamadı." : "Bu filtrede kayıt yok."}
          </p>
          {statusFilter === "approved" && !searchQuery && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={openNewEditor}>
              <Plus size={14} className="mr-1" /> İlk istasyonu ekle
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredScenarios.map((row) => {
            const payload = row.casePayload;
            const isExpanded = expandedId === row.id;
            return (
              <Card key={row.id} variant="bordered" className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={
                          row.difficulty === "kolay"
                            ? { background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)" }
                            : row.difficulty === "zor"
                              ? { background: "color-mix(in srgb, var(--color-destructive) 15%, transparent)", color: "var(--color-destructive)" }
                              : { background: "color-mix(in srgb, var(--color-warning) 15%, transparent)", color: "var(--color-warning)" }
                        }>
                        {row.difficulty}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-primary)]">{row.specialty}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{payload?.chiefComplaint || "—"}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      Tanı: {payload?.hiddenDiagnosis || "—"} • Hasta: {payload?.patient?.name || "—"}, {payload?.patient?.age || "?"}y
                    </p>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleDateString("tr-TR")}
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
                </button>

                {isExpanded && payload && (
                  <div className="px-5 pb-4 border-t border-[var(--color-border)] pt-4 space-y-3">
                    {/* Patient Details */}
                    <div className="grid grid-cols-5 gap-3 text-center p-3 rounded-lg" style={{ background: "var(--color-surface)" }}>
                      {[
                        { label: "TA", val: payload.patient.vitals.bp },
                        { label: "Nabız", val: payload.patient.vitals.hr },
                        { label: "SS", val: payload.patient.vitals.rr },
                        { label: "Ateş", val: payload.patient.vitals.temp },
                        { label: "SpO2", val: payload.patient.vitals.spo2 },
                      ].map((v) => (
                        <div key={v.label}>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{v.label}</p>
                          <p className="text-xs font-bold">{v.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Anamnesis summary */}
                    <div>
                      <p className="text-xs font-bold mb-1">Anamnez</p>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {Object.entries(payload.anamnesis || {})
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${ANAMNESIS_LABELS[k] || k}: ${v}`)
                          .join(" • ")}
                      </p>
                    </div>

                    {/* Critical Actions */}
                    <div>
                      <p className="text-xs font-bold mb-1">Kritik Aksiyonlar</p>
                      <div className="flex flex-wrap gap-1">
                        {(payload.criticalActions || []).map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Traps */}
                    {(payload.traps || []).filter(Boolean).length > 0 && (
                      <div>
                        <p className="text-xs font-bold mb-1">Tuzaklar</p>
                        <div className="flex flex-wrap gap-1">
                          {payload.traps.filter(Boolean).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{ background: "color-mix(in srgb, var(--color-destructive) 12%, transparent)", color: "var(--color-destructive)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditEditor(row)}>
                        <Edit3 size={12} className="mr-1" /> Düzenle
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyAsJson(row)}>
                        <Copy size={12} className="mr-1" /> JSON Kopyala
                      </Button>
                      {row.status === "pending" && (
                        <Button variant="primary" size="sm" onClick={() => applyDecision(row.id, "approved")}>
                          <Check size={12} className="mr-1" /> Onayla
                        </Button>
                      )}
                      {row.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => applyDecision(row.id, "rejected")}>
                          Reddet
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteScenario(row.id)}
                        className="text-[var(--color-destructive)] ml-auto">
                        <Trash2 size={12} className="mr-1" /> Sil
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
