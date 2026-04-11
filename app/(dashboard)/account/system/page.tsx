"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Globe,
  Info,
  Monitor,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { applyTheme, resolveTheme, SYSTEM_KEY, type ThemeOption } from "@/lib/theme";

interface SystemPrefs {
  theme: ThemeOption;
  language: string;
}

const defaultPrefs: SystemPrefs = {
  theme: "dark",
  language: "tr",
};

function estimateStorageKb(): number {
  let total = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("medasi_")) continue;
    const value = localStorage.getItem(key) ?? "";
    total += key.length + value.length;
  }
  return Math.round(total / 1024);
}

export default function SystemPage() {
  const [prefs, setPrefs] = useState<SystemPrefs>(defaultPrefs);
  const [storageKb, setStorageKb] = useState(0);
  const [clearCacheOpen, setClearCacheOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYSTEM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SystemPrefs;
        setPrefs(parsed);
        applyTheme(parsed.theme);
      } else {
        applyTheme(defaultPrefs.theme);
      }
      setStorageKb(estimateStorageKb());
    } catch {
      applyTheme(defaultPrefs.theme);
    }
  }, []);

  function savePrefs(next: SystemPrefs) {
    setPrefs(next);
    try {
      localStorage.setItem(SYSTEM_KEY, JSON.stringify(next));
      applyTheme(next.theme);
      toast.success("Tercihler kaydedildi");
      setStorageKb(estimateStorageKb());
    } catch {
      toast.error("Tercihler kaydedilemedi");
    }
  }

  function setTheme(theme: ThemeOption) {
    savePrefs({ ...prefs, theme });
  }

  function handleClearCache() {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("medasi_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    toast.success(`${keysToRemove.length} yerel kayıt temizlendi`);
    setStorageKb(estimateStorageKb());
    setClearCacheOpen(false);
  }

  function handleDownloadData() {
    const data: Record<string, unknown> = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("medasi_")) continue;
      const value = localStorage.getItem(key);
      try {
        data[key] = value !== null ? JSON.parse(value) : null;
      } catch {
        data[key] = value;
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `medasi_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Yerel veriler indirildi");
  }

  const themeOptions = [
    { value: "dark" as const, label: "Karanlık", icon: <Moon size={14} /> },
    { value: "light" as const, label: "Açık", icon: <Sun size={14} /> },
    { value: "system" as const, label: "Sistem", icon: <Monitor size={14} /> },
  ];

  const resolvedTheme = resolveTheme(prefs.theme) === "light" ? "Açık" : "Karanlık";
  const appVersion = useMemo(() => process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0.0", []);

  return (
    <AccountSubpageShell
      icon={Monitor}
      title="Sistem"
      description="Tema, dil ve yerel veri yönetimi tercihlerinizi güvenli biçimde düzenleyin."
      stats={[
        { label: "Aktif tema", value: resolvedTheme },
        { label: "Dil", value: prefs.language === "tr" ? "Türkçe" : prefs.language },
        { label: "Yerel veri", value: `${storageKb} KB` },
        { label: "Sürüm", value: appVersion },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card variant="bordered" className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor size={16} className="text-[var(--color-primary)]" />
              Görünüm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Tema tercihini seçin. Değişiklik anında uygulanır.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const active = prefs.theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className="rounded-xl border px-3 py-3 text-sm transition"
                    style={{
                      borderColor: active
                        ? "color-mix(in srgb, var(--color-primary) 48%, var(--color-border))"
                        : "var(--color-border)",
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))"
                        : "var(--color-surface-elevated)",
                      color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    }}
                  >
                    <span className="mb-1 inline-flex items-center gap-1.5">
                      {option.icon}
                      {option.label}
                    </span>
                    {active ? <span className="block text-[10px] uppercase tracking-[0.18em]">Aktif</span> : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered" className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={16} className="text-[var(--color-primary)]" />
              Dil ve bölge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
              <span className="inline-flex items-center gap-2 text-[var(--color-text-primary)]">
                <span>🇹🇷</span> Türkçe
              </span>
              <Badge variant="default">Aktif</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 opacity-70">
              <span className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
                <span>🇬🇧</span> English
              </span>
              <Badge variant="secondary">Yakında</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="bordered" className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 size={16} className="text-[var(--color-primary)]" />
            Veri yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">Önbelleği temizle</p>
              <p className="text-[var(--color-text-secondary)]">Yerel veriler silinir, oturum etkilenmez.</p>
            </div>
            <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={() => setClearCacheOpen(true)}>
              <Trash2 size={14} />
              Temizle
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">Verileri indir</p>
              <p className="text-[var(--color-text-secondary)]">`medasi_*` kayıtlarını JSON olarak dışa aktar.</p>
            </div>
            <Button variant="ghost" size="sm" className="border border-[var(--color-border)]" onClick={handleDownloadData}>
              <Download size={14} />
              İndir
            </Button>
          </div>

          <div
            className="rounded-xl border p-3"
            style={{ borderColor: "color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium" style={{ color: "var(--color-destructive)" }}>
                  Hesabı kalıcı silme
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  Hesap silme isteği için destek ekibiyle doğrulamalı süreç yürütülür.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="border"
                style={{ borderColor: "var(--color-destructive)", color: "var(--color-destructive)" }}
                onClick={() =>
                  toast.error("Hesap silme işlemi için lütfen Destek sayfasından talep açın.", {
                    duration: 4500,
                  })
                }
              >
                <AlertTriangle size={14} />
                Destek üzerinden başlat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="bordered" className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={16} className="text-[var(--color-primary)]" />
            Uygulama bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p>Platform: Next.js 16 / React 19</p>
          <p>Sürüm: {appVersion}</p>
          <button
            className="inline-flex items-center gap-1.5 text-[var(--color-primary)] hover:underline"
            onClick={() => toast("Depo bağlantısı proje ayarına göre eklenecek", { icon: "🔗" })}
          >
            Kaynak kod
            <ExternalLink size={13} />
          </button>
        </CardContent>
      </Card>
      <Dialog
        open={clearCacheOpen}
        onClose={() => setClearCacheOpen(false)}
        title="Önbelleği temizle"
        description="Tüm medasi_* yerel verileri silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"
        onConfirm={handleClearCache}
        variant="destructive"
      />
    </AccountSubpageShell>
  );
}
