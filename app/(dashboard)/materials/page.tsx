"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen,
  Upload,
  FolderOpen,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Presentation,
  File,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  X,
  ChevronDown,
  Layers,
  BarChart2,
  HardDrive,
  Zap,
} from "lucide-react";
import { TUS_SUBJECTS } from "@/constants/tus";

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface Material {
  id: string;
  name: string;
  type: string;
  status: "processing" | "ready" | "failed";
  source: "upload" | "gdrive";
  branch: string;
  chunkCount: number;
  pageCount: number | null;
  sizeBytes: number | null;
  driveWebViewLink: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  chunks: number;
  branches: number;
}

interface Quota {
  usedBytes: number;
  quotaBytes: number;
  quotaPct: number;
  plan: string;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
const BRANCHES = ["Genel", ...TUS_SUBJECTS];

function extractDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const directMatch = value.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (directMatch) return directMatch[0];

  const dPath = value.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (dPath?.[1]) return dPath[1];

  try {
    const url = new URL(value);
    const byId = url.searchParams.get("id");
    if (byId && /^[a-zA-Z0-9_-]{20,}$/.test(byId)) return byId;
  } catch {
    return null;
  }

  return null;
}

function fileTypeIcon(type: string) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-400" />;
  if (type === "pptx" || type === "ppt") return <Presentation className="w-4 h-4 text-orange-400" />;
  if (type === "docx" || type === "doc") return <FileText className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

function statusBadge(status: Material["status"]) {
  if (status === "ready") return (
    <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
      <CheckCircle className="w-3 h-3" /> Hazır
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-amber-400 text-xs font-medium animate-pulse">
      <Clock className="w-3 h-3" /> İşleniyor
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
      <AlertCircle className="w-3 h-3" /> Hata
    </span>
  );
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, chunks: 0, branches: 0 });
  const [quota, setQuota] = useState<Quota | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Genel");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "processing" | "failed">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ─── Veri yükle ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [matsRes, driveRes, quotaRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/auth/gdrive?action=status"),
        fetch("/api/materials/quota"),
      ]);
      if (matsRes.ok) {
        const data = await matsRes.json();
        setMaterials(data.materials ?? []);
        setStats(data.stats ?? { total: 0, chunks: 0, branches: 0 });
      }
      if (driveRes.ok) {
        const d = await driveRes.json();
        setDriveConnected(d.connected ?? false);
      }
      if (quotaRes.ok) {
        const q = await quotaRes.json();
        setQuota(q);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Polling: processing durumundaki materyaller için
    const interval = setInterval(() => {
      if (materials.some((m) => m.status === "processing")) fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData, materials]);

  // GDrive callback mesajı
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gdriveParam = params.get("gdrive");
    const driveParam = params.get("drive");
    if (gdriveParam === "connected" || driveParam === "connected") {
      setSuccessMsg("Google Drive başarıyla bağlandı!");
      setDriveConnected(true);
      window.history.replaceState({}, "", "/materials");
    } else if (gdriveParam === "error" || driveParam === "error") {
      setSuccessMsg("");
      window.history.replaceState({}, "", "/materials");
    }
  }, []);

  // ─── Dosya yükle ─────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(`${file.name} yükleniyor...`);

    const form = new FormData();
    form.append("file", file);
    form.append("branch", selectedBranch);

    try {
      const res = await fetch("/api/materials/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setUploadProgress(`"${file.name}" zaten yüklü.`);
        } else {
          setUploadProgress(`Hata: ${data.error}`);
        }
      } else {
        setUploadProgress(`"${file.name}" işleniyor, hazır olunca bildirim verilecek.`);
        fetchData();
      }
    } catch {
      setUploadProgress("Yükleme başarısız.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(""), 5000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(uploadFile);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove("border-indigo-500", "bg-indigo-500/10");
    if (e.dataTransfer.files.length) {
      Array.from(e.dataTransfer.files).forEach(uploadFile);
    }
  };

  // ─── Google Drive bağlan ──────────────────────────────────────────────────
  const connectDrive = async () => {
    setDriveLoading(true);
    try {
      const res = await fetch("/api/auth/gdrive?action=connect");
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Drive bağlantısı başlatılamadı.");
        return;
      }
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      alert(data.message ?? "Drive bağlantısı için sistem yapılandırması eksik.");
    } catch {
      alert("Drive bağlantısı başlatılamadı.");
    } finally {
      setDriveLoading(false);
    }
  };

  // ─── Google Drive Picker ──────────────────────────────────────────────────
  const openDrivePicker = () => {
    if (!driveConnected) {
      connectDrive();
      return;
    }
    // Basit dosya ID girişi (gerçek picker için Google Picker API embed edilir)
    const fileInput = prompt(
      "Google Drive dosya linki veya dosya ID'si girin:",
    );
    if (!fileInput) return;
    const fileId = extractDriveFileId(fileInput);
    if (!fileId) {
      alert("Geçerli bir Drive dosya linki veya ID girin.");
      return;
    }

    const fileName = prompt("Dosya adı (opsiyonel):") || "Drive Dosyası";

    fetch("/api/materials/gdrive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: fileId.trim(),
        fileName,
        branch: selectedBranch,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.status === "exists") {
            setSuccessMsg(d.message ?? "Bu Drive dosyası zaten eklenmiş.");
          } else {
            const displayName = d.name ?? fileName;
            setSuccessMsg(`"${displayName}" Drive'dan aktarılıyor...`);
          }
          fetchData();
          setTimeout(() => setSuccessMsg(""), 5000);
        } else {
          if (d.needsConnection) setDriveConnected(false);
          alert(d.error ?? "Hata oluştu.");
        }
      });
  };

  // ─── Sil ─────────────────────────────────────────────────────────────────
  const deleteMat = async (id: string) => {
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  // ─── Filtrele ─────────────────────────────────────────────────────────────
  const filtered = materials.filter((m) =>
    filterStatus === "all" ? true : m.status === filterStatus,
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Materyallerim</h1>
            <p className="text-slate-400 text-sm">PDF, sunum ve dökümanlarınızı AI ile kullanın</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Başarı mesajı */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Toplam Dosya", value: stats.total, icon: <File className="w-5 h-5 text-indigo-400" /> },
          { label: "Toplam Chunk", value: stats.chunks.toLocaleString("tr"), icon: <Layers className="w-5 h-5 text-purple-400" /> },
          { label: "Konu Dalları", value: stats.branches, icon: <BarChart2 className="w-5 h-5 text-pink-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Depolama Kota Widget */}
      {quota && (
        <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-white">Depolama Kotası</span>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Ek Depolama Al
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{formatBytes(quota.usedBytes)} kullanıldı</span>
            <span className="text-slate-500">{formatBytes(quota.quotaBytes)} toplam</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quota.quotaPct}%`,
                background:
                  quota.quotaPct >= 80
                    ? "linear-gradient(90deg, #f97316, #ef4444)"
                    : "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
          </div>
          <div className="mt-1.5 text-right">
            <span
              className="text-xs font-medium"
              style={{ color: quota.quotaPct >= 80 ? "#f97316" : "#818cf8" }}
            >
              %{quota.quotaPct} dolu
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Yükleme alanı */}
        <div className="space-y-4">
          {/* Branch seçici */}
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="w-full flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white hover:border-indigo-500/50 transition-colors"
            >
              <span className="text-slate-300">Dal: <span className="text-white font-medium">{selectedBranch}</span></span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showBranchDropdown && (
              <div className="absolute z-50 top-full mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-xl overflow-auto max-h-60 shadow-2xl">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setSelectedBranch(b); setShowBranchDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${selectedBranch === b ? "text-indigo-400" : "text-slate-300"}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Drag & Drop alanı */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-indigo-500", "bg-indigo-500/10"); }}
            onDragLeave={() => dropRef.current?.classList.remove("border-indigo-500", "bg-indigo-500/10")}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
          >
            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Dosya Yükle</p>
            <p className="text-slate-500 text-xs mb-3">PDF, PPTX, DOCX, TXT — max 50 MB</p>
            <button
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? "Yükleniyor..." : "Dosya Seç"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {uploadProgress && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-indigo-300">
              {uploadProgress}
            </div>
          )}

          {/* Google Drive */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs">
                  G
                </div>
                <span className="text-sm font-medium text-white">Google Drive</span>
              </div>
              {driveConnected ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Bağlı
                </span>
              ) : (
                <span className="text-xs text-slate-500">Bağlı değil</span>
              )}
            </div>

            {driveConnected ? (
              <button
                onClick={openDrivePicker}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-yellow-400" />
                Drive'dan Seç
              </button>
            ) : (
              <button
                onClick={connectDrive}
                disabled={driveLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-sm text-indigo-300 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                {driveLoading ? "Yönlendiriliyor..." : "Drive'ı Bağla"}
              </button>
            )}
          </div>

          {/* AI Kullanım İpuçları */}
          <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/20 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-purple-300 mb-2">AI ile Kullanım</h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>Soru bankasında "materyallerimden" seçeneğini aktif edin</li>
              <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>Flashcard oluşturucu yüklediğiniz konulardan kart üretir</li>
              <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>AI Asistan otomatik olarak materyallerinizi referans alır</li>
              <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>OSCE vakası materyallerinize göre özelleştirilir</li>
            </ul>
          </div>
        </div>

        {/* Sağ: Materyal listesi */}
        <div className="lg:col-span-2">
          {/* Filtreler */}
          <div className="flex items-center gap-2 mb-4">
            {(["all", "ready", "processing", "failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {s === "all" ? "Tümü" : s === "ready" ? "Hazır" : s === "processing" ? "İşleniyor" : "Hata"}
                {s !== "all" && (
                  <span className="ml-1 opacity-60">
                    ({materials.filter((m) => m.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500">
              <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" />
              Yükleniyor...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-500 font-medium">
                {filterStatus === "all" ? "Henüz materyal yüklenmedi" : "Bu filtrede materyal yok"}
              </p>
              {filterStatus === "all" && (
                <p className="text-slate-600 text-sm mt-1">
                  Sol taraftan PDF veya sunum yükleyerek başlayın
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((mat) => (
                <div
                  key={mat.id}
                  className="group bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-all flex items-center gap-3"
                >
                  {/* İkon */}
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    {fileTypeIcon(mat.type)}
                  </div>

                  {/* Bilgi */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white truncate">{mat.name}</span>
                      {mat.source === "gdrive" && (
                        <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">Drive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {statusBadge(mat.status)}
                      <span className="text-slate-600">·</span>
                      <span className="text-indigo-400/80">{mat.branch}</span>
                      {mat.chunkCount > 0 && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span>{mat.chunkCount} chunk</span>
                        </>
                      )}
                      {mat.pageCount && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span>{mat.pageCount} sayfa</span>
                        </>
                      )}
                      <span className="text-slate-600">·</span>
                      <span>{formatBytes(mat.sizeBytes)}</span>
                    </div>
                    {mat.errorMessage && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">{mat.errorMessage}</p>
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {mat.driveWebViewLink && (
                      <a
                        href={mat.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {deleteConfirm === mat.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMat(mat.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                          Evet
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(mat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="relative bg-[#13131f] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Ek Depolama</h3>
                <p className="text-slate-400 text-xs">Depolama alanınızı genişletin</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              Yakında! Pro pakete geçerek <span className="text-indigo-400 font-semibold">2 GB</span> depolama alanı elde edebilirsiniz.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors"
              >
                Kapat
              </button>
              <a
                href="/upgrade"
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white text-center font-medium transition-colors"
              >
                Pro'ya Geç
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
