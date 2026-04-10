"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import {
  BrainCircuit,
  Zap,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { updateRawSetting, getRawSettings } from "@/lib/actions/settings";

const MODELS = [
  {
    id: "FAST",
    label: "FAST (Gemini 2.5 Flash)",
    description: "gemini-2.5-flash — Düşük maliyetli hızlı mod",
    badge: "Flash" as const,
    badgeVariant: "success" as const,
    accentColor: "var(--color-primary)",
  },
  {
    id: "EFFICIENT",
    label: "Verimli (Gemini 2.5 Flash)",
    description: "gemini-2.5-flash — Düşük maliyet, yüksek hız",
    badge: "Ekonomik" as const,
    badgeVariant: "default" as const,
    accentColor: "var(--color-secondary)",
  },
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
  conservative: { label: "Muhafazakâr", description: "Güvenli, öngörülebilir yanıtlar", color: "var(--color-success)" },
  balanced: { label: "Dengeli", description: "Varsayılan klinik mod", color: "var(--color-primary)" },
  creative: { label: "Yaratıcı", description: "Daha geniş, keşifsel yanıtlar", color: "var(--color-warning)" },
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

  useEffect(() => {
    getRawSettings(DB_KEYS)
      .then((map) => {
        setSettings(settingsFromMap(map));
      })
      .catch(() => {
        toast.error("Ayarlar yüklenemedi");
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof GlobalAISettings>(key: K, value: GlobalAISettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
      toast.success("AI ayarları kaydedildi");
    } catch {
      toast.error("Ayarlar kaydedilemedi (JSON formatını kontrol edin)");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSettings(DEFAULTS);
    toast("Varsayılan ayarlara döndürüldü");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Ayarlar yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-1 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            AI Kontrol Paneli
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Platform genelindeki AI modellerini ve davranışlarını yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw size={14} />
            Sıfırla
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
            <Save size={14} />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Global Toggle */}
      <Toggle
        checked={settings.globalEnabled}
        label="Platform Geneli AI"
        description="Tüm kullanıcılar için AI özelliklerini etkinleştir veya devre dışı bırak."
        onClick={() => update("globalEnabled", !settings.globalEnabled)}
        className={settings.globalEnabled ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]" : ""}
      />

      {/* Model Selection */}
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
                  border: isSelected
                    ? `2px solid ${model.accentColor}`
                    : "2px solid var(--color-border)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-base font-bold" style={{ color: isSelected ? model.accentColor : "var(--color-text-primary)" }}>
                    {model.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Badge variant="success">Aktif</Badge>
                    )}
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

      {/* Temperature */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <Zap size={13} />
          Yanıt Tonu
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

      {/* Limits */}
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
              İstek Başına Maks. Token
            </label>
            <input
              type="number"
              min={256}
              max={1024}
              step={128}
              value={settings.maxTokensPerRequest}
              onChange={(e) => update("maxTokensPerRequest", parseInt(e.target.value) || DEFAULTS.maxTokensPerRequest)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Önerilen: 384-512 (minimum maliyet)</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Günlük Global AI Limiti
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={settings.dailyGlobalLimit}
              onChange={(e) => update("dailyGlobalLimit", parseInt(e.target.value) || 10000)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Tüm kullanıcılar için toplam günlük limit</span>
          </div>
        </div>
      </div>

      {/* Orchestration */}
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
              <option value="cost">Maliyet Odaklı</option>
              <option value="quality">Kalite Odaklı</option>
            </select>
            <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
              Alt modüller için model yönlendirme (alt ajan routing) davranışı
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              History Satır Limiti
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
              Güvenlik gereği sabit: sadece son 4 mesaj
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              History Satır Karakter Limiti
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

      {/* Module Routing */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <BarChart2 size={13} />
          Modül Yönlendirme (JSON)
        </h2>
        <div
          className="rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5"
          style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              Modül Model Override
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
              Modül Output Token Override
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

      {/* Central Prompt */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <ShieldAlert size={13} />
          Merkezi Prompt Eklentisi
        </h2>
        <textarea
          rows={5}
          value={settings.systemPromptAddon}
          onChange={(e) => update("systemPromptAddon", e.target.value)}
          placeholder="Tüm AI modüllerinde sistem promptuna eklenecek merkezi kurallar..."
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
        />
      </div>

      {/* Feature Toggles */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2" style={{ color: "var(--color-text-disabled)" }}>
          <ShieldAlert size={13} />
          Özellik Ayarları
        </h2>
        <div className="space-y-2">
          <Toggle
            checked={settings.streamingEnabled}
            label="Streaming Yanıtlar"
            description="AI yanıtlarını karakter karakter aktararak kullanıcı deneyimini iyileştirir."
            onClick={() => update("streamingEnabled", !settings.streamingEnabled)}
          />
          <Toggle
            checked={settings.moderationEnabled}
            label="İçerik Moderasyonu"
            description="Zararlı içerikleri otomatik filtrele ve uygunsuz girdileri engelle."
            onClick={() => update("moderationEnabled", !settings.moderationEnabled)}
          />
        </div>
      </div>
    </div>
  );
}
