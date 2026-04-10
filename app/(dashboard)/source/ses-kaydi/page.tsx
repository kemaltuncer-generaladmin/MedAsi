"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Mic,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Upload,
  Music,
} from "lucide-react";
import toast from "react-hot-toast";
import { TUS_SUBJECTS_WITH_OTHER, type TusSubjectOrOther } from "@/constants/tus";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "medasi_ses_kaydi_v1";
const UPLOADED_AUDIO_KEY = "medasi_uploaded_audio_v1";

type Subject = TusSubjectOrOther;
type Source = "Ders Kaydı" | "Konferans" | "Podcast" | "Seminer";

const SUBJECTS: Subject[] = [...TUS_SUBJECTS_WITH_OTHER];
const SOURCES: Source[] = ["Ders Kaydı", "Konferans", "Podcast", "Seminer"];

const SOURCE_COLORS: Record<Source, string> = {
  "Ders Kaydı": "#6366f1",
  Konferans: "#0ea5e9",
  Podcast: "#f59e0b",
  Seminer: "#10b981",
};

const SOURCE_BADGE_VARIANTS: Record<
  Source,
  "default" | "success" | "warning" | "secondary"
> = {
  "Ders Kaydı": "default",
  Konferans: "secondary",
  Podcast: "warning",
  Seminer: "success",
};

interface Recording {
  id: string;
  title: string;
  source: Source;
  subject: Subject;
  duration: number;
  date: string;
  transcription: string;
  addedAt: string;
}

interface UploadedAudio {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

function load(): Recording[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(recs: Recording[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
}

function loadUploaded(): UploadedAudio[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(UPLOADED_AUDIO_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveUploaded(items: UploadedAudio[]) {
  localStorage.setItem(UPLOADED_AUDIO_KEY, JSON.stringify(items));
}

const emptyForm = (): Omit<Recording, "id" | "addedAt"> => ({
  title: "",
  source: "Ders Kaydı",
  subject: "Diğer",
  duration: 0,
  date: "",
  transcription: "",
});

export default function SesKaydiPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload states
  const [uploadedAudios, setUploadedAudios] = useState<UploadedAudio[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecordings(load());
    setUploadedAudios(loadUploaded());
  }, []);

  const filtered = recordings.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase());
    const matchSource = sourceFilter === "all" || r.source === sourceFilter;
    return matchSearch && matchSource;
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }
  function openEdit(r: Recording) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      source: r.source,
      subject: r.subject,
      duration: r.duration,
      date: r.date,
      transcription: r.transcription,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("Kayıt başlığı zorunludur");
      return;
    }
    if (editingId) {
      const updated = recordings.map((r) =>
        r.id === editingId ? { ...r, ...form } : r,
      );
      setRecordings(updated);
      save(updated);
      toast.success("Kayıt güncellendi");
    } else {
      const newRec: Recording = {
        id: Date.now().toString(),
        ...form,
        addedAt: new Date().toLocaleDateString("tr-TR"),
        date: form.date || new Date().toLocaleDateString("tr-TR"),
      };
      const updated = [newRec, ...recordings];
      setRecordings(updated);
      save(updated);
      toast.success("Kayıt eklendi");
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    save(updated);
    if (expandedId === id) setExpandedId(null);
    toast.success("Kayıt silindi");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Maksimum 50 MB ses dosyası yükleyebilirsiniz.");
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Giriş yapmanız gerekiyor.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const path = `${user.id}/${Date.now()}_${file.name}`;

    try {
      const { error } = await supabase.storage
        .from("user-audio")
        .upload(path, file);

      if (error) {
        toast.error("Yükleme hatası: " + error.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("user-audio")
        .getPublicUrl(path);

      const newAudio: UploadedAudio = {
        id: Date.now().toString(),
        name: file.name,
        url: urlData.publicUrl,
        uploadedAt: new Date().toLocaleDateString("tr-TR"),
      };

      const updated = [newAudio, ...uploadedAudios];
      setUploadedAudios(updated);
      saveUploaded(updated);
      toast.success("Ses dosyası başarıyla yüklendi!");
    } catch {
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDeleteUploaded(id: string) {
    const updated = uploadedAudios.filter((a) => a.id !== id);
    setUploadedAudios(updated);
    saveUploaded(updated);
    toast.success("Ses dosyası kaldırıldı");
  }

  const totalDuration = recordings.reduce((s, r) => s + r.duration, 0);
  const withTranscription = recordings.filter((r) =>
    r.transcription.trim(),
  ).length;

  const inputCls =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Mic size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Ses Kayıtları
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Ders ve konferans ses kayıtlarınızı takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setActiveTab(activeTab === "upload" ? "list" : "upload")}>
            <Upload size={15} />
            Ses Yükle
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <Plus size={15} />
            Kayıt Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Kayıt", value: recordings.length },
          { label: "Transkript Var", value: withTranscription },
          {
            label: "Kaynak Sayısı",
            value: new Set(recordings.map((r) => r.source)).size,
          },
          { label: "Toplam Süre", value: `${totalDuration} dk` },
        ].map((s) => (
          <Card key={s.label} variant="bordered" className="p-4">
            <p className="text-2xl font-bold text-[var(--color-primary)]">
              {s.value}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {[
          { key: "list", label: "Kayıtlı Sesler" },
          { key: "upload", label: `Yüklenen Sesler (${uploadedAudios.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "list" | "upload")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kayıt veya konu ara..."
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="flex gap-2">
              {(["all", ...SOURCES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceFilter === s ? "bg-[var(--color-primary)] text-black" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
                >
                  {s === "all" ? "Tümü" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Recordings */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Mic size={32} className="text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">
                {recordings.length === 0
                  ? "Henüz kayıt eklenmedi"
                  : "Sonuç bulunamadı"}
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {recordings.length === 0
                  ? "İlk ses kaydını ekleyerek başlayın"
                  : "Arama kriterlerini değiştirin"}
              </p>
              {recordings.length === 0 && (
                <Button variant="primary" size="sm" onClick={openAdd}>
                  <Plus size={14} />
                  İlk Kaydı Ekle
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((rec) => {
                const isExpanded = expandedId === rec.id;
                const color = SOURCE_COLORS[rec.source];
                return (
                  <Card
                    key={rec.id}
                    variant="bordered"
                    className="p-4 hover:border-[var(--color-primary)]/30 transition-colors flex flex-col gap-3"
                  >
                    {/* Top */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Mic size={16} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--color-text-primary)] leading-tight line-clamp-2">
                          {rec.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {rec.subject}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={SOURCE_BADGE_VARIANTS[rec.source]}
                        className="text-xs"
                      >
                        {rec.source}
                      </Badge>
                      {rec.duration > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] text-xs border border-[var(--color-border)]">
                          <Clock size={9} />
                          {rec.duration} dk
                        </span>
                      )}
                      {rec.date && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {rec.date}
                        </span>
                      )}
                    </div>

                    {/* Transcription */}
                    {rec.transcription && (
                      <div className="border-t border-[var(--color-border)] pt-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                          className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
                        >
                          <span className="flex-1 text-left font-medium">
                            Transkript Notları
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                        {isExpanded && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-2 whitespace-pre-wrap leading-relaxed border border-[var(--color-border)] rounded-lg p-3 bg-[var(--color-surface)]">
                            {rec.transcription}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {rec.addedAt}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(rec)}
                          className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "upload" && (
        <div className="flex flex-col gap-5">
          {/* Upload Area */}
          <Card variant="bordered" className="p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                  Ses Dosyası Yükle
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Desteklenen formatlar: .mp3, .wav, .m4a, .ogg — Maksimum 50 MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Upload size={22} className="text-[var(--color-primary)]" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {uploading ? "Yükleniyor..." : "Dosya Seç veya Sürükle"}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    mp3, wav, m4a, ogg — max 50 MB
                  </p>
                </div>
              </button>

              {uploading && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                    <span>Yükleniyor...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Uploaded Audio List */}
          {uploadedAudios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Music size={32} className="text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">
                Henüz ses dosyası yüklenmedi
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Yukarıdan bir ses dosyası yükleyin
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                Yüklenen Sesler ({uploadedAudios.length})
              </h3>
              <div className="flex flex-col gap-3">
                {uploadedAudios.map((item) => (
                  <Card
                    key={item.id}
                    variant="bordered"
                    className="p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                        <Music size={15} className="text-[var(--color-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {item.uploadedAt}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteUploaded(item.id)}
                        className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <audio src={item.url} controls className="w-full" />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-lg border border-[var(--color-border)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {editingId ? "Kaydı Düzenle" : "Yeni Ses Kaydı"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Başlık *
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Kayıt başlığı"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Kaynak
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        source: e.target.value as Source,
                      }))
                    }
                    className={inputCls}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
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
                    className={inputCls}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Süre (dakika)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.duration || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        duration: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Tarih
                  </label>
                  <input
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    placeholder="gg.aa.yyyy"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Transkript Notları
                </label>
                <textarea
                  value={form.transcription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transcription: e.target.value }))
                  }
                  placeholder="Kaydın transkripti veya notlar..."
                  rows={5}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                İptal
              </Button>
              <Button variant="primary" onClick={handleSave} className="flex-1">
                {editingId ? "Güncelle" : "Ekle"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
