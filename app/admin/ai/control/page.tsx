"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import type {
  ModuleStudioInput,
  ModuleStudioPrimarySurface,
  ModuleStudioRouteMode,
  ModuleStudioSpec,
} from "@/lib/ai/module-studio-schema";
import {
  BrainCircuit,
  Zap,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Save,
  Wand2,
  Download,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { updateRawSetting, getRawSettings } from "@/lib/actions/settings";

const MODELS = [
  {
    id: "FAST",
    label: "FAST (Gemini 2.5 Pro)",
    description: "gemini-2.5-pro — Yuksek kalite, daha pahali mod",
    badge: "Pro" as const,
    badgeVariant: "warning" as const,
    accentColor: "var(--color-primary)",
  },
  {
    id: "EFFICIENT",
    label: "Verimli (Gemini 2.5 Flash)",
    description: "gemini-2.5-flash — Dusuk maliyet, yuksek hiz",
    badge: "Ekonomik" as const,
    badgeVariant: "default" as const,
    accentColor: "var(--color-secondary)",
  },
];

const STUDIO_DEFAULTS: ModuleStudioInput = {
  moduleName: "",
  prompt: "Klinik ogrenme akisini hizlandiracak, AI destekli ama kontrollu cikti ureten yeni bir calisma modulu tasarla.",
  targetPackage: "pro",
  primarySurface: "ai",
  routeMode: "top-level",
  includeAi: true,
  includeRag: false,
  includeHistory: true,
  includeUpload: false,
};

const PACKAGE_OPTIONS: Array<{ value: ModuleStudioInput["targetPackage"]; label: string }> = [
  { value: "ucretsiz", label: "Ucretsiz" },
  { value: "giris", label: "Giris" },
  { value: "pro", label: "Pro" },
  { value: "kurumsal", label: "Kurumsal" },
];

const SURFACE_OPTIONS: Array<{ value: ModuleStudioPrimarySurface; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "tools", label: "Araclar" },
  { value: "ai", label: "AI Alanlari" },
  { value: "source", label: "Kaynaklar" },
  { value: "exams", label: "Sinavlar" },
];

const ROUTE_OPTIONS: Array<{ value: ModuleStudioRouteMode; label: string }> = [
  { value: "top-level", label: "Top-level route" },
  { value: "nested", label: "Nested workspace" },
];

interface GlobalAISettings {
  activeModel: "FAST" | "EFFICIENT";
  globalEnabled: boolean;
  streamingEnabled: boolean;
  moderationEnabled: boolean;
  maxTokensPerRequest: number;
  dailyGlobalLimit: number;
  temperaturePreset: "conservative" | "balanced" | "creative";
  orchestrationMode: "balanced" | "cost" | "quality";
  moduleModelOverridesJson: string;
  moduleOutputOverridesJson: string;
  historyItemsLimit: number;
  historyItemChars: number;
  ragContextChars: number;
  systemPromptAddon: string;
}

const DEFAULTS: GlobalAISettings = {
  activeModel: "EFFICIENT",
  globalEnabled: true,
  streamingEnabled: true,
  moderationEnabled: true,
  maxTokensPerRequest: 512,
  dailyGlobalLimit: 10000,
  temperaturePreset: "balanced",
  orchestrationMode: "balanced",
  moduleModelOverridesJson: '{\n  "ai-diagnosis": "EFFICIENT",\n  "akilli-asistan": "EFFICIENT"\n}',
  moduleOutputOverridesJson: '{\n  "osce-evaluate": 900,\n  "mentor": 450\n}',
  historyItemsLimit: 4,
  historyItemChars: 700,
  ragContextChars: 1600,
  systemPromptAddon: "",
};

const DB_KEYS = [
  "ai_active_model",
  "ai_temperature",
  "ai_max_tokens",
  "ai_daily_global_limit",
  "ai_streaming_enabled",
  "ai_moderation_enabled",
  "ai_global_enabled",
  "ai_orchestration_mode",
  "ai_module_model_overrides",
  "ai_module_output_overrides",
  "ai_history_items_limit",
  "ai_history_item_chars",
  "ai_rag_context_chars",
  "ai_system_prompt_addon",
];

const TEMP_LABELS = {
  conservative: { label: "Muhafazakar", description: "Guvenli, ongorulebilir yanitlar", color: "var(--color-success)" },
  balanced: { label: "Dengeli", description: "Varsayilan klinik mod", color: "var(--color-primary)" },
  creative: { label: "Yaratici", description: "Daha genis, kesifsel yanitlar", color: "var(--color-warning)" },
};

function settingsFromMap(map: Record<string, string>): GlobalAISettings {
  const activeModel = (map.ai_active_model as "FAST" | "EFFICIENT") || DEFAULTS.activeModel;
  const temperaturePreset = (map.ai_temperature as "conservative" | "balanced" | "creative") || DEFAULTS.temperaturePreset;
  const maxTokensPerRequest = map.ai_max_tokens ? parseInt(map.ai_max_tokens, 10) : DEFAULTS.maxTokensPerRequest;
  const dailyGlobalLimit = map.ai_daily_global_limit ? parseInt(map.ai_daily_global_limit, 10) : DEFAULTS.dailyGlobalLimit;
  const streamingEnabled = map.ai_streaming_enabled != null ? map.ai_streaming_enabled === "true" : DEFAULTS.streamingEnabled;
  const moderationEnabled = map.ai_moderation_enabled != null ? map.ai_moderation_enabled === "true" : DEFAULTS.moderationEnabled;
  const globalEnabled = map.ai_global_enabled != null ? map.ai_global_enabled === "true" : DEFAULTS.globalEnabled;
  const orchestrationMode =
    map.ai_orchestration_mode === "cost" || map.ai_orchestration_mode === "quality" || map.ai_orchestration_mode === "balanced"
      ? (map.ai_orchestration_mode as GlobalAISettings["orchestrationMode"])
      : DEFAULTS.orchestrationMode;
  const historyItemsLimit = map.ai_history_items_limit ? parseInt(map.ai_history_items_limit, 10) : DEFAULTS.historyItemsLimit;
  const historyItemChars = map.ai_history_item_chars ? parseInt(map.ai_history_item_chars, 10) : DEFAULTS.historyItemChars;
  const ragContextChars = map.ai_rag_context_chars ? parseInt(map.ai_rag_context_chars, 10) : DEFAULTS.ragContextChars;
  const moduleModelOverridesJson = map.ai_module_model_overrides || DEFAULTS.moduleModelOverridesJson;
  const moduleOutputOverridesJson = map.ai_module_output_overrides || DEFAULTS.moduleOutputOverridesJson;
  const systemPromptAddon = map.ai_system_prompt_addon || DEFAULTS.systemPromptAddon;
  return {
    activeModel,
    globalEnabled,
    streamingEnabled,
    moderationEnabled,
    maxTokensPerRequest,
    dailyGlobalLimit,
    temperaturePreset,
    orchestrationMode,
    moduleModelOverridesJson,
    moduleOutputOverridesJson,
    historyItemsLimit,
    historyItemChars,
    ragContextChars,
    systemPromptAddon,
  };
}

export default function AdminAIControlPage() {
  const [settings, setSettings] = useState<GlobalAISettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studioInput, setStudioInput] = useState<ModuleStudioInput>(STUDIO_DEFAULTS);
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioSpec, setStudioSpec] = useState<ModuleStudioSpec | null>(null);
  const [studioWarnings, setStudioWarnings] = useState<string[]>([]);

  useEffect(() => {
    getRawSettings(DB_KEYS)
      .then((map) => {
        setSettings(settingsFromMap(map));
      })
      .catch(() => {
        toast.error("Ayarlar yuklenemedi");
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof GlobalAISettings>(key: K, value: GlobalAISettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateStudio<K extends keyof ModuleStudioInput>(key: K, value: ModuleStudioInput[K]) {
    setStudioInput((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      JSON.parse(settings.moduleModelOverridesJson || "{}");
      JSON.parse(settings.moduleOutputOverridesJson || "{}");
      await Promise.all([
        updateRawSetting("ai_active_model", settings.activeModel),
        updateRawSetting("ai_temperature", settings.temperaturePreset),
        updateRawSetting("ai_max_tokens", String(settings.maxTokensPerRequest)),
        updateRawSetting("ai_daily_global_limit", String(settings.dailyGlobalLimit)),
        updateRawSetting("ai_streaming_enabled", settings.streamingEnabled ? "true" : "false"),
        updateRawSetting("ai_moderation_enabled", settings.moderationEnabled ? "true" : "false"),
        updateRawSetting("ai_global_enabled", settings.globalEnabled ? "true" : "false"),
        updateRawSetting("ai_orchestration_mode", settings.orchestrationMode),
        updateRawSetting("ai_module_model_overrides", settings.moduleModelOverridesJson),
        updateRawSetting("ai_module_output_overrides", settings.moduleOutputOverridesJson),
        updateRawSetting("ai_history_items_limit", String(settings.historyItemsLimit)),
        updateRawSetting("ai_history_item_chars", String(settings.historyItemChars)),
        updateRawSetting("ai_rag_context_chars", String(settings.ragContextChars)),
        updateRawSetting("ai_system_prompt_addon", settings.systemPromptAddon),
      ]);
      toast.success("AI ayarlari kaydedildi");
    } catch {
      toast.error("Ayarlar kaydedilemedi (JSON formatini kontrol edin)");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(DEFAULTS);
    toast("Varsayilan ayarlara donduruldu");
  }

  async function handleGenerateModuleSpec() {
    setStudioLoading(true);
    try {
      const response = await fetch("/api/admin/ai/module-studio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studioInput),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Module Studio uretimi basarisiz oldu.");
      }

      setStudioSpec(payload.spec as ModuleStudioSpec);
      setStudioWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      toast.success(payload.spec?.meta?.source === "ai" ? "AI destekli spec hazir" : "Template spec hazir");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Module Studio istegi basarisiz oldu");
    } finally {
      setStudioLoading(false);
    }
  }

  async function handleCopySpecJson() {
    if (!studioSpec) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(studioSpec, null, 2));
      toast.success("Spec JSON panoya kopyalandi");
    } catch {
      toast.error("Spec JSON kopyalanamadi");
    }
  }

  function handleDownloadSpec() {
    if (!studioSpec) return;
    const blob = new Blob([JSON.stringify(studioSpec, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${studioSpec.overview.slug}-module-spec.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Ayarlar yukleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-10">
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            AI Kontrol Paneli
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Platform genelindeki AI modellerini, davranislarini ve kontrollu modul taslaklarini yonetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw size={14} />
            Sifirla
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
            <Save size={14} />
            Kaydet
          </Button>
        </div>
      </div>

      <Toggle
        checked={settings.globalEnabled}
        label="Platform Geneli AI"
        description="Tum kullanicilar icin AI ozelliklerini etkinlestir veya devre disi birak."
        onClick={() => update("globalEnabled", !settings.globalEnabled)}
        className={settings.globalEnabled ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]" : ""}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <BrainCircuit size={13} />
          Aktif Model
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODELS.map((model) => {
            const isSelected = settings.activeModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => update("activeModel", model.id as "FAST" | "EFFICIENT")}
                className="text-left rounded-xl p-5 transition-all duration-150"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  border: isSelected ? `2px solid ${model.accentColor}` : "2px solid var(--color-border)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-base font-bold" style={{ color: isSelected ? model.accentColor : "var(--color-text-primary)" }}>
                    {model.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && <Badge variant="success">Aktif</Badge>}
                    <Badge variant={model.badgeVariant}>{model.badge}</Badge>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {model.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <Zap size={13} />
          Yanit Tonu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.entries(TEMP_LABELS) as [keyof typeof TEMP_LABELS, typeof TEMP_LABELS[keyof typeof TEMP_LABELS]][]).map(([key, val]) => {
            const isSelected = settings.temperaturePreset === key;
            return (
              <button
                key={key}
                onClick={() => update("temperaturePreset", key)}
                className="text-left rounded-xl p-4 transition-all duration-150"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  border: isSelected ? `2px solid ${val.color}` : "2px solid var(--color-border)",
                }}
              >
                <p className="text-sm font-bold mb-1" style={{ color: isSelected ? val.color : "var(--color-text-primary)" }}>
                  {val.label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {val.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <BarChart2 size={13} />
          Limitler
        </h2>
        <div
          className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5"
          style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Istek Basina Maks. Token
            </label>
            <input
              type="number"
              min={256}
              max={1024}
              step={128}
              value={settings.maxTokensPerRequest}
              onChange={(e) => update("maxTokensPerRequest", parseInt(e.target.value, 10) || DEFAULTS.maxTokensPerRequest)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Onerilen: 384-512 (minimum maliyet)</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Gunluk Global AI Limiti
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={settings.dailyGlobalLimit}
              onChange={(e) => update("dailyGlobalLimit", parseInt(e.target.value, 10) || 10000)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Tum kullanicilar icin toplam gunluk limit</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <BrainCircuit size={13} />
          Merkezi Orkestrasyon
        </h2>
        <div
          className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5"
          style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Orkestrasyon Modu
            </label>
            <select
              value={settings.orchestrationMode}
              onChange={(e) => update("orchestrationMode", e.target.value as GlobalAISettings["orchestrationMode"])}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            >
              <option value="balanced">Dengeli</option>
              <option value="cost">Maliyet Odakli</option>
              <option value="quality">Kalite Odakli</option>
            </select>
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
              Alt moduller icin model yonlendirme davranisi
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              History Satir Limiti
            </label>
            <input
              type="number"
              min={4}
              max={4}
              value={settings.historyItemsLimit}
              onChange={() => update("historyItemsLimit", 4)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
              Guvenlik geregi sabit: sadece son 4 mesaj
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              History Satir Karakter Limiti
            </label>
            <input
              type="number"
              min={200}
              max={2000}
              step={50}
              value={settings.historyItemChars}
              onChange={(e) => update("historyItemChars", parseInt(e.target.value, 10) || DEFAULTS.historyItemChars)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              RAG Context Karakter Limiti
            </label>
            <input
              type="number"
              min={400}
              max={6000}
              step={100}
              value={settings.ragContextChars}
              onChange={(e) => update("ragContextChars", parseInt(e.target.value, 10) || DEFAULTS.ragContextChars)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <BarChart2 size={13} />
          Modul Yonlendirme (JSON)
        </h2>
        <div
          className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5"
          style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Modul Model Override
            </label>
            <textarea
              rows={8}
              value={settings.moduleModelOverridesJson}
              onChange={(e) => update("moduleModelOverridesJson", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Modul Output Token Override
            </label>
            <textarea
              rows={8}
              value={settings.moduleOutputOverridesJson}
              onChange={(e) => update("moduleOutputOverridesJson", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <ShieldAlert size={13} />
          Merkezi Prompt Eklentisi
        </h2>
        <textarea
          rows={5}
          value={settings.systemPromptAddon}
          onChange={(e) => update("systemPromptAddon", e.target.value)}
          placeholder="Tum AI modullerinde sistem promptuna eklenecek merkezi kurallar..."
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <ShieldAlert size={13} />
          Ozellik Ayarlari
        </h2>
        <div className="space-y-2">
          <Toggle
            checked={settings.streamingEnabled}
            label="Streaming Yanitlar"
            description="AI yanitlarini karakter karakter aktararak kullanici deneyimini iyilestirir."
            onClick={() => update("streamingEnabled", !settings.streamingEnabled)}
          />
          <Toggle
            checked={settings.moderationEnabled}
            label="Icerik Moderasyonu"
            description="Zararli icerikleri otomatik filtrele ve uygunsuz girdileri engelle."
            onClick={() => update("moderationEnabled", !settings.moderationEnabled)}
          />
        </div>
      </div>

      <section className="space-y-4 pt-2">
        <div className="flex items-start justify-between gap-3 flex-wrap px-1">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
              <Wand2 size={13} />
              Module Studio
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Admin brief'inden guvenli bir modul spec'i uretir. Kod yazmaz; route, sidebar, access ve API taslagini indirilebilir JSON olarak sunar.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopySpecJson} disabled={!studioSpec}>
              <Copy size={14} />
              JSON Kopyala
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadSpec} disabled={!studioSpec}>
              <Download size={14} />
              JSON Indir
            </Button>
            <Button variant="primary" size="sm" onClick={handleGenerateModuleSpec} loading={studioLoading} disabled={studioLoading}>
              <Wand2 size={14} />
              Spec Uret
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Brief ve hedefler</h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Uretilen spec; page, route, sidebar, package access ve test checklist'iyle birlikte gelir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Modul adi (opsiyonel)
                </label>
                <input
                  value={studioInput.moduleName ?? ""}
                  onChange={(e) => updateStudio("moduleName", e.target.value)}
                  placeholder="Ornek: Klinik Simulasyon Koçu"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Hedef paket
                </label>
                <select
                  value={studioInput.targetPackage}
                  onChange={(e) => updateStudio("targetPackage", e.target.value as ModuleStudioInput["targetPackage"])}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                >
                  {PACKAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Ana yuzey
                </label>
                <select
                  value={studioInput.primarySurface}
                  onChange={(e) => updateStudio("primarySurface", e.target.value as ModuleStudioPrimarySurface)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
                >
                  {SURFACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Route mimarisi
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROUTE_OPTIONS.map((option) => {
                    const isSelected = studioInput.routeMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateStudio("routeMode", option.value)}
                        className="rounded-xl p-4 text-left transition-all"
                        style={{
                          backgroundColor: "var(--color-background)",
                          border: isSelected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{option.label}</span>
                          {isSelected && <Badge variant="success">Secili</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Admin brief'i
              </label>
              <textarea
                rows={8}
                value={studioInput.prompt}
                onChange={(e) => updateStudio("prompt", e.target.value)}
                placeholder="Bu modulun ne yapacagini, hedef kullaniciyi, giris-cikis akisini ve neyi profesyonel gostermesi gerektigini yazin."
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
              />
              <p className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                Ne kadar net brief verirsen, route/access/sidebar taslagi o kadar iyi oturur.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Toggle
                checked={studioInput.includeAi}
                label="AI copilot"
                description="Modul icinde AI odakli yonlendirme ve cikti katmani planla."
                onClick={() => updateStudio("includeAi", !studioInput.includeAi)}
              />
              <Toggle
                checked={studioInput.includeRag}
                label="RAG baglami"
                description="Kaynak veya materyal baglami gerekiyorsa spec'e dahil et."
                onClick={() => updateStudio("includeRag", !studioInput.includeRag)}
              />
              <Toggle
                checked={studioInput.includeHistory}
                label="History destegi"
                description="Oturum gecmisi ve yeniden kullan senaryolarini ekle."
                onClick={() => updateStudio("includeHistory", !studioInput.includeHistory)}
              />
              <Toggle
                checked={studioInput.includeUpload}
                label="Upload akisi"
                description="Materyal veya dis veri yukleme ihtiyacini checklist'e ekle."
                onClick={() => updateStudio("includeUpload", !studioInput.includeUpload)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
            >
              {!studioSpec ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)" }}>
                    <Wand2 size={20} style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <p className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Spec preview henuz uretilmedi</p>
                    <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      Brief'i gonderdiginde burada modul iskeleti, route ve access checklist'i goreceksin.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>{studioSpec.overview.name}</h3>
                        <Badge variant={studioSpec.meta.source === "ai" ? "success" : "warning"}>
                          {studioSpec.meta.source === "ai" ? "AI destekli" : "Template fallback"}
                        </Badge>
                        <Badge variant="secondary">{studioSpec.access.minimumPackage}</Badge>
                      </div>
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{studioSpec.overview.summary}</p>
                    </div>
                    <div className="text-xs text-right" style={{ color: "var(--color-text-disabled)" }}>
                      <div>{studioSpec.routing.appPath}</div>
                      <div>{studioSpec.routing.apiBasePath}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-disabled)" }}>Sidebar</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-text-primary)" }}>{studioSpec.sidebar.groupLabel}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{studioSpec.sidebar.label} / {studioSpec.sidebar.icon}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-disabled)" }}>Access</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-text-primary)" }}>{studioSpec.access.suggestedModuleKey}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{studioSpec.access.upgradeBehavior}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-disabled)" }}>Primary action</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-text-primary)" }}>{studioSpec.experience.primaryAction}</p>
                    </div>
                  </div>

                  {studioWarnings.length > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warning) 35%, var(--color-border))" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Notlar</p>
                      <ul className="space-y-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {studioWarnings.map((warning) => (
                          <li key={warning}>- {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {studioSpec && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                  >
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>UI bolumleri</h3>
                    <div className="space-y-3">
                      {studioSpec.uiSections.map((section) => (
                        <div key={section.id} className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{section.title}</p>
                            <Badge variant="outline">{section.id}</Badge>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{section.objective}</p>
                          <p className="text-xs mt-2" style={{ color: "var(--color-text-disabled)" }}>{section.uiPattern}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                  >
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Uygulama dosyalari</h3>
                    <div className="space-y-3">
                      {studioSpec.implementationFiles.map((file) => (
                        <div key={file.path} className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                          <p className="text-sm font-semibold break-all" style={{ color: "var(--color-text-primary)" }}>{file.path}</p>
                          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{file.purpose}</p>
                          <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-text-disabled)" }}>
                            {file.scaffold.map((item) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                  >
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Checklist</h3>
                    <div className="space-y-2">
                      {studioSpec.implementationChecklist.map((item) => (
                        <div key={item.id} className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.label}</p>
                            <Badge variant={item.status === "required" ? "destructive" : item.status === "recommended" ? "warning" : "outline"}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{item.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                  >
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Test ve API contract</h3>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{studioSpec.apiContract.method} {studioSpec.routing.apiBasePath}</p>
                      <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {studioSpec.apiContract.requestShape.map((row) => (
                          <li key={row}>- {row}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Test senaryolari</p>
                      <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {studioSpec.testingScenarios.map((scenario) => (
                          <li key={scenario}>- {scenario}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-5 space-y-3"
                  style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Spec JSON Preview</h3>
                    <Badge variant="outline">module-studio/v1</Badge>
                  </div>
                  <pre
                    className="rounded-xl p-4 text-xs overflow-auto max-h-[420px]"
                    style={{ backgroundColor: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    {JSON.stringify(studioSpec, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
