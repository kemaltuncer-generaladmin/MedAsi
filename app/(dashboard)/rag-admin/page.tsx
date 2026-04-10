"use client";

import { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Database, Upload, Book, Trash2, CheckCircle, RefreshCcw, FolderSync, FileText } from "lucide-react";
import toast from "react-hot-toast";

type RagStats = {
  totalChunks: number;
  totalSources: number;
  watchFolder: string;
};

type RagSource = {
  sourceKey: string;
  title: string;
  branch: string;
  fileName: string | null;
  sourcePath: string | null;
  fileHash: string | null;
  chunkCount: number;
  createdAt: string;
};

export default function AdminLibraryPage() {
  const [stats, setStats] = useState<RagStats>({
    totalChunks: 0,
    totalSources: 0,
    watchFolder: "",
  });
  const [sources, setSources] = useState<RagSource[]>([]);
  const [branch, setBranch] = useState("Genel");
  const [filePath, setFilePath] = useState("");
  const [busyAction, setBusyAction] = useState<"scan" | "ingest" | string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [statsRes, sourcesRes] = await Promise.all([
        fetch("/api/rag/stats", { cache: "no-store" }),
        fetch("/api/rag/sources", { cache: "no-store" }),
      ]);

      if (!statsRes.ok || !sourcesRes.ok) {
        throw new Error("RAG verileri alınamadı.");
      }

      const statsData = await statsRes.json();
      const sourcesData = await sourcesRes.json();
      setStats(statsData);
      setSources(sourcesData.sources ?? []);
    } catch (error) {
      console.error(error);
      toast.error("RAG verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function scanFolder() {
    setBusyAction("scan");
    try {
      const res = await fetch("/api/rag/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Klasör taranamadı.");
      toast.success(
        `${data.processed} yeni PDF işlendi, ${data.skipped} kayıt atlandı.`,
      );
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tarama başarısız.");
    } finally {
      setBusyAction(null);
    }
  }

  async function ingestSingleFile() {
    if (!filePath.trim()) {
      toast.error("PDF dosya yolu gerekli.");
      return;
    }

    setBusyAction("ingest");
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: filePath.trim(),
          branch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PDF içe aktarılamadı.");
      toast.success(
        data.skipped
          ? "Bu PDF daha önce içe aktarılmış."
          : `${data.insertedChunks} parça başarıyla işlendi.`,
      );
      setFilePath("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İçe aktarma başarısız.");
    } finally {
      setBusyAction(null);
    }
  }

  async function removeSource(sourceKey: string) {
    setBusyAction(sourceKey);
    try {
      const res = await fetch("/api/rag/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kaynak silinemedi.");
      toast.success(`${data.deletedRows} parça silindi.`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Silme başarısız.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-border)] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Database size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Kütüphane Yönetimi</h1>
            <p className="text-[var(--color-text-secondary)]">Merkezi Beyin Referans Havuzu (RAG)</p>
          </div>
        </div>
        <Badge variant="success" className="px-4 py-2 text-md">Sistem Çevrimiçi</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="bordered" className="p-6">
          <CardTitle className="text-sm opacity-60 uppercase mb-2">Toplam Referans</CardTitle>
          <div className="text-4xl font-black text-[var(--color-primary)]">{stats.totalChunks} <span className="text-sm font-normal">Parça</span></div>
        </Card>
        <Card variant="bordered" className="p-6">
          <CardTitle className="text-sm opacity-60 uppercase mb-2">Yüklü Kitaplar</CardTitle>
          <div className="text-4xl font-black text-[var(--color-secondary)]">{stats.totalSources} <span className="text-sm font-normal">PDF</span></div>
        </Card>
        <Card variant="bordered" className="p-6 bg-[var(--color-primary)]/5">
          <div className="h-full flex flex-col justify-between gap-3">
            <div>
              <CardTitle className="text-sm opacity-60 uppercase mb-2">İzlenen Klasör</CardTitle>
              <div className="text-sm font-medium break-all">{stats.watchFolder || "Yükleniyor..."}</div>
            </div>
            <Button
              className="w-full flex items-center justify-center gap-2 py-3"
              variant="secondary"
              onClick={scanFolder}
              disabled={busyAction === "scan"}
            >
              <FolderSync size={18} />
              <span>{busyAction === "scan" ? "Taranıyor..." : "Klasörü Tara"}</span>
            </Button>
          </div>
        </Card>
      </div>

      <Card variant="bordered" className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Upload size={18} /> Tekil PDF İçe Aktar</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              İstersen doğrudan tam dosya yolu ver, istersen PDF’leri `{stats.watchFolder || "~/Desktop/egit"}` klasörüne atıp tarat.
            </p>
          </div>
          <Badge variant="outline">Gemini + Supabase RAG</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_160px] gap-3">
          <input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="/Users/.../Desktop/egit/1.pdf"
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 outline-none"
          />
          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Genel"
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 outline-none"
          />
          <Button onClick={ingestSingleFile} disabled={busyAction === "ingest"} className="h-11">
            {busyAction === "ingest" ? "İşleniyor..." : "PDF Yükle"}
          </Button>
        </div>
      </Card>

      <Card variant="bordered" className="p-0 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><Book size={18} /> Kaynak Listesi</h3>
          <Button size="sm" variant="secondary" onClick={loadData}><RefreshCcw size={14} className="mr-2" /> Yenile</Button>
        </div>
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)] uppercase text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Kitap Adı</th>
                <th className="px-6 py-4">Dosya</th>
                <th className="px-6 py-4">Branş</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4">Parça</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {!loading && sources.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[var(--color-text-secondary)]" colSpan={6}>
                    Henüz kaynak eklenmedi. PDF’leri izlenen klasöre bırakıp “Klasörü Tara” diyebilirsin.
                  </td>
                </tr>
              ) : null}

              {sources.map((source) => (
                <tr key={source.sourceKey}>
                  <td className="px-6 py-4 font-medium">
                    <div>{source.title}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {new Date(source.createdAt).toLocaleString("tr-TR")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={14} />
                      <span className="max-w-[220px] truncate">{source.fileName || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge variant="outline">{source.branch}</Badge></td>
                  <td className="px-6 py-4 text-[var(--color-success)]">
                    <span className="flex items-center gap-2"><CheckCircle size={14} /> Aktif (RAG)</span>
                  </td>
                  <td className="px-6 py-4">{source.chunkCount}</td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--color-destructive)]"
                      onClick={() => removeSource(source.sourceKey)}
                      disabled={busyAction === source.sourceKey}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
