"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BrainCircuit,
  Building2,
  CalendarDays,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquareMore,
  Phone,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserRound,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

type RoleOption = {
  value: string;
  label: string;
};

type AiModel = "FAST" | "EFFICIENT";
type AiLanguage = "tr" | "en" | "auto";
type AiLength = "short" | "medium" | "long";

type ProfileState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  institution: string;
  graduationYear: string;
  specialty: string;
};

type NotificationState = {
  emailNotifications: boolean;
  dailyBriefing: boolean;
  weeklyReport: boolean;
};

type AiPrefsState = {
  model: AiModel;
  language: AiLanguage;
  responseLength: AiLength;
  clinicalTerminology: boolean;
  showReferences: boolean;
  addDisclaimer: boolean;
};

type SettingsState = {
  profile: ProfileState;
  notifications: NotificationState;
  aiPrefs: AiPrefsState;
};

type SectionKey = keyof SettingsState;

type SectionStatus = {
  saving: boolean;
  saved: boolean;
  error: string | null;
  lastSavedAt: string | null;
};

type ApiPayload = {
  name?: unknown;
  email?: unknown;
  profile?: unknown;
  goals?: unknown;
  notificationPrefs?: unknown;
};

type ApiResponse = ApiPayload & {
  error?: unknown;
  message?: unknown;
};

const DEFAULT_STATE: SettingsState = {
  profile: {
    name: "",
    email: "",
    phone: "",
    city: "",
    role: "",
    institution: "",
    graduationYear: "",
    specialty: "",
  },
  notifications: {
    emailNotifications: true,
    dailyBriefing: true,
    weeklyReport: false,
  },
  aiPrefs: {
    model: "EFFICIENT",
    language: "tr",
    responseLength: "medium",
    clinicalTerminology: true,
    showReferences: true,
    addDisclaimer: true,
  },
};

const ROLE_OPTIONS: RoleOption[] = [
  { value: "student", label: "Tıp Öğrencisi" },
  { value: "ogrenci", label: "Tıp Öğrencisi (eski değer: ogrenci)" },
  { value: "intern", label: "İntörn" },
  { value: "assistant_doctor", label: "Asistan Doktor" },
  { value: "asistan", label: "Asistan Doktor (eski değer: asistan)" },
  { value: "specialist_doctor", label: "Uzman Doktor" },
  { value: "uzman", label: "Uzman Doktor (eski değer: uzman)" },
  { value: "professor", label: "Profesör" },
  { value: "pratisyen", label: "Pratisyen Hekim" },
  { value: "diger", label: "Diğer" },
];

const MODEL_OPTIONS: { value: AiModel; label: string; note: string }[] = [
  { value: "FAST", label: "FAST", note: "Daha hızlı yanıtlar" },
  { value: "EFFICIENT", label: "EFFICIENT", note: "Daha dengeli maliyet" },
];

const LANGUAGE_OPTIONS: { value: AiLanguage; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "auto", label: "Otomatik" },
];

const LENGTH_OPTIONS: { value: AiLength; label: string }[] = [
  { value: "short", label: "Kısa" },
  { value: "medium", label: "Orta" },
  { value: "long", label: "Uzun" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readAiModel(value: unknown): AiModel | undefined {
  return value === "FAST" || value === "EFFICIENT" ? value : undefined;
}

function readAiLanguage(value: unknown): AiLanguage | undefined {
  return value === "tr" || value === "en" || value === "auto" ? value : undefined;
}

function readAiLength(value: unknown): AiLength | undefined {
  return value === "short" || value === "medium" || value === "long" ? value : undefined;
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string): string {
  if (!name.trim()) return "?";

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function readErrorMessage(payload: ApiResponse | null, fallback: string) {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

function normalizeSettings(data: ApiPayload | null): SettingsState {
  const notificationPrefs = isRecord(data?.notificationPrefs)
    ? data.notificationPrefs
    : ({} as Record<string, unknown>);
  // Yeni kayıtlar notificationPrefs.profile altında gelir; eski kayıtlar için goals fallback kalır.
  const profileSource = isRecord(notificationPrefs.profile)
    ? notificationPrefs.profile
    : isRecord(data?.goals)
      ? data.goals
      : ({} as Record<string, unknown>);
  const goals = profileSource;
  const aiPrefs = isRecord(notificationPrefs.aiPrefs)
    ? notificationPrefs.aiPrefs
    : ({} as Record<string, unknown>);

  return {
    profile: {
      name: readText(data?.name),
      email: readText(data?.email),
      phone: readText(goals.phone),
      city: readText(goals.city),
      role: readText(goals.role),
      institution: readText(goals.institution),
      graduationYear: readText(goals.graduationYear),
      specialty: readText(goals.specialty),
    },
    notifications: {
      emailNotifications:
        readBoolean(notificationPrefs.emailNotifications) ??
        DEFAULT_STATE.notifications.emailNotifications,
      dailyBriefing:
        readBoolean(notificationPrefs.dailyBriefing) ??
        DEFAULT_STATE.notifications.dailyBriefing,
      weeklyReport:
        readBoolean(notificationPrefs.weeklyReport) ??
        DEFAULT_STATE.notifications.weeklyReport,
    },
    aiPrefs: {
      model:
        readAiModel(aiPrefs.model) ??
        DEFAULT_STATE.aiPrefs.model,
      language:
        readAiLanguage(aiPrefs.language) ??
        DEFAULT_STATE.aiPrefs.language,
      responseLength:
        readAiLength(aiPrefs.responseLength) ??
        DEFAULT_STATE.aiPrefs.responseLength,
      clinicalTerminology:
        readBoolean(aiPrefs.clinicalTerminology) ??
        DEFAULT_STATE.aiPrefs.clinicalTerminology,
      showReferences:
        readBoolean(aiPrefs.showReferences) ??
        DEFAULT_STATE.aiPrefs.showReferences,
      addDisclaimer:
        readBoolean(aiPrefs.addDisclaimer) ??
        DEFAULT_STATE.aiPrefs.addDisclaimer,
    },
  };
}

function statusBadgeVariant(status: SectionStatus, dirty: boolean) {
  if (status.saving) return "warning";
  if (status.error) return "destructive";
  if (status.saved) return "success";
  if (dirty) return "secondary";
  return "outline";
}

function statusLabel(status: SectionStatus, dirty: boolean) {
  if (status.saving) return "Kaydediliyor";
  if (status.error) return "Hata";
  if (status.saved) return "Kaydedildi";
  if (dirty) return "Kaydedilmemiş";
  return "Güncel";
}

function syncSectionFromResponse(
  section: SectionKey,
  response: ApiPayload | null,
) {
  const normalized = normalizeSettings(response);
  return normalized[section];
}

function sectionFieldClass(disabled = false) {
  return [
    "w-full rounded-lg border px-3 py-2.5 text-sm transition-all duration-200",
    "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]",
    "border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
    "disabled:cursor-not-allowed disabled:opacity-60",
    disabled ? "opacity-80" : "hover:border-[var(--color-text-secondary)]",
  ].join(" ");
}

function SectionStatusLine({
  status,
  dirty,
}: {
  status: SectionStatus;
  dirty: boolean;
}) {
  const variant = statusBadgeVariant(status, dirty);
  const message = status.error ?? statusLabel(status, dirty);

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
      <Badge variant={variant}>{message}</Badge>
      {status.lastSavedAt && status.saved && !status.saving && !status.error && (
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-[var(--color-success)]" />
          Son kaydetme: {status.lastSavedAt}
        </span>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
      {[0, 1, 2].map((item) => (
        <SkeletonCard key={item} />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [draft, setDraft] = useState<SettingsState>(DEFAULT_STATE);
  const [baseline, setBaseline] = useState<SettingsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRefreshedAt, setLoadRefreshedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<SectionKey, SectionStatus>>({
    profile: { saving: false, saved: false, error: null, lastSavedAt: null },
    notifications: { saving: false, saved: false, error: null, lastSavedAt: null },
    aiPrefs: { saving: false, saved: false, error: null, lastSavedAt: null },
  });

  const roleOptions = useMemo(() => {
    const current = draft.profile.role.trim();
    const known = ROLE_OPTIONS.some((option) => option.value === current);

    if (!current || known) return ROLE_OPTIONS;

    return [
      { value: current, label: `Mevcut değer: ${current}` },
      ...ROLE_OPTIONS,
    ];
  }, [draft.profile.role]);

  const dirty = useMemo(() => {
    return {
      profile: JSON.stringify(draft.profile) !== JSON.stringify(baseline.profile),
      notifications:
        JSON.stringify(draft.notifications) !==
        JSON.stringify(baseline.notifications),
      aiPrefs: JSON.stringify(draft.aiPrefs) !== JSON.stringify(baseline.aiPrefs),
    };
  }, [baseline.aiPrefs, baseline.notifications, baseline.profile, draft.aiPrefs, draft.notifications, draft.profile]);

  async function loadSettings() {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        throw new Error(readErrorMessage(payload, "Ayarlar yüklenemedi"));
      }

      const normalized = normalizeSettings(payload);
      setDraft(normalized);
      setBaseline(normalized);
      setLoadRefreshedAt(formatTimestamp(new Date()));
      setStatus({
        profile: { saving: false, saved: false, error: null, lastSavedAt: null },
        notifications: { saving: false, saved: false, error: null, lastSavedAt: null },
        aiPrefs: { saving: false, saved: false, error: null, lastSavedAt: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ayarlar yüklenemedi";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  function updateProfile<K extends keyof ProfileState>(field: K, value: ProfileState[K]) {
    setDraft((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
    setStatus((prev) => ({
      ...prev,
      profile: { ...prev.profile, saved: false, error: null },
    }));
  }

  function updateNotifications<K extends keyof NotificationState>(field: K, value: NotificationState[K]) {
    setDraft((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
    setStatus((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, saved: false, error: null },
    }));
  }

  function updateAiPrefs<K extends keyof AiPrefsState>(field: K, value: AiPrefsState[K]) {
    setDraft((prev) => ({
      ...prev,
      aiPrefs: {
        ...prev.aiPrefs,
        [field]: value,
      },
    }));
    setStatus((prev) => ({
      ...prev,
      aiPrefs: { ...prev.aiPrefs, saved: false, error: null },
    }));
  }

  async function persistSection(
    section: SectionKey,
    payload: Record<string, unknown>,
  ) {
    setStatus((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        saving: true,
        error: null,
      },
    }));

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok) {
        throw new Error(
          readErrorMessage(response, "Kaydetme işlemi başarısız oldu"),
        );
      }

      const sectionValue = syncSectionFromResponse(section, response);

      setDraft((prev) => ({
        ...prev,
        [section]: sectionValue,
      } as SettingsState));
      setBaseline((prev) => ({
        ...prev,
        [section]: sectionValue,
      } as SettingsState));
      setStatus((prev) => ({
        ...prev,
        [section]: {
          saving: false,
          saved: true,
          error: null,
          lastSavedAt: formatTimestamp(new Date()),
        },
      }));
      toast.success("Ayarlar kaydedildi");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kaydetme sırasında hata oluştu";
      setStatus((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          saving: false,
          saved: false,
          error: message,
        },
      }));
      toast.error(message);
    }
  }

  function saveProfile() {
    if (!draft.profile.name.trim()) {
      const message = "Ad Soyad boş bırakılamaz";
      setStatus((prev) => ({
        ...prev,
        profile: { ...prev.profile, error: message, saved: false },
      }));
      toast.error(message);
      return;
    }

    void persistSection("profile", {
      profile: {
        name: draft.profile.name,
        phone: draft.profile.phone,
        city: draft.profile.city,
        role: draft.profile.role,
        institution: draft.profile.institution,
        graduationYear: draft.profile.graduationYear,
        specialty: draft.profile.specialty,
      },
    });
  }

  function saveNotifications() {
    void persistSection("notifications", {
      notificationPrefs: {
        emailNotifications: draft.notifications.emailNotifications,
        dailyBriefing: draft.notifications.dailyBriefing,
        weeklyReport: draft.notifications.weeklyReport,
      },
    });
  }

  function saveAiPrefs() {
    void persistSection("aiPrefs", {
      notificationPrefs: {
        aiPrefs: draft.aiPrefs,
      },
    });
  }

  const profileDirty = dirty.profile;
  const notificationsDirty = dirty.notifications;
  const aiDirty = dirty.aiPrefs;

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
            <Settings2 size={13} />
            Gerçek zamanlı DB senkronu
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Ayarlar
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Profil, bildirim ve AI tercihlerinizi tek yerden yönetin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loadRefreshedAt && (
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck size={12} />
              Son eşitleme: {loadRefreshedAt}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => void loadSettings()}>
            <RotateCcw size={14} />
            Yenile
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-text-primary)] flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 text-[var(--color-destructive)]" />
          <div className="flex-1 space-y-1">
            <p className="font-medium">Ayarlar alınamadı</p>
            <p className="text-[var(--color-text-secondary)]">{loadError}</p>
            <Button variant="ghost" size="sm" onClick={() => void loadSettings()} className="mt-1">
              <RotateCcw size={14} />
              Tekrar dene
            </Button>
          </div>
        </div>
      )}

      <Card
        variant="bordered"
        className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <CardHeader className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <UserRound size={18} className="text-[var(--color-primary)]" />
              Profil Bilgileri
            </CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Kimliğiniz ve eğitim bilgileriniz DB’den yüklenir, burada güncellenir.
            </p>
          </div>
          <SectionStatusLine status={status.profile} dirty={profileDirty} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-black transition-transform duration-300 group-hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                }}
              >
                {draft.profile.name.trim() ? getInitials(draft.profile.name) : <User size={24} />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {draft.profile.name || "Ad Soyad girilmedi"}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {draft.profile.email || "E-posta yükleniyor"}
                </p>
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles size={12} />
                  DB bağlantılı profil
                </Badge>
              </div>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <User size={14} className="text-[var(--color-text-secondary)]" />
                  Ad Soyad
                </span>
                <input
                  type="text"
                  value={draft.profile.name}
                  onChange={(event) => updateProfile("name", event.target.value)}
                  placeholder="Adınız ve soyadınız"
                  className={sectionFieldClass()}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Mail size={14} className="text-[var(--color-text-secondary)]" />
                  E-Posta
                </span>
                <input
                  type="email"
                  value={draft.profile.email}
                  disabled
                  className={sectionFieldClass(true)}
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Phone size={14} className="text-[var(--color-text-secondary)]" />
                  Telefon
                </span>
                <input
                  type="tel"
                  value={draft.profile.phone}
                  onChange={(event) => updateProfile("phone", event.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  className={sectionFieldClass()}
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <MapPin size={14} className="text-[var(--color-text-secondary)]" />
                  Şehir
                </span>
                <input
                  type="text"
                  value={draft.profile.city}
                  onChange={(event) => updateProfile("city", event.target.value)}
                  placeholder="İstanbul, Ankara, İzmir..."
                  className={sectionFieldClass()}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <UserRound size={14} className="text-[var(--color-text-secondary)]" />
                  Unvan / Rol
                </span>
                <select
                  value={draft.profile.role}
                  onChange={(event) => updateProfile("role", event.target.value)}
                  className={`${sectionFieldClass()} appearance-none cursor-pointer`}
                >
                  <option value="">Seçiniz...</option>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Building2 size={14} className="text-[var(--color-text-secondary)]" />
                  Kurum
                </span>
                <input
                  type="text"
                  value={draft.profile.institution}
                  onChange={(event) => updateProfile("institution", event.target.value)}
                  placeholder="Üniversite / hastane adı"
                  className={sectionFieldClass()}
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <CalendarDays size={14} className="text-[var(--color-text-secondary)]" />
                  Mezuniyet Yılı
                </span>
                <input
                  type="text"
                  value={draft.profile.graduationYear}
                  onChange={(event) => updateProfile("graduationYear", event.target.value)}
                  placeholder="2025"
                  maxLength={4}
                  className={sectionFieldClass()}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Stethoscope size={14} className="text-[var(--color-text-secondary)]" />
                  Branş / Uzmanlık Alanı
                </span>
                <input
                  type="text"
                  value={draft.profile.specialty}
                  onChange={(event) => updateProfile("specialty", event.target.value)}
                  placeholder="Kardiyoloji, Dahiliye, Genel Cerrahi..."
                  className={sectionFieldClass()}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Profil değişiklikleri doğrulanır, geçersiz alanlar API tarafında düşer.
            </p>
            <Button
              variant="primary"
              size="md"
              loading={status.profile.saving}
              onClick={saveProfile}
              disabled={status.profile.saving || !profileDirty}
            >
              {status.profile.saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {status.profile.saving
                ? "Kaydediliyor..."
                : status.profile.saved && !profileDirty
                  ? "Kaydedildi"
                  : "Profili Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        variant="bordered"
        className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <CardHeader className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell size={18} className="text-[var(--color-primary)]" />
              Bildirim Tercihleri
            </CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Bildirim ve özet akışları ayrı ayrı kaydedilir, diğer tercihleri bozmaz.
            </p>
          </div>
          <SectionStatusLine status={status.notifications} dirty={notificationsDirty} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Toggle
              checked={draft.notifications.emailNotifications}
              onClick={() =>
                updateNotifications(
                  "emailNotifications",
                  !draft.notifications.emailNotifications,
                )
              }
              label="E-posta bildirimleri"
              description="Önemli hesap güncellemeleri ve duyurular"
            />
            <Toggle
              checked={draft.notifications.dailyBriefing}
              onClick={() =>
                updateNotifications("dailyBriefing", !draft.notifications.dailyBriefing)
              }
              label="Günlük brifing e-postası"
              description="Her sabah medikal gündem özeti"
            />
            <Toggle
              checked={draft.notifications.weeklyReport}
              onClick={() =>
                updateNotifications("weeklyReport", !draft.notifications.weeklyReport)
              }
              label="Haftalık ilerleme raporu"
              description="AI kullanım istatistikleri ve gelişim özeti"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Kaydetme, sadece bu karttaki bildirim alanlarını DB’de günceller.
            </p>
            <Button
              variant="primary"
              size="md"
              loading={status.notifications.saving}
              onClick={saveNotifications}
              disabled={status.notifications.saving || !notificationsDirty}
            >
              {status.notifications.saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Bell size={15} />
              )}
              {status.notifications.saving
                ? "Kaydediliyor..."
                : status.notifications.saved && !notificationsDirty
                  ? "Kaydedildi"
                  : "Bildirimleri Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        variant="bordered"
        className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <CardHeader className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit size={18} className="text-[var(--color-primary)]" />
              AI Tercihleri
            </CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Üretken yapay zeka davranışı, mevcut AI profilinizle aynı JSON altında tutulur.
            </p>
          </div>
          <SectionStatusLine status={status.aiPrefs} dirty={aiDirty} />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <Zap size={14} className="text-[var(--color-text-secondary)]" />
                Model seçimi
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODEL_OPTIONS.map((option) => {
                  const active = draft.aiPrefs.model === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateAiPrefs("model", option.value)}
                      className={[
                        "rounded-xl border p-4 text-left transition-all duration-200",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:-translate-y-0.5 hover:border-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                            {option.note}
                          </p>
                        </div>
                        {active && (
                          <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Globe size={14} className="text-[var(--color-text-secondary)]" />
                  Yanıt dili
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = draft.aiPrefs.language === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAiPrefs("language", option.value)}
                        className={[
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <MessageSquareMore size={14} className="text-[var(--color-text-secondary)]" />
                  Yanıt uzunluğu
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LENGTH_OPTIONS.map((option) => {
                    const active = draft.aiPrefs.responseLength === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateAiPrefs("responseLength", option.value)}
                        className={[
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                          active
                            ? "border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Toggle
                checked={draft.aiPrefs.clinicalTerminology}
                onClick={() =>
                  updateAiPrefs(
                    "clinicalTerminology",
                    !draft.aiPrefs.clinicalTerminology,
                  )
                }
                label="Klinik terminoloji kullan"
                description="Daha teknik ve tıbbi anlatım tercih edilir"
              />
              <Toggle
                checked={draft.aiPrefs.showReferences}
                onClick={() =>
                  updateAiPrefs("showReferences", !draft.aiPrefs.showReferences)
                }
                label="Kaynak ve referansları göster"
                description="Mümkün olduğunda yanıt sonuna referans ekle"
              />
              <Toggle
                checked={draft.aiPrefs.addDisclaimer}
                onClick={() =>
                  updateAiPrefs("addDisclaimer", !draft.aiPrefs.addDisclaimer)
                }
                label="Tıbbi uyarı ekle"
                description="Yanıtların sonunda güvenlik notu göster"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Bu alanlar {" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                notificationPrefs.aiPrefs
              </span>{" "}
              altında DB’de saklanır.
            </p>
            <Button
              variant="primary"
              size="md"
              loading={status.aiPrefs.saving}
              onClick={saveAiPrefs}
              disabled={status.aiPrefs.saving || !aiDirty}
            >
              {status.aiPrefs.saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BrainCircuit size={15} />
              )}
              {status.aiPrefs.saving
                ? "Kaydediliyor..."
                : status.aiPrefs.saved && !aiDirty
                  ? "Kaydedildi"
                  : "AI Tercihlerini Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        variant="bordered"
        className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-primary)]" />
            Hesap Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">
                  Mevcut Plan
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">Öğrenci</Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Ücretsiz
                  </span>
                </div>
              </div>
              <Link href="/upgrade">
                <Button variant="primary" size="sm">
                  Paketi Yükselt
                  <ArrowRight size={14} />
                </Button>
              </Link>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                Şifre Değiştir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-[var(--color-destructive)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10"
              >
                Hesabı Sil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        variant="bordered"
        className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-primary)]" />
            Görünüm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Tema
              </span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Karanlık Mod
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Dil
              </span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Türkçe
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] pt-1">
              Daha fazla kişiselleştirme seçeneği yakında
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
