"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Presentation,
  Plus,
  Search,
  X,
  Download,
  Eye,
  Calendar,
  ChevronDown,
  ChevronRight,
  Upload,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { TUS_SUBJECTS_WITH_OTHER } from "@/constants/tus";

const SUBJECTS = [...TUS_SUBJECTS_WITH_OTHER];
const SLIDE_TYPES = ["pdf", "pptx", "ppt"];

interface Material {
  id: string;
  name: string;
  type: string;
  status: "processing" | "ready" | "failed";
  branch: string;
  chunkCount: number;
  pageCount: number | null;
  sizeBytes: number | null;
  createdAt: string;
  driveWebViewLink: string | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: Material["status"] }) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
        <CheckCircle2 size={11} /> Hazır
      </span>
    );
  if (status === "processing")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-warning)]">
        <Clock size={11} /> İşleniyor
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-destructive)]">
      <AlertCircle size={11} /> Hata
    </span>
  );
}

export default function SlidesPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("Tümü");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  // Form state
  const [lessonName, setLessonName] = useState<string>(SUBJECTS[0]);
  const [topicTitle, setTopicTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const slides: Material[] = (data.materials as Material[]).filter((m) =>
        SLIDE_TYPES.includes(m.type.toLowerCase()),
      );
      setMaterials(slides);
      // Auto-expand all branches on first load
      setExpandedBranches(new Set(slides.map((m) => m.branch)));
    } catch {
      toast.error("Slaytlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  function resetForm() {
    setLessonName(SUBJECTS[0]);
    setTopicTitle("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!topicTitle.trim()) {
      toast.error("Konu başlığı zorunludur");
      return;
    }
    if (!selectedFile) {
      toast.error("Lütfen bir dosya seçin");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("branch", lessonName);
      formData.append("title", `${lessonName} - ${topicTitle.trim()}`);

      const res = await fetch("/api/materials/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Bu dosya zaten yüklü");
        } else {
          toast.error(json.error || "Yükleme başarısız");
        }
        return;
      }

      toast.success("Slayt yüklendi, işleniyor...");
      setShowForm(false);
      resetForm();
      // Refresh list after a short delay to let server process
      setTimeout(fetchMaterials, 1500);
    } catch {
      toast.error("Yükleme sırasında bir hata oluştu");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Slayt silindi");
    } catch {
      toast.error("Silme başarısız");
    }
  }

  function toggleBranch(branch: string) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branch)) next.delete(branch);
      else next.add(branch);
      return next;
    });
  }

  // Filter by search and active subject
  const filtered = materials.filter(
    (m) =>
      (activeSubject === "Tümü" || m.branch === activeSubject) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.branch.toLowerCase().includes(search.toLowerCase())),
  );

  // Group by branch
  const grouped = filtered.reduce<Record<string, Material[]>>((acc, m) => {
    (acc[m.branch] ??= []).push(m);
    return acc;
  }, {});

  const branches = Object.keys(grouped).sort();
  const allSubjects = ["Tümü", ...Array.from(new Set(materials.map((m) => m.branch))).sort()];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Presentation size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Slaytlar
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Ders ve klinik slaytlarınızı organize edin
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={15} />
          Slayt Yükle
        </Button>
      </div>

      {/* Search + Subject Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Slayt ara..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allSubjects.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubject === s
                  ? "bg-[var(--color-primary)] text-black"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-[var(--color-text-secondary)]">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Yükleniyor...</span>
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Presentation size={32} className="text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-primary)] font-medium">
            Slayt bulunamadı
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            PDF veya PowerPoint slaytlarınızı yükleyerek kütüphanenizi oluşturun
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            İlk Slaytı Yükle
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {branches.map((branch) => {
            const items = grouped[branch];
            const isExpanded = expandedBranches.has(branch);
            return (
              <div
                key={branch}
                className="border border-[var(--color-border)] rounded-xl overflow-hidden"
              >
                {/* Branch Header */}
                <button
                  onClick={() => toggleBranch(branch)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={15} className="text-[var(--color-text-secondary)]" />
                    ) : (
                      <ChevronRight size={15} className="text-[var(--color-text-secondary)]" />
                    )}
                    <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                      {branch}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length} slayt
                    </Badge>
                  </div>
                </button>

                {/* Branch Items */}
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3 bg-[var(--color-surface-elevated)]/30">
                    {items.map((material) => (
                      <Card
                        key={material.id}
                        variant="bordered"
                        className="p-0 overflow-hidden hover:border-[var(--color-primary)]/40 transition-colors group"
                      >
                        <div className="h-1 w-full bg-[var(--color-primary)]/60" />
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <FileText
                                  size={13}
                                  className="text-[var(--color-primary)] shrink-0"
                                />
                                <p className="font-semibold text-[var(--color-text-primary)] text-sm leading-snug line-clamp-2">
                                  {material.name}
                                </p>
                              </div>
                              <StatusBadge status={material.status} />
                            </div>
                            <Badge
                              variant="secondary"
                              className="ml-1 shrink-0 text-xs uppercase"
                            >
                              {material.type}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {new Date(material.createdAt).toLocaleDateString("tr-TR")}
                              </span>
                              {material.pageCount && (
                                <span>{material.pageCount} sayfa</span>
                              )}
                              <span>{formatBytes(material.sizeBytes)}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {material.driveWebViewLink && (
                                <a
                                  href={material.driveWebViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                  <Eye size={13} />
                                </a>
                              )}
                              <button className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                                <Download size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(material.id)}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Yeni Slayt Yükle
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Ders Adı */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Ders Adı <span className="text-[var(--color-destructive)]">*</span>
                </label>
                <select
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Konu Başlığı */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Konu Başlığı <span className="text-[var(--color-destructive)]">*</span>
                </label>
                <input
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="Ör: Akut Koroner Sendrom, Hipertansiyon..."
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Dosya Seç */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Dosya <span className="text-[var(--color-destructive)]">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.pptx,.ppt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 50 * 1024 * 1024) {
                        toast.error("Dosya 50 MB sınırını aşıyor");
                        return;
                      }
                      setSelectedFile(f);
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={16} className="text-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--color-text-primary)] font-medium truncate max-w-[200px]">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        ({formatBytes(selectedFile.size)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload size={20} className="text-[var(--color-text-secondary)]" />
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        PDF, PPTX veya PPT yükleyin
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Maks. 50 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Preview */}
              {(lessonName || topicTitle) && (
                <div className="bg-[var(--color-surface)] rounded-lg px-3 py-2 border border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">
                    Başlık önizleme:
                  </p>
                  <p className="text-sm text-[var(--color-text-primary)] font-medium">
                    {lessonName}
                    {topicTitle.trim() ? ` — ${topicTitle.trim()}` : ""}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1"
                  disabled={uploading}
                >
                  İptal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  className="flex-1"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Yükle
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
