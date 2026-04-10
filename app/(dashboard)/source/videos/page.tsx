"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Video,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  PlayCircle,
  CheckCircle,
  Clock,
  Upload,
  Play,
} from "lucide-react";
import toast from "react-hot-toast";
import { TUS_SUBJECTS_WITH_OTHER, type TusSubjectOrOther } from "@/constants/tus";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "medasi_videos_v1";
const UPLOADED_VIDEOS_KEY = "medasi_uploaded_videos_v1";

type Subject = TusSubjectOrOther;
type Platform = "YouTube" | "Vimeo" | "Kendi Yükleme" | "Diğer";
type Status = "izlenmedi" | "izleniyor" | "tamamlandı";

const SUBJECTS: Subject[] = [...TUS_SUBJECTS_WITH_OTHER];
const PLATFORMS: Platform[] = ["YouTube", "Vimeo", "Kendi Yükleme", "Diğer"];

const STATUS_CONFIG: Record<
  Status,
  {
    label: string;
    variant: "secondary" | "warning" | "success";
    icon: typeof Clock;
  }
> = {
  izlenmedi: { label: "İzlenmedi", variant: "secondary", icon: Clock },
  izleniyor: { label: "İzleniyor", variant: "warning", icon: PlayCircle },
  tamamlandı: { label: "Tamamlandı", variant: "success", icon: CheckCircle },
};

const PLATFORM_COLORS: Record<Platform, string> = {
  YouTube: "#ef4444",
  Vimeo: "#0ea5e9",
  "Kendi Yükleme": "#8b5cf6",
  Diğer: "#64748b",
};

interface VideoEntry {
  id: string;
  title: string;
  platform: Platform;
  duration: number;
  subject: Subject;
  status: Status;
  notes: string;
  url: string;
  addedAt: string;
}

interface UploadedVideo {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

function load(): VideoEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function save(videos: VideoEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

function loadUploaded(): UploadedVideo[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(UPLOADED_VIDEOS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveUploaded(videos: UploadedVideo[]) {
  localStorage.setItem(UPLOADED_VIDEOS_KEY, JSON.stringify(videos));
}

const emptyForm = (): Omit<VideoEntry, "id" | "addedAt"> => ({
  title: "",
  platform: "YouTube",
  duration: 0,
  subject: "Diğer",
  status: "izlenmedi",
  notes: "",
  url: "",
});

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Upload states
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVideos(load());
    setUploadedVideos(loadUploaded());
  }, []);

  const filtered = videos.filter((v) => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }
  function openEdit(v: VideoEntry) {
    setEditingId(v.id);
    setForm({
      title: v.title,
      platform: v.platform,
      duration: v.duration,
      subject: v.subject,
      status: v.status,
      notes: v.notes,
      url: v.url,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("Video başlığı zorunludur");
      return;
    }
    if (editingId) {
      const updated = videos.map((v) =>
        v.id === editingId ? { ...v, ...form } : v,
      );
      setVideos(updated);
      save(updated);
      toast.success("Video güncellendi");
    } else {
      const newVideo: VideoEntry = {
        id: Date.now().toString(),
        ...form,
        addedAt: new Date().toLocaleDateString("tr-TR"),
      };
      const updated = [newVideo, ...videos];
      setVideos(updated);
      save(updated);
      toast.success("Video eklendi");
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const updated = videos.filter((v) => v.id !== id);
    setVideos(updated);
    save(updated);
    toast.success("Video silindi");
  }

  function cycleStatus(v: VideoEntry) {
    const cycle: Status[] = ["izlenmedi", "izleniyor", "tamamlandı"];
    const next = cycle[(cycle.indexOf(v.status) + 1) % cycle.length];
    const updated = videos.map((item) =>
      item.id === v.id ? { ...item, status: next } : item,
    );
    setVideos(updated);
    save(updated);
    toast.success(`Durum: ${STATUS_CONFIG[next].label}`);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Maksimum 100 MB video yükleyebilirsiniz.");
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
        .from("user-videos")
        .upload(path, file);

      if (error) {
        toast.error("Yükleme hatası: " + error.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("user-videos")
        .getPublicUrl(path);

      const newVideo: UploadedVideo = {
        id: Date.now().toString(),
        name: file.name,
        url: urlData.publicUrl,
        uploadedAt: new Date().toLocaleDateString("tr-TR"),
      };

      const updated = [newVideo, ...uploadedVideos];
      setUploadedVideos(updated);
      saveUploaded(updated);
      toast.success("Video başarıyla yüklendi!");
      setSelectedVideo(newVideo);
    } catch {
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDeleteUploaded(id: string) {
    const updated = uploadedVideos.filter((v) => v.id !== id);
    setUploadedVideos(updated);
    saveUploaded(updated);
    if (selectedVideo?.id === id) setSelectedVideo(null);
    toast.success("Video kaldırıldı");
  }

  const totalDuration = videos.reduce((s, v) => s + v.duration, 0);
  const completedCount = videos.filter((v) => v.status === "tamamlandı").length;

  const inputCls =
    "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Video size={20} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Video Kaynakları
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Eğitim videolarınızı takip edin ve yönetin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setActiveTab(activeTab === "upload" ? "list" : "upload")}>
            <Upload size={15} />
            Video Yükle
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <Plus size={15} />
            Video Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Video", value: videos.length },
          { label: "Tamamlandı", value: completedCount },
          {
            label: "İzleniyor",
            value: videos.filter((v) => v.status === "izleniyor").length,
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
          { key: "list", label: "Kayıtlı Videolar" },
          { key: "upload", label: `Yüklenen Videolar (${uploadedVideos.length})` },
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
                placeholder="Video ara..."
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="flex gap-2">
              {(["all", "izlenmedi", "izleniyor", "tamamlandı"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-[var(--color-primary)] text-black" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
                  >
                    {s === "all" ? "Tümü" : STATUS_CONFIG[s].label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Videos Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Video size={32} className="text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">
                {videos.length === 0 ? "Henüz video eklenmedi" : "Sonuç bulunamadı"}
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                {videos.length === 0
                  ? "İlk videoyu ekleyerek başlayın"
                  : "Arama kriterlerini değiştirin"}
              </p>
              {videos.length === 0 && (
                <Button variant="primary" size="sm" onClick={openAdd}>
                  <Plus size={14} />
                  İlk Videoyu Ekle
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((v) => {
                const sc = STATUS_CONFIG[v.status];
                const StatusIcon = sc.icon;
                const platformColor = PLATFORM_COLORS[v.platform];
                return (
                  <Card
                    key={v.id}
                    variant="bordered"
                    className="p-4 hover:border-[var(--color-primary)]/30 transition-colors flex flex-col gap-3"
                  >
                    {/* Top */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${platformColor}20` }}
                      >
                        <Video size={18} style={{ color: platformColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--color-text-primary)] leading-tight line-clamp-2">
                          {v.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {v.subject}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${platformColor}20`,
                          color: platformColor,
                        }}
                      >
                        {v.platform}
                      </span>
                      <Badge variant={sc.variant} className="text-xs">
                        {sc.label}
                      </Badge>
                      {v.duration > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] text-xs border border-[var(--color-border)]">
                          <Clock size={9} />
                          {v.duration} dk
                        </span>
                      )}
                    </div>

                    {v.notes && (
                      <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                        {v.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cycleStatus(v)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <StatusIcon size={11} />
                          Durumu Değiştir
                        </button>
                        {v.url && (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
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
                  Video Yükle
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Desteklenen formatlar: .mp4, .webm, .mov, .avi — Maksimum 100 MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.webm,.mov,.avi,video/mp4,video/webm,video/quicktime,video/x-msvideo"
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
                    mp4, webm, mov, avi — max 100 MB
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

          {/* Player */}
          {selectedVideo && (
            <Card variant="bordered" className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[var(--color-text-primary)] text-sm truncate flex-1 mr-3">
                  {selectedVideo.name}
                </p>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <X size={16} />
                </button>
              </div>
              <video
                src={selectedVideo.url}
                controls
                className="w-full rounded-xl max-h-96"
                style={{ backgroundColor: "black" }}
              />
            </Card>
          )}

          {/* Uploaded Videos List */}
          {uploadedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Video size={32} className="text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-primary)] font-medium">
                Henüz video yüklenmedi
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Yukarıdan bir video yükleyin
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                Yüklenen Videolar ({uploadedVideos.length})
              </h3>
              <div className="flex flex-col gap-2">
                {uploadedVideos.map((v) => {
                  const isActive = selectedVideo?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVideo(v)}
                      className={`p-3 flex items-center gap-3 transition-colors cursor-pointer rounded-xl border hover:border-[var(--color-primary)]/40 ${isActive ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5" : ""}`}
                      style={{ borderColor: isActive ? undefined : "var(--color-border)", backgroundColor: isActive ? undefined : "var(--color-surface)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isActive
                            ? "var(--color-primary)"
                            : "var(--color-surface-elevated)",
                        }}
                      >
                        <Play size={15} style={{ color: isActive ? "black" : "var(--color-text-secondary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {v.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {v.uploadedAt}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUploaded(v.id);
                        }}
                        className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
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
                {editingId ? "Videoyu Düzenle" : "Yeni Video Ekle"}
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
                  Video Başlığı *
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Video adı"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                    Platform
                  </label>
                  <select
                    value={form.platform}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        platform: e.target.value as Platform,
                      }))
                    }
                    className={inputCls}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
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
                    Durum
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as Status,
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="izlenmedi">İzlenmedi</option>
                    <option value="izleniyor">İzleniyor</option>
                    <option value="tamamlandı">Tamamlandı</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Video URL
                </label>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Notlar
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Video hakkında notlar..."
                  rows={3}
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
