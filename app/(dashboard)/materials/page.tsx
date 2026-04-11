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
  BookmarkPlus,
} from "lucide-react";
import { TUS_SUBJECTS } from "@/constants/tus";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

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
  managedDriveFileId?: string | null;
  managedDriveProcessedFileId?: string | null;
  managedDriveArchiveFileId?: string | null;
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

interface LibraryFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  bucket: string;
}

interface HandshakeStatus {
  serviceAccountFilePresent: boolean;
  rootFolderConfigured: boolean;
  rootFolderReachable: boolean;
  rootFolderId: string | null;
  ready: boolean;
}

type DriveImportTarget = {
  fileId: string;
  fileName: string;
  branch: string;
  materialType: (typeof MATERIAL_TYPES)[number];
};

function getDriveErrorMessage(reason: string | null) {
  switch (reason) {
    case "invalid_state":
      return "Google Drive oturumu zaman aşımına uğradı. Lütfen bağlantıyı yeniden başlatın.";
    case "token_exchange":
      return "Google Drive yetkilendirmesi tamamlandı ancak token alınamadı. OAuth ayarlarını kontrol edin.";
    case "access_denied":
      return "Google Drive erişim izni verilmedi.";
    case "missing_params":
      return "Google Drive geri dönüşünde eksik parametre alındı.";
    default:
      return "Google Drive bağlantısı tamamlanamadı.";
  }
}

function getDriveImportErrorMessage(reason: string | null) {
  switch (reason) {
    case "reauth_required":
      return "Drive oturumu yenilenmeli. Lütfen bağlantıyı yeniden başlatın.";
    case "needs_connection":
      return "Drive bağlı değil. Önce Drive hesabınızı bağlayın.";
    case "access_denied":
      return "Bu Drive dosyasına erişim izniniz yok.";
    case "file_not_found":
      return "Drive dosyası bulunamadı veya bağlantı geçersiz.";
    case "export_unsupported":
      return "Bu Google dosya tipi indirilebilir bir formata dönüştürülemiyor.";
    case "download_failed":
      return "Drive dosyası indirilemedi. Lütfen tekrar deneyin.";
    default:
      return "Drive aktarımı sırasında bir hata oluştu.";
  }
}

function getDriveRecoveryActions(reason: string | null): Array<"retry" | "connect"> {
  switch (reason) {
    case "needs_connection":
    case "reauth_required":
      return ["connect"];
    case "download_failed":
    case "token_exchange":
    case "invalid_state":
      return ["retry"];
    case "access_denied":
      return ["connect", "retry"];
    default:
      return ["retry"];
  }
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
const BRANCHES = ["Genel", ...TUS_SUBJECTS];
const MATERIAL_TYPES = [
  "Genel",
  "Ders Notu",
  "Slayt",
  "Video",
  "Ses Kaydi",
  "Textbook",
] as const;

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
  if (type === "pdf") return <FileText className="w-4 h-4 text-[var(--color-destructive)]" />;
  if (type === "pptx" || type === "ppt") return <Presentation className="w-4 h-4 text-orange-400" />;
  if (type === "docx" || type === "doc") return <FileText className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-[var(--color-text-secondary)]" />;
}

function statusBadge(status: Material["status"]) {
  if (status === "ready") return (
    <span className="flex items-center gap-1 text-[var(--color-success)] text-xs font-medium">
      <CheckCircle className="w-3 h-3" /> Hazır
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-[var(--color-warning)] text-xs font-medium animate-pulse">
      <Clock className="w-3 h-3" /> İşleniyor
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[var(--color-destructive)] text-xs font-medium">
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
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [driveHandshake, setDriveHandshake] = useState<HandshakeStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveReauthRequired, setDriveReauthRequired] = useState(false);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [driveMissingConfig, setDriveMissingConfig] = useState<string[]>([]);
  const [driveStatusMessage, setDriveStatusMessage] = useState("");
  const [driveLoading, setDriveLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Genel");
  const [selectedMaterialType, setSelectedMaterialType] =
    useState<(typeof MATERIAL_TYPES)[number]>("Genel");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "processing" | "failed">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lastDriveImport, setLastDriveImport] = useState<DriveImportTarget | null>(null);
  const [lastDriveImportReason, setLastDriveImportReason] = useState<string | null>(null);
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
        setLibraryFiles(Array.isArray(data.library?.files) ? data.library.files : []);
        setDriveHandshake(data.managedDrive?.handshake ?? null);
      }
      if (driveRes.ok) {
        const d = await driveRes.json();
        const configured = d.configured !== false;
        setDriveConfigured(configured);
        setDriveMissingConfig(Array.isArray(d.missingConfig) ? d.missingConfig : []);
        setDriveConnected(configured ? (d.connected ?? false) : false);
        setDriveReauthRequired(configured ? (d.reauthRequired ?? false) : false);
        setDriveStatusMessage(
          typeof d.message === "string" && d.message.length > 0
            ? d.message
            : configured
              ? d.reauthRequired
                ? "Drive oturumu yenilenmeli. Devam etmek için bağlantıyı tekrar kurun."
                : d.connected
                  ? "Drive hesabı bağlı. Dosya seçerek içe aktarabilirsiniz."
                  : "Drive hesabı bağlı değil. İçeri aktarmak için önce bağlanın."
              : "Google Drive OAuth yapılandırması eksik.",
        );
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
    const reason = params.get("reason");
    if (gdriveParam === "connected" || driveParam === "connected") {
      setSuccessMsg("Google Drive başarıyla bağlandı!");
      setDriveConnected(true);
      setDriveReauthRequired(false);
      setDriveStatusMessage("Drive hesabı bağlı. Dosya seçerek içe aktarabilirsiniz.");
      window.history.replaceState({}, "", "/materials");
    } else if (gdriveParam === "error" || driveParam === "error") {
      setSuccessMsg("");
      const message = getDriveErrorMessage(reason);
      setErrorMsg(message);
      setDriveStatusMessage(message);
      if (reason === "invalid_state" || reason === "token_exchange") {
        setDriveConnected(false);
        setDriveReauthRequired(true);
      }
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
    form.append("materialType", selectedMaterialType);

    try {
      const res = await fetch("/api/materials/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Yükleme sırasında hata oluştu.");
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

  const importDriveMaterial = useCallback(
    async (target: DriveImportTarget) => {
      setLastDriveImport(target);
      setLastDriveImportReason(null);
      setSuccessMsg("");
      setErrorMsg("");
      setDriveStatusMessage("Drive aktarımı başlatılıyor...");

      try {
        const res = await fetch("/api/materials/gdrive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: target.fileId,
            fileName: target.fileName,
            branch: target.branch,
            materialType: target.materialType,
          }),
        });
        const d = await res.json();

        if (d.success) {
          setErrorMsg("");
          setLastDriveImportReason(null);
          if (d.status === "exists") {
            setSuccessMsg(d.message ?? "Bu Drive dosyası zaten eklenmiş.");
          } else {
            const displayName = d.name ?? target.fileName;
            setSuccessMsg(`"${displayName}" Drive'dan aktarılıyor...`);
          }
          setDriveStatusMessage("Drive aktarımı kuyruğa alındı.");
          fetchData();
          setTimeout(() => setSuccessMsg(""), 5000);
          return;
        }

        if (d.needsConnection) {
          setDriveConnected(false);
          setDriveReauthRequired(true);
        }
        if (d.reauthRequired) {
          setDriveConnected(false);
          setDriveReauthRequired(true);
        }

        const reason = typeof d.reason === "string" ? d.reason : null;
        const message = reason ? getDriveImportErrorMessage(reason) : d.error || "Hata oluştu.";
        setLastDriveImportReason(reason);
        setErrorMsg(message);
        setDriveStatusMessage(message);
      } catch {
        setLastDriveImportReason("download_failed");
        setErrorMsg("Drive aktarımı sırasında bir hata oluştu.");
        setDriveStatusMessage("Drive aktarımı sırasında bir hata oluştu.");
      }
    },
    [fetchData],
  );

  const retryLastDriveImport = useCallback(() => {
    if (!lastDriveImport) return;
    setErrorMsg("");
    setSuccessMsg("");
    void importDriveMaterial(lastDriveImport);
  }, [importDriveMaterial, lastDriveImport]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(uploadFile);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove("border-[var(--color-primary)]", "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]");
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
      if (data.configured === false) {
        setDriveConfigured(false);
        setDriveMissingConfig(Array.isArray(data.missingConfig) ? data.missingConfig : []);
        setDriveStatusMessage(
          "Google Drive OAuth yapılandırması eksik: " +
          (Array.isArray(data.missingConfig) && data.missingConfig.length > 0
            ? data.missingConfig.join(", ")
            : "Drive OAuth env değişkenleri"),
        );
        setErrorMsg(
          "Google yapılandırması eksik: " +
          (Array.isArray(data.missingConfig) && data.missingConfig.length > 0
            ? data.missingConfig.join(", ")
            : "Drive OAuth env değişkenleri"),
        );
        return;
      }
      if (!res.ok) {
        setDriveStatusMessage(data.error ?? "Drive bağlantısı başlatılamadı.");
        setErrorMsg(data.error ?? "Drive bağlantısı başlatılamadı.");
        return;
      }
      if (data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      setDriveStatusMessage(data.message ?? "Drive bağlantısı için sistem yapılandırması eksik.");
      setErrorMsg(data.message ?? "Drive bağlantısı için sistem yapılandırması eksik.");
    } catch {
      setDriveStatusMessage("Drive bağlantısı başlatılamadı.");
      setErrorMsg("Drive bağlantısı başlatılamadı.");
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
      setErrorMsg("Geçerli bir Drive dosya linki veya ID girin.");
      return;
    }

    const fileName = prompt("Dosya adı (opsiyonel):") || "Drive Dosyası";
    void importDriveMaterial({
      fileId: fileId.trim(),
      fileName,
      branch: selectedBranch,
      materialType: selectedMaterialType,
    });
  };

  // ─── Sil ─────────────────────────────────────────────────────────────────
  const deleteMat = async (id: string) => {
    await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const addMarkToMaterial = async (material: Material) => {
    const slideNoInput = prompt("Sayfa/Slayt numarası (opsiyonel):", "");
    const note = prompt("İşaret notu:", "");
    if (!note) return;
    const parsedSlideNo = slideNoInput ? Number(slideNoInput) : null;
    try {
      const res = await fetch(`/api/materials/${material.id}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideNo: Number.isFinite(parsedSlideNo) ? parsedSlideNo : null,
          note,
          color: "yellow",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "İşaret kaydedilemedi.");
        return;
      }
      setSuccessMsg("İşaret kaydedildi.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setErrorMsg("İşaret eklenirken hata oluştu.");
    }
  };

  // ─── Filtrele ─────────────────────────────────────────────────────────────
  const filtered = materials.filter((m) =>
    filterStatus === "all" ? true : m.status === filterStatus,
  );
  const driveRecoveryActions = lastDriveImportReason
    ? getDriveRecoveryActions(lastDriveImportReason)
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen rounded-2xl border p-6 shadow-sm" style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[var(--color-text-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Materyallerim</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">PDF, sunum ve dökümanlarınızı AI ile kullanın</p>
          </div>
        </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Başarı mesajı */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-[var(--color-success)] text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--color-destructive) 30%, transparent)", backgroundColor: "color-mix(in srgb, var(--color-destructive) 10%, transparent)", color: "var(--color-destructive)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          <div className="ml-auto flex items-center gap-2">
            {lastDriveImport && lastDriveImportReason && (
              <>
                {driveRecoveryActions.includes("retry") && (
                  <button
                    onClick={retryLastDriveImport}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: "color-mix(in srgb, var(--color-destructive) 30%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--color-destructive) 14%, transparent)",
                      color: "var(--color-destructive)",
                    }}
                  >
                    Tekrar Dene
                  </button>
                )}
                {driveRecoveryActions.includes("connect") && (
                  <button
                    onClick={() => void connectDrive()}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                      color: "var(--color-primary)",
                    }}
                  >
                    Drive'ı Yeniden Bağla
                  </button>
                )}
              </>
            )}
            <button onClick={() => setErrorMsg("")} className="rounded-lg p-1 transition-colors hover:bg-[var(--color-surface-elevated)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Toplam Dosya", value: stats.total, icon: <File className="w-5 h-5 text-[var(--color-primary)]" /> },
          { label: "Toplam Chunk", value: stats.chunks.toLocaleString("tr"), icon: <Layers className="w-5 h-5 text-[var(--color-primary)]" /> },
          { label: "Konu Dalları", value: stats.branches, icon: <BarChart2 className="w-5 h-5 text-pink-400" /> },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-elevated)] flex items-center justify-center">{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Depolama Kota Widget */}
      {quota && (
        <div className="mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Depolama Kotası</span>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <Zap className="w-3 h-3" />
              Ek Depolama Al
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-2">
            <span>{formatBytes(quota.usedBytes)} kullanıldı</span>
            <span className="text-[var(--color-text-secondary)]">{formatBytes(quota.quotaBytes)} toplam</span>
          </div>
          <div className="w-full h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quota.quotaPct}%`,
                background:
                  quota.quotaPct >= 80
                    ? "linear-gradient(90deg, var(--color-warning), var(--color-destructive))"
                    : "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
              }}
            />
          </div>
          <div className="mt-1.5 text-right">
            <span
              className="text-xs font-medium"
              style={{ color: quota.quotaPct >= 80 ? "var(--color-warning)" : "var(--color-primary)" }}
            >
              %{quota.quotaPct} dolu
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Yükleme alanı */}
        <div className="space-y-4">
          {/* Materyal tipi seçici */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <label className="mb-2 block text-xs text-[var(--color-text-secondary)]">Materyal Türü</label>
            <select
              value={selectedMaterialType}
              onChange={(e) =>
                setSelectedMaterialType(
                  e.target.value as (typeof MATERIAL_TYPES)[number],
                )
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none"
            >
              {MATERIAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Branch seçici */}
          <div className="relative">
            <button
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="w-full flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/50 transition-colors"
            >
              <span className="text-[var(--color-text-primary)]">Dal: <span className="text-[var(--color-text-primary)] font-medium">{selectedBranch}</span></span>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
            {showBranchDropdown && (
              <div className="absolute z-50 top-full mt-1 w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-auto max-h-60 shadow-2xl">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    onClick={() => { setSelectedBranch(b); setShowBranchDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-surface-elevated)] transition-colors ${selectedBranch === b ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"}`}
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
            onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("border-[var(--color-primary)]", "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"); }}
            onDragLeave={() => dropRef.current?.classList.remove("border-[var(--color-primary)]", "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]")}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary-hover)]/5 transition-all"
          >
            <Upload className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" />
            <p className="text-[var(--color-text-primary)] font-medium mb-1">Dosya Yükle</p>
            <p className="text-[var(--color-text-secondary)] text-xs mb-3">PDF, PPTX, DOCX, TXT — max 50 MB</p>
            <p className="text-[var(--color-text-secondary)] text-[11px] mb-3">
              Secili tur: <span className="text-[var(--color-primary)] font-medium">{selectedMaterialType}</span>
            </p>
            <button
              disabled={uploading}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-primary)] text-sm rounded-lg transition-colors disabled:opacity-50"
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
            <div className="bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[var(--color-primary)]/30 rounded-xl px-4 py-3 text-sm text-[var(--color-primary)]">
              {uploadProgress}
            </div>
          )}

          {/* Google Drive */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, transparent)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-elevated)] flex items-center justify-center text-xs">
                  G
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Google Drive</span>
              </div>
              {!driveConfigured ? (
                <span className="text-xs text-[var(--color-warning)] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Yapılandırma eksik
                </span>
              ) : driveConnected ? (
                <span className="text-xs text-[var(--color-success)] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Bağlı
                </span>
              ) : driveReauthRequired ? (
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-warning)" }}>
                  <AlertCircle className="w-3 h-3" /> Yeniden bağlanmalı
                </span>
              ) : (
                <span className="text-xs text-[var(--color-text-secondary)]">Bağlı değil</span>
              )}
            </div>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {driveStatusMessage}
            </p>
            {driveHandshake && (
              <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                Service JSON: {driveHandshake.serviceAccountFilePresent ? "OK" : "Eksik"} · Root ID: {driveHandshake.rootFolderConfigured ? "OK" : "Eksik"} · Root erişimi: {driveHandshake.rootFolderReachable ? "OK" : "Yok"}
              </div>
            )}

            {!driveConfigured ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm opacity-60 cursor-not-allowed"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-warning) 28%, transparent)",
                    color: "var(--color-warning)",
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  Google Yapılandırması Eksik
                </button>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Eksik alanlar: {driveMissingConfig.length > 0 ? driveMissingConfig.join(", ") : "Drive OAuth ayarları"}
                </p>
                <button
                  onClick={() => void connectDrive()}
                  disabled={driveLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 28%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  <LinkIcon className="w-4 h-4" />
                  Yapılandırmayı Kontrol Et
                </button>
              </div>
            ) : driveConnected ? (
              <div className="space-y-2">
                <button
                  onClick={openDrivePicker}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-yellow-400" />
                  Drive'dan Seç
                </button>
                {lastDriveImport && lastDriveImportReason && (
                  <button
                    onClick={retryLastDriveImport}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--color-warning) 24%, transparent)",
                      color: "var(--color-warning)",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Son Drive Aktarımını Tekrar Dene
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={connectDrive}
                  disabled={driveLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 28%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  <LinkIcon className="w-4 h-4" />
                  {driveLoading
                    ? "Yönlendiriliyor..."
                    : driveReauthRequired
                      ? "Drive'ı Yeniden Bağla"
                      : "Drive'ı Bağla"}
                </button>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {driveReauthRequired
                    ? "Eski Drive oturumu geçersiz. Devam etmek için bağlantıyı yenileyin."
                    : "Drive dosyalarını içe aktarmak için önce hesabınızı bağlayın."}
                </p>
                {lastDriveImport && lastDriveImportReason && (
                  <button
                    onClick={retryLastDriveImport}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--color-warning) 14%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--color-warning) 24%, transparent)",
                      color: "var(--color-warning)",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Son Denemeyi Tekrarla
                  </button>
                )}
              </div>
            )}
          </div>

          {/* AI Kullanım İpuçları */}
          <div className="bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-2">AI ile Kullanım</h3>
            <ul className="space-y-1.5 text-xs text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-1.5"><span className="text-[var(--color-primary)] mt-0.5">•</span>Soru bankasında "materyallerimden" seçeneğini aktif edin</li>
              <li className="flex items-start gap-1.5"><span className="text-[var(--color-primary)] mt-0.5">•</span>Flashcard oluşturucu yüklediğiniz konulardan kart üretir</li>
              <li className="flex items-start gap-1.5"><span className="text-[var(--color-primary)] mt-0.5">•</span>AI Asistan otomatik olarak materyallerinizi referans alır</li>
              <li className="flex items-start gap-1.5"><span className="text-[var(--color-primary)] mt-0.5">•</span>OSCE vakası materyallerinize göre özelleştirilir</li>
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
                    ? "bg-[var(--color-primary)] text-[var(--color-text-primary)]"
                    : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]"
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
            <div className="text-center py-16 text-[var(--color-text-secondary)]">
              <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin opacity-50" />
              Yükleniyor...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-secondary)]" />
              <p className="text-[var(--color-text-secondary)] font-medium">
                {filterStatus === "all" ? "Henüz materyal yüklenmedi" : "Bu filtrede materyal yok"}
              </p>
              {filterStatus === "all" && (
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                  Sol taraftan PDF veya sunum yükleyerek başlayın
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((mat) => (
                <div
                  key={mat.id}
                  className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 hover:border-white/20 transition-all flex items-center gap-3"
                >
                  {/* İkon */}
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-elevated)] flex items-center justify-center shrink-0">
                    {fileTypeIcon(mat.type)}
                  </div>

                  {/* Bilgi */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{mat.name}</span>
                      {mat.source === "gdrive" && (
                        <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 rounded">Drive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      {statusBadge(mat.status)}
                      <span className="text-[var(--color-text-secondary)]">·</span>
                      <span className="text-[var(--color-primary)]/80">{mat.branch}</span>
                      {mat.chunkCount > 0 && (
                        <>
                          <span className="text-[var(--color-text-secondary)]">·</span>
                          <span>{mat.chunkCount} chunk</span>
                        </>
                      )}
                      {mat.pageCount && (
                        <>
                          <span className="text-[var(--color-text-secondary)]">·</span>
                          <span>{mat.pageCount} sayfa</span>
                        </>
                      )}
                      <span className="text-[var(--color-text-secondary)]">·</span>
                      <span>{formatBytes(mat.sizeBytes)}</span>
                    </div>
                    {mat.errorMessage && (
                      <p className="text-xs text-[var(--color-destructive)] mt-0.5 truncate">{mat.errorMessage}</p>
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => void addMarkToMaterial(mat)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-yellow-300 transition-colors"
                      title="İşaret ekle"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                    </button>
                    {mat.driveWebViewLink && (
                      <a
                        href={mat.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        title="İndirmeden önizle"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {deleteConfirm === mat.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMat(mat.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-[var(--color-destructive)] rounded-lg transition-colors"
                        >
                          Evet
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-lg transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(mat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-secondary)] hover:text-[var(--color-destructive)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">01_library (Salt Okunur)</h3>
              <span className="text-xs text-[var(--color-text-secondary)]">{libraryFiles.length} dosya</span>
            </div>
            <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
              Bu alandaki dosyaları sadece görüntüleyebilirsiniz. Silme ve değiştirme kapalıdır.
            </p>
            <div className="space-y-1">
              {libraryFiles.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">{item.name}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">{item.bucket}</p>
                  </div>
                  {item.webViewLink ? (
                    <a
                      href={item.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md px-2 py-1 text-[11px] text-[var(--color-primary)] hover:bg-[var(--color-surface-elevated)]"
                    >
                      Aç
                    </a>
                  ) : (
                    <span className="text-[11px] text-[var(--color-text-secondary)]">Link yok</span>
                  )}
                </div>
              ))}
              {libraryFiles.length === 0 && (
                <p className="text-xs text-[var(--color-text-secondary)]">Kütüphane klasörlerinde henüz dosya görünmüyor.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      <Dialog
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Ek Depolama"
        description="Depolama alanınızı genişletin"
      >
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Yakında! Pro pakete geçerek <span className="text-[var(--color-primary)] font-semibold">2 GB</span> depolama alanı elde edebilirsiniz.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowUpgradeModal(false)} className="flex-1">
            Kapat
          </Button>
          <a href="/upgrade" className="flex-1">
            <Button variant="primary" size="sm" className="w-full">Pro&apos;ya Geç</Button>
          </a>
        </div>
      </Dialog>
    </>
  );
}
