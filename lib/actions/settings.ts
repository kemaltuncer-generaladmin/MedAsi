"use server";

import { revalidatePath } from "next/cache";
import {
  type AdminAnnouncement,
  type AdminModuleToggle,
  type SystemSettingKey,
  type SystemSettings,
  getAnnouncementsFromDb,
  getModuleTogglesFromDb,
  getSettingMap,
  getSystemSettingsFromDb,
  isSystemSettingKey,
  sanitizeSystemSettingValue,
  upsertSystemSetting,
} from "@/lib/system-settings";
import { clearSystemLogs, createSystemLog, querySystemLogs } from "@/lib/system-log";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";

export type { SystemSettings } from "@/lib/system-settings";

async function checkAdmin() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}

interface SanitizedSystemSettingsUpdateEntry {
  key: SystemSettingKey;
  value: string;
}

export interface SanitizedSystemSettingsUpdate {
  entries: SanitizedSystemSettingsUpdateEntry[];
  skippedKeys: string[];
}

export async function sanitizeSystemSettingsUpdate(
  partial: Record<string, unknown>,
): Promise<SanitizedSystemSettingsUpdate> {
  const entries: SanitizedSystemSettingsUpdateEntry[] = [];
  const skippedKeys: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(partial)) {
    const key = rawKey.trim();
    if (!key || !isSystemSettingKey(key)) {
      skippedKeys.push(rawKey);
      continue;
    }

    entries.push({
      key,
      value: sanitizeSystemSettingValue(key, rawValue),
    });
  }

  return { entries, skippedKeys };
}

export async function getSystemSettings(): Promise<SystemSettings> {
  await checkAdmin();
  return getSystemSettingsFromDb();
}

export async function updateSystemSetting(
  key: keyof SystemSettings,
  value: string | boolean | number,
): Promise<void>;
export async function updateSystemSetting(
  key: string,
  value: unknown,
): Promise<void> {
  const user = await checkAdmin();
  const normalizedKey = key.trim();
  if (!isSystemSettingKey(normalizedKey)) {
    throw new Error("Invalid system setting key");
  }

  const normalizedValue = sanitizeSystemSettingValue(normalizedKey, value);
  await upsertSystemSetting(normalizedKey, normalizedValue);
  await createSystemLog({
    level: "success",
    category: "system",
    message: `Sistem ayarı güncellendi: ${normalizedKey}`,
    details: `Yeni değer: ${normalizedValue}`,
    userId: user.id,
  });
  revalidatePath("/admin/settings");
}

export async function updateSystemSettings(
  partial: Partial<SystemSettings>,
): Promise<void> {
  const user = await checkAdmin();
  const { entries, skippedKeys } = await sanitizeSystemSettingsUpdate(
    partial as Record<string, unknown>,
  );

  if (entries.length === 0) {
    await createSystemLog({
      level: "warn",
      category: "system",
      message: "Toplu sistem ayarı güncellemesi boş bırakıldı",
      details:
        skippedKeys.length > 0
          ? `Atlanan alanlar: ${skippedKeys.join(", ")}`
          : "Geçerli alan bulunamadı",
      userId: user.id,
    });
    revalidatePath("/admin/settings");
    return;
  }

  await Promise.all(
    entries.map(({ key, value }) => upsertSystemSetting(key, value)),
  );
  await createSystemLog({
    level: "success",
    category: "system",
    message: "Toplu sistem ayarı güncellendi",
    details: [
      `Alanlar: ${entries.map(({ key }) => key).join(", ")}`,
      skippedKeys.length > 0 ? `Atlanan alanlar: ${skippedKeys.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
    userId: user.id,
  });
  revalidatePath("/admin/settings");
}

export async function getModuleToggles(): Promise<AdminModuleToggle> {
  await checkAdmin();
  return getModuleTogglesFromDb();
}

export async function updateModuleToggles(
  toggles: AdminModuleToggle,
): Promise<void> {
  const user = await checkAdmin();
  await upsertSystemSetting("moduleToggles", JSON.stringify(toggles));
  await createSystemLog({
    level: "success",
    category: "system",
    message: "Modül ayarları güncellendi",
    details: `Aktif modül sayısı: ${
      Object.values(toggles).filter(Boolean).length
    }`,
    userId: user.id,
  });
  revalidatePath("/admin/modules");
  revalidatePath("/dashboard");
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  await checkAdmin();
  return getAnnouncementsFromDb();
}

export async function saveAnnouncements(
  announcements: AdminAnnouncement[],
): Promise<void> {
  const user = await checkAdmin();
  await upsertSystemSetting("announcements", JSON.stringify(announcements));
  await createSystemLog({
    level: "success",
    category: "system",
    message: "Duyurular güncellendi",
    details: `Toplam duyuru: ${announcements.length}`,
    userId: user.id,
  });
  revalidatePath("/admin/announcements");
}

export async function getAdminLogs(params?: {
  level?: "info" | "warn" | "error" | "success" | "all";
  category?: "auth" | "user" | "ai" | "system" | "payment" | "all";
  dateRange?: "today" | "7d" | "30d" | "all";
  search?: string;
  take?: number;
}) {
  await checkAdmin();
  const rows = await querySystemLogs(params);
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    level: row.level as "info" | "warn" | "error" | "success",
    category: row.category as "auth" | "user" | "ai" | "system" | "payment",
    message: row.message,
    details: row.details ?? undefined,
    userId: row.userId ?? undefined,
  }));
}

export async function clearAdminLogs(): Promise<void> {
  const user = await checkAdmin();
  await clearSystemLogs();
  await createSystemLog({
    level: "warn",
    category: "system",
    message: "Sistem logları temizlendi",
    userId: user.id,
  });
  revalidatePath("/admin/logs");
}

export async function getPublicSystemConfig() {
  const [settings, moduleToggles, announcements] = await Promise.all([
    getSystemSettingsFromDb(),
    getModuleTogglesFromDb(),
    getAnnouncementsFromDb(),
  ]);
  return {
    maintenanceMode: settings.maintenanceMode,
    registrationEnabled: settings.registrationEnabled,
    aiEnabled: settings.aiEnabled,
    maintenanceMessage: settings.maintenanceMessage,
    allowedEmailDomains: settings.allowedEmailDomains,
    moduleToggles,
    announcements: announcements.filter((item) => item.active),
  };
}

export async function updateRawSetting(
  key: string,
  value: string,
): Promise<void> {
  const user = await checkAdmin();
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error("Invalid setting key");
  }

  await upsertSystemSetting(normalizedKey, value);
  await createSystemLog({
    level: "success",
    category: "system",
    message: `Sistem ayarı güncellendi: ${normalizedKey}`,
    details: `Yeni değer: ${value}`,
    userId: user.id,
  });
}

export async function getRawSettings(
  keys: string[],
): Promise<Record<string, string>> {
  await checkAdmin();
  const normalizedKeys = keys.map((key) => key.trim()).filter(Boolean);
  const map = await getSettingMap(normalizedKeys);
  return map;
}

export async function getPublicSettings(): Promise<
  Pick<
    SystemSettings,
    | "maintenanceMode"
    | "registrationEnabled"
    | "aiEnabled"
    | "maintenanceMessage"
    | "allowedEmailDomains"
  >
> {
  const settings = await getSystemSettingsFromDb();
  return {
    maintenanceMode: settings.maintenanceMode,
    registrationEnabled: settings.registrationEnabled,
    aiEnabled: settings.aiEnabled,
    maintenanceMessage: settings.maintenanceMessage,
    allowedEmailDomains: settings.allowedEmailDomains,
  };
}
