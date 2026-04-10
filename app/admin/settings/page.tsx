"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import {
  AlertTriangle,
  Clock,
  Server,
  Database,
  Globe,
  Shield,
  CheckCircle2,
  Loader2,
  KeyRound,
  FileText,
  Users,
  BrainCircuit,
  Settings,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSystemSettings,
  updateSystemSetting,
  type SystemSettings,
} from "@/lib/actions/settings";

const DEFAULTS: SystemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  onboardingRequired: true,
  adminLoginEnabled: true,
  orgAdminLoginEnabled: true,
  emailVerificationRequired: true,
  passwordResetEnabled: true,
  aiEnabled: true,
  aiModerationEnabled: true,
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
  aiResponseStyle: "balanced",
  aiSystemPrompt: "",
  maxUsersPerDay: 0,
  sessionTimeoutMinutes: 60,
  maxFailedLoginAttempts: 5,
  lockoutMinutes: 15,
  passwordMinLength: 8,
  accountApprovalRequired: false,
  requireProfileCompletion: false,
  debugMode: false,
  allowedEmailDomains: "",
  maintenanceMessage:
    "Sistemimiz şu anda bakım modundadır. Lütfen daha sonra tekrar deneyiniz.",
  appVersion: "1.0.0",
};

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getSystemSettings()
      .then((s) => {
        setSettings(s);
      })
      .catch(() => {
        toast.error("Sistem ayarları yüklenemedi");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function persist<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K],
  ) {
    startTransition(async () => {
      try {
        await updateSystemSetting(key, value as string | boolean | number);
        setLastSavedAt(new Date());
      } catch {
        toast.error("Ayar kaydedilemedi");
      }
    });
  }

  function handleToggle(
    key: keyof Pick<
      SystemSettings,
      | "maintenanceMode"
      | "registrationEnabled"
      | "onboardingRequired"
      | "adminLoginEnabled"
      | "orgAdminLoginEnabled"
      | "emailVerificationRequired"
      | "passwordResetEnabled"
      | "aiEnabled"
      | "aiModerationEnabled"
      | "accountApprovalRequired"
      | "requireProfileCompletion"
      | "debugMode"
    >,
  ) {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    const labelMap: Record<string, string> = {
      maintenanceMode: "Bakım modu",
      registrationEnabled: "Kayıt sistemi",
      onboardingRequired: "Onboarding",
      adminLoginEnabled: "Yönetici girişi",
      orgAdminLoginEnabled: "Org admin girişi",
      emailVerificationRequired: "E-posta doğrulama",
      passwordResetEnabled: "Şifre sıfırlama",
      aiEnabled: "AI özellikleri",
      aiModerationEnabled: "AI moderasyon",
      accountApprovalRequired: "Hesap onayı",
      requireProfileCompletion: "Profil tamamlama",
      debugMode: "Debug modu",
    };
    toast.success(`${labelMap[key]} ${newValue ? "açıldı" : "kapatıldı"}`);
    persist(key, newValue);
  }

  function handleNumberField(
    key:
      | "maxUsersPerDay"
      | "sessionTimeoutMinutes"
      | "maxFailedLoginAttempts"
      | "lockoutMinutes"
      | "passwordMinLength"
      | "aiMaxTokens",
    value: number,
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    persist(key, value);
  }

  function handleFloatField(key: "aiTemperature", value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    persist(key, value);
  }

  function handleTextBlur(
    key:
      | "allowedEmailDomains"
      | "maintenanceMessage"
      | "appVersion"
      | "aiResponseStyle"
      | "aiSystemPrompt",
  ) {
    persist(key, settings[key] as string);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--color-primary)" }}
        />
      </div>
    );
  }

  const isProduction = process.env.NODE_ENV === "production";
  const allowedDomains = settings.allowedEmailDomains
    .split(/\r?\n/)
    .map((domain) => domain.trim())
    .filter(Boolean);
  const allowedDomainCount = allowedDomains.length;
  const authSummary = settings.maintenanceMode
    ? "Bakım modu açık"
    : !settings.adminLoginEnabled && !settings.orgAdminLoginEnabled
      ? "Yönetici girişleri kapalı"
      : !settings.adminLoginEnabled
        ? "Yönetici girişi kapalı"
        : !settings.orgAdminLoginEnabled
          ? "Org admin girişi kapalı"
          : settings.registrationEnabled
            ? "Tüm girişler açık"
            : "Kayıt kapalı";
  const userSummary = settings.onboardingRequired
    ? "Onboarding zorunlu"
    : "Onboarding serbest";
  const securitySummary = settings.debugMode
    ? `Debug açık · ${settings.sessionTimeoutMinutes} dk`
    : `${settings.sessionTimeoutMinutes} dk oturum`;
  const authBadgeVariant =
    settings.maintenanceMode
      ? "destructive"
      : !settings.adminLoginEnabled || !settings.orgAdminLoginEnabled
        ? "warning"
        : settings.registrationEnabled
          ? "success"
          : "warning";

  const criticalControls = [
    {
      key: "maintenanceMode" as const,
      label: "Bakım modu",
      description: "Acil erişim kontrolü",
      accent: "var(--color-destructive)",
      tone: settings.maintenanceMode ? "destructive" : "secondary",
      icon: AlertTriangle,
    },
    {
      key: "registrationEnabled" as const,
      label: "Kayıt sistemi",
      description: "Yeni kullanıcı erişimi",
      accent: "var(--color-success)",
      tone: settings.registrationEnabled ? "success" : "secondary",
      icon: Users,
    },
    {
      key: "aiEnabled" as const,
      label: "AI özellikleri",
      description: "Platform genelinde yapay zeka",
      accent: "var(--color-warning)",
      tone: settings.aiEnabled ? "warning" : "secondary",
      icon: BrainCircuit,
    },
    {
      key: "debugMode" as const,
      label: "Debug modu",
      description: "Hata ayıklama görünümü",
      accent: "var(--color-primary)",
      tone: settings.debugMode ? "default" : "secondary",
      icon: Shield,
    },
  ];

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 px-1">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Sistem Ayarları
            </h1>
            <Badge variant="outline" className="uppercase tracking-wider">
              Yönetim Gücü
            </Badge>
          </div>
          <p
            className="max-w-3xl text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Yetki, kayıt, AI ve güvenlik ayarlarını tek yüzeyde yönetin. Değişiklikler
            veritabanına yazılır ve anında etkili olur.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="#auth"
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              Auth
            </a>
            <a
              href="#users"
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              Kullanıcı
            </a>
            <a
              href="#ai"
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              AI
            </a>
            <a
              href="#security"
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              Güvenlik
            </a>
            <a
              href="#app"
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-secondary)",
              }}
            >
              Uygulama
            </a>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isPending && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Loader2 size={12} className="animate-spin" />
              Kaydediliyor...
            </span>
          )}
          {lastSavedAt && !isPending && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--color-success)" }}
            >
              <CheckCircle2 size={12} />
              {formatTime(lastSavedAt)} kaydedildi
            </span>
          )}
          <Badge variant={isProduction ? "success" : "warning"}>
            {isProduction ? "Production" : "Development"}
          </Badge>
        </div>
      </div>

      <div
        className="flex items-start gap-3 rounded-xl px-5 py-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)",
        }}
      >
        <AlertTriangle
          size={18}
          style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--color-warning)" }}>
          Bu ayarlar tüm kullanıcıları etkiler ve anında geçerli olur. Özellikle bakım,
          kayıt ve AI kontrollerinde dikkatli olun.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: KeyRound,
            label: "Auth",
            value: authSummary,
            note:
              allowedDomainCount > 0
                ? `${allowedDomainCount} izinli domain`
                : "Domain kısıtı yok",
            accent: "var(--color-primary)",
          },
          {
            icon: Users,
            label: "Kullanıcı",
            value: userSummary,
            note:
              settings.maxUsersPerDay > 0
                ? `${settings.maxUsersPerDay}/gün kayıt limiti`
                : "Günlük limit kapalı",
            accent: "var(--color-success)",
          },
          {
            icon: BrainCircuit,
            label: "AI",
            value: settings.aiEnabled ? "AI aktif" : "AI kapalı",
            note: "Yapay zeka servisleri için ana anahtar",
            accent: "var(--color-warning)",
          },
          {
            icon: Shield,
            label: "Güvenlik",
            value: securitySummary,
            note: settings.debugMode ? "Debug görünürlüğü açık" : "Debug gizli",
            accent: isProduction ? "var(--color-success)" : "var(--color-warning)",
          },
        ].map(({ icon: Icon, label, value, note, accent }) => (
          <div
            key={label}
            className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {label}
                </p>
                <p
                  className="mt-2 text-lg font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {value}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {note}
                </p>
              </div>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
                  color: accent,
                }}
              >
                <Icon size={17} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Hızlı Kontrol Blokları
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Kritik ayarları tek tıkla açıp kapatın.
            </p>
          </div>
          <Badge variant="outline">4 kritik bayrak</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {criticalControls.map((control) => (
            <button
              key={control.key}
              type="button"
              onClick={() => handleToggle(control.key)}
              className="group flex items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: settings[control.key]
                  ? "var(--color-surface)"
                  : "var(--color-background)",
              }}
            >
              <div className="space-y-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {control.label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {control.description}
                </p>
                <Badge variant={control.tone as "default" | "success" | "warning" | "destructive" | "secondary"}>
                  {settings[control.key] ? "Açık" : "Kapalı"}
                </Badge>
              </div>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                style={{
                  backgroundColor: `color-mix(in srgb, ${control.accent} 14%, transparent)`,
                  color: control.accent,
                }}
              >
                <control.icon size={17} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div id="auth" className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2
                className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--color-text-disabled)" }}
              >
                <KeyRound size={13} />
                Auth
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Giriş kapısı, admin/org admin erişimi, kayıt ve domain izinleri.
              </p>
            </div>
            <Badge variant={authBadgeVariant}>
              {settings.maintenanceMode
                ? "Bakım etkili"
                : !settings.adminLoginEnabled && !settings.orgAdminLoginEnabled
                  ? "Yönetici girişleri kapalı"
                  : !settings.adminLoginEnabled
                    ? "Admin girişi kapalı"
                    : !settings.orgAdminLoginEnabled
                      ? "Org admin girişi kapalı"
                      : "Erişim açık"}
            </Badge>
          </div>

          <Card variant="bordered">
            <CardContent className="space-y-5 pt-0">
              <div className="space-y-4">
                <Toggle
                  checked={settings.maintenanceMode}
                  label="Bakım Modu"
                  description="Tüm kullanıcılara bakım sayfası gösterilir. Adminler erişimde kalır."
                  onClick={() => handleToggle("maintenanceMode")}
                  className={
                    settings.maintenanceMode
                      ? "border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_6%,transparent)]"
                      : ""
                  }
                />
                {settings.maintenanceMode && (
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-destructive) 8%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--color-destructive) 30%, transparent)",
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-destructive)" }}
                    >
                      Bakım Modu Mesajı
                    </p>
                    <textarea
                      rows={3}
                      value={settings.maintenanceMessage}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          maintenanceMessage: e.target.value,
                        }))
                      }
                      onBlur={() => handleTextBlur("maintenanceMessage")}
                      className="w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--color-destructive) 40%, transparent)",
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                )}
              </div>

              <Toggle
                checked={settings.registrationEnabled}
                label="Kayıt Sistemi"
                description="Yeni kullanıcıların platforma kaydolmasına izin ver."
                onClick={() => handleToggle("registrationEnabled")}
                className={
                  settings.registrationEnabled
                    ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_5%,transparent)]"
                  : ""
                }
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  checked={settings.adminLoginEnabled}
                  label="Yönetici Girişi"
                  description="`/login?mode=admin` ile yönetici girişini aç/kapat."
                  onClick={() => handleToggle("adminLoginEnabled")}
                />
                <Toggle
                  checked={settings.orgAdminLoginEnabled}
                  label="Org Admin Girişi"
                  description="Organizasyon yöneticisi giriş erişimini kontrol et."
                  onClick={() => handleToggle("orgAdminLoginEnabled")}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    İzin Verilen E-posta Domainleri
                  </label>
                  <textarea
                    rows={4}
                    value={settings.allowedEmailDomains}
                    placeholder={"Boş bırakırsanız tümüne izin verilir.\nörn:\nhastane.gov.tr\nmedasi.com.tr"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        allowedEmailDomains: e.target.value,
                      }))
                    }
                    onBlur={() => handleTextBlur("allowedEmailDomains")}
                    className="w-full rounded-md border px-3 py-2 text-sm resize-none font-mono focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                    Her satıra bir domain yazın. Boş bırakırsanız tüm domainlere izin verilir.
                  </span>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Domain Kısıtları
                    </p>
                    <Badge variant={allowedDomainCount > 0 ? "warning" : "secondary"}>
                      {allowedDomainCount > 0 ? `${allowedDomainCount} aktif` : "Açık"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {allowedDomainCount > 0 ? (
                      allowedDomains.slice(0, 4).map((domain) => (
                        <div
                          key={domain}
                          className="rounded-lg px-3 py-2 text-sm"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {domain}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        Domain filtrelemesi kapalı. Kayıt herkes için açık.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="users" className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2
                className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--color-text-disabled)" }}
              >
                <Users size={13} />
                Kullanıcı
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Onboarding ve kullanıcı hacmi kontrolü.
              </p>
            </div>
            <Badge variant={settings.onboardingRequired ? "warning" : "secondary"}>
              {settings.onboardingRequired ? "Onboarding zorunlu" : "Serbest akış"}
            </Badge>
          </div>

          <Card variant="bordered">
            <CardContent className="space-y-5 pt-0">
              <Toggle
                checked={settings.onboardingRequired}
                label="Onboarding Zorunluluğu"
                description="Yeni kullanıcıların ilk girişte onboarding adımlarını tamamlamasını zorunlu kıl."
                onClick={() => handleToggle("onboardingRequired")}
                className={
                  settings.onboardingRequired
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]"
                  : ""
                }
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  checked={settings.accountApprovalRequired ?? false}
                  label="Hesap Onayı Zorunlu"
                  description="Yeni hesaplar admin onayı olmadan aktif olmasın."
                  onClick={() => handleToggle("accountApprovalRequired")}
                />
                <Toggle
                  checked={settings.requireProfileCompletion ?? false}
                  label="Profil Tamamlama Zorunlu"
                  description="Kullanıcı paneline tam erişim için profil alanlarını zorunlu kıl."
                  onClick={() => handleToggle("requireProfileCompletion")}
                />
              </div>

              <div className="flex flex-col gap-1.5 max-w-md">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Günlük Maks. Kayıt Limiti
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={settings.maxUsersPerDay}
                    onChange={(e) =>
                      handleNumberField(
                        "maxUsersPerDay",
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                  0 = sınırsız
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="ai" className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2
                className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--color-text-disabled)" }}
              >
                <BrainCircuit size={13} />
                AI
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Yapay zeka katmanlarını ve ürün deneyimini yönetin.
              </p>
            </div>
            <Badge variant={settings.aiEnabled ? "success" : "secondary"}>
              {settings.aiEnabled ? "AI açık" : "AI kapalı"}
            </Badge>
          </div>

          <Card variant="bordered">
            <CardContent className="space-y-5 pt-0">
              <Toggle
                checked={settings.aiEnabled}
                label="AI Özellikleri"
                description="Platform genelinde tüm yapay zeka özelliklerini aç/kapat."
                onClick={() => handleToggle("aiEnabled")}
                className={
                  settings.aiEnabled
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]"
                  : ""
                }
              />

              <Toggle
                checked={settings.aiModerationEnabled ?? true}
                label="AI Moderasyonu"
                description="AI çıktılarında güvenlik/moderasyon katmanını etkin tut."
                onClick={() => handleToggle("aiModerationEnabled")}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    AI Maks. Token
                  </label>
                  <input
                    type="number"
                    min={256}
                    max={8192}
                    value={settings.aiMaxTokens ?? 4096}
                    onChange={(e) =>
                      handleNumberField(
                        "aiMaxTokens",
                        Math.max(256, parseInt(e.target.value) || 4096),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    AI Sıcaklık
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.aiTemperature ?? 0.7}
                    onChange={(e) =>
                      handleFloatField(
                        "aiTemperature",
                        Math.min(2, Math.max(0, Number(e.target.value) || 0.7)),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  AI Yanıt Stili
                </label>
                <input
                  type="text"
                  value={settings.aiResponseStyle ?? "balanced"}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, aiResponseStyle: e.target.value }))
                  }
                  onBlur={() => handleTextBlur("aiResponseStyle")}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-background)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Global AI Ek Sistem Promptu
                </label>
                <textarea
                  rows={4}
                  value={settings.aiSystemPrompt ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, aiSystemPrompt: e.target.value }))
                  }
                  onBlur={() => handleTextBlur("aiSystemPrompt")}
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-background)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div
                className="flex items-start gap-3 rounded-xl p-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 18%, transparent)",
                }}
              >
                <BrainCircuit
                  size={18}
                  style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }}
                />
                <div className="space-y-2">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    AI Kontrol Merkezi
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Model, kullanım ve moderasyon kontrolleri için ayrıntılı sayfaya geçin.
                  </p>
                  <Link
                    href="/admin/ai/control"
                    className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                    style={{ color: "var(--color-primary)" }}
                  >
                    AI kontrolüne git
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="security" className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2
                className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{ color: "var(--color-text-disabled)" }}
              >
                <Shield size={13} />
                Güvenlik
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Oturum süresi ve hata ayıklama görünürlüğü.
              </p>
            </div>
            <Badge variant={settings.debugMode ? "warning" : "secondary"}>
              {settings.debugMode ? "Debug açık" : "Debug kapalı"}
            </Badge>
          </div>

          <Card variant="bordered">
            <CardContent className="space-y-5 pt-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Oturum Zaman Aşımı
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={settings.sessionTimeoutMinutes}
                      onChange={(e) =>
                        handleNumberField(
                          "sessionTimeoutMinutes",
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                      style={{
                        borderColor: "var(--color-border)",
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <span
                      className="text-sm whitespace-nowrap"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      dakika
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
                    Hareketsizlik sonrası otomatik çıkış
                  </span>
                </div>

                <Toggle
                  checked={settings.debugMode}
                  label="Debug Modu"
                  description="Adminlere hata ayıklama bilgilerini göster."
                  onClick={() => handleToggle("debugMode")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Toggle
                  checked={settings.emailVerificationRequired ?? true}
                  label="E-posta Doğrulama"
                  description="Yeni kullanıcılar e-posta doğrulaması olmadan giriş yapamasın."
                  onClick={() => handleToggle("emailVerificationRequired")}
                />
                <Toggle
                  checked={settings.passwordResetEnabled ?? true}
                  label="Şifre Sıfırlama"
                  description="Kullanıcıların şifremi unuttum akışını aç/kapat."
                  onClick={() => handleToggle("passwordResetEnabled")}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Max Hatalı Giriş
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.maxFailedLoginAttempts ?? 5}
                    onChange={(e) =>
                      handleNumberField(
                        "maxFailedLoginAttempts",
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Kilit Süresi (dk)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.lockoutMinutes ?? 15}
                    onChange={(e) =>
                      handleNumberField(
                        "lockoutMinutes",
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Min Şifre Uzunluğu
                  </label>
                  <input
                    type="number"
                    min={6}
                    value={settings.passwordMinLength ?? 8}
                    onChange={(e) =>
                      handleNumberField(
                        "passwordMinLength",
                        Math.max(6, parseInt(e.target.value) || 6),
                      )
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div id="app" className="space-y-4 scroll-mt-6">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2
              className="text-sm font-semibold uppercase tracking-widest flex items-center gap-2"
              style={{ color: "var(--color-text-disabled)" }}
            >
              <Globe size={13} />
              Uygulama
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Sürüm ve çalışma ortamı bilgileri.
            </p>
          </div>
          <Badge variant="outline">{settings.appVersion}</Badge>
        </div>

        <Card variant="bordered">
          <CardContent className="pt-0 space-y-5">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                Uygulama Versiyonu
              </label>
              <input
                type="text"
                value={settings.appVersion}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, appVersion: e.target.value }))
                }
                onBlur={() => handleTextBlur("appVersion")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-text-primary)",
                  maxWidth: 200,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2"
          style={{ color: "var(--color-text-disabled)" }}
        >
          <Server size={13} />
          Sistem Bilgisi
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              icon: Globe,
              label: "Uygulama Versiyonu",
              value: settings.appVersion,
              accentColor: "var(--color-primary)",
            },
            {
              icon: Server,
              label: "Platform",
              value: "Next.js 15 / React 19",
              accentColor: "var(--color-secondary)",
            },
            {
              icon: Database,
              label: "Veritabanı",
              value: "PostgreSQL (Supabase)",
              accentColor: "var(--color-success)",
            },
            {
              icon: Clock,
              label: "Oturum Süresi",
              value: `${settings.sessionTimeoutMinutes} dakika`,
              accentColor: "var(--color-warning)",
            },
            {
              icon: Shield,
              label: "Ortam",
              value: isProduction ? "Production" : "Development",
              accentColor: isProduction ? "var(--color-success)" : "var(--color-warning)",
            },
            {
              icon: Users,
              label: "Domain Politikası",
              value: allowedDomainCount > 0 ? `${allowedDomainCount} domain` : "Açık",
              accentColor: "var(--color-primary)",
            },
          ].map(({ icon: Icon, label, value, accentColor }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
                }}
              >
                <Icon size={15} style={{ color: accentColor }} />
              </div>
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {label}
                </p>
                <p
                  className="mt-0.5 text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2
          className="text-sm font-semibold uppercase tracking-widest px-1 flex items-center gap-2"
          style={{ color: "var(--color-text-disabled)" }}
        >
          <CheckCircle2 size={13} />
          Aktif Ayarlar Özeti
        </h2>
        <div
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          {[
            {
              label: "Auth",
              detail: authSummary,
              badge: settings.maintenanceMode ? "destructive" : "success",
            },
            {
              label: "Kullanıcı",
              detail:
                settings.maxUsersPerDay > 0
                  ? `${settings.maxUsersPerDay}/gün limit`
                  : "Limit yok",
              badge: settings.maxUsersPerDay > 0 ? "warning" : "secondary",
            },
            {
              label: "AI",
              detail: settings.aiEnabled ? "AI servisleri açık" : "AI servisleri kapalı",
              badge: settings.aiEnabled ? "success" : "secondary",
            },
            {
              label: "Güvenlik",
              detail: `${settings.sessionTimeoutMinutes} dk · ${settings.debugMode ? "Debug açık" : "Debug kapalı"}`,
              badge: settings.debugMode ? "warning" : "secondary",
            },
            {
              label: "Uygulama",
              detail: settings.appVersion,
              badge: "outline",
            },
          ].map(({ label, detail, badge }) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-lg px-1 py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {detail}
                </p>
              </div>
              <Badge variant={badge as "default" | "success" | "warning" | "destructive" | "secondary" | "outline"}>
                {label === "Uygulama" ? settings.appVersion : "Güncel"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-disabled)" }}
            >
              İlgili Yönetim Alanları
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Ayarlarla bağlantılı yönetim sayfalarına hızlı geçiş.
            </p>
          </div>
          <Badge variant="outline">Hızlı geçiş</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/users", label: "Kullanıcılar", icon: Users },
            { href: "/admin/ai/control", label: "AI Kontrol", icon: BrainCircuit },
            { href: "/admin/logs", label: "Aktivite Günlüğü", icon: FileText },
            { href: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface-elevated)",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {label}
                </span>
              </div>
              <ArrowRight
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
