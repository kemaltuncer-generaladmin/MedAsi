import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { describeDriveMissingConfig } from "@/lib/gdrive/config";

function getFirstNonEmptyEnv(keys: string[]): string {
  for (const key of keys) {
    const value = (process.env[key] ?? "").trim();
    if (value.length > 0) return value;
  }
  return "";
}

const CLIENT_ID = getFirstNonEmptyEnv(["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_CLIENT_ID"]);
const CLIENT_SECRET = getFirstNonEmptyEnv(["GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]);
const STATE_SECRET = getFirstNonEmptyEnv(["GOOGLE_DRIVE_STATE_SECRET"]) || CLIENT_SECRET;
const REDIRECT_URI = getFirstNonEmptyEnv(["GOOGLE_DRIVE_REDIRECT_URI"]);

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

const EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: "pptx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
};

const MANAGED_ROOT_NAME = "Medasi Root";
const MANAGED_ROOT_FOLDER_ID = getFirstNonEmptyEnv(["GOOGLE_DRIVE_ROOT_FOLDER_ID"]) || null;
let userGoogleTokensSchemaReady: Promise<void> | null = null;
const driveConnectionCache = new Map<
  string,
  {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
    cachedAt: number;
  }
>();
const DRIVE_CONNECTION_CACHE_TTL_MS = 15_000;

export type DriveRequestContext = {
  requestUrl?: string;
  headers?: Headers;
};

export type DriveConfigStatus = {
  configured: boolean;
  missingConfig: string[];
  missingConfigDetails: ReturnType<typeof describeDriveMissingConfig>;
  baseUrl: string;
  redirectUri: string;
  redirectOrigin: string | null;
  managedRootFolderId: string | null;
};

export type ManagedDrivePlan = {
  scope: "system" | "library" | "org" | "user" | "temp";
  folderPath: string;
  leafFolder: string;
  rootFolderName: string;
  rootFolderId: string | null;
};

export type DriveDownloadErrorReason =
  | "file_not_found"
  | "access_denied"
  | "reauth_required"
  | "export_unsupported"
  | "download_failed";

export class DriveIntegrationError extends Error {
  reason: DriveDownloadErrorReason;
  status: number;

  constructor(reason: DriveDownloadErrorReason, message: string, status = 500) {
    super(message);
    this.name = "DriveIntegrationError";
    this.reason = reason;
    this.status = status;
  }
}

async function ensureUserGoogleTokensTable(): Promise<void> {
  if (!userGoogleTokensSchemaReady) {
    userGoogleTokensSchemaReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS public.user_google_tokens (
          user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          access_token text NOT NULL,
          refresh_token text,
          expires_at timestamptz NOT NULL,
          scope text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_user_google_tokens_expires_at
        ON public.user_google_tokens (expires_at)
      `);
    })().catch((error) => {
      userGoogleTokensSchemaReady = null;
      throw error;
    });
  }

  await userGoogleTokensSchemaReady;
}

type DriveFileMeta = {
  name?: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
  exportLinks?: Record<string, string>;
};

function isInvalidConfigValue(value: string, placeholders: string[]) {
  const normalized = value.trim();
  if (!normalized) return true;
  if (
    normalized.toUpperCase().startsWith("YOUR_") ||
    normalized.toUpperCase().startsWith("CHANGE_ME") ||
    normalized.startsWith("<") ||
    normalized.includes("${")
  ) {
    return true;
  }
  return placeholders.some((placeholder) => normalized === placeholder);
}

function isValidClientId(value: string) {
  return !isInvalidConfigValue(value, [
    "YOUR_GOOGLE_DRIVE_CLIENT_ID",
    "REPLACE_ME",
    "CHANGEME",
  ]);
}

function isValidClientSecret(value: string) {
  return !isInvalidConfigValue(value, [
    "YOUR_GOOGLE_DRIVE_CLIENT_SECRET",
    "REPLACE_ME",
    "CHANGEME",
  ]);
}

function isValidStateSecret(value: string) {
  if (
    isInvalidConfigValue(value, [
      "YOUR_GOOGLE_DRIVE_STATE_SECRET",
      "REPLACE_ME",
      "CHANGEME",
    ])
  ) {
    return false;
  }
  return value.trim().length >= 32;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function sanitizeDriveSegment(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 80) || "unknown";
}

function buildManagedFolderPath(parts: string[]) {
  return [MANAGED_ROOT_NAME, ...parts.filter(Boolean)].join("/");
}

function inferLibraryBucket(branch?: string) {
  const normalized = (branch ?? "").trim().toLowerCase();
  if (!normalized) return "notes";
  if (normalized.includes("textbook") || normalized.includes("kitap")) return "textbooks";
  if (normalized.includes("slide") || normalized.includes("slayt")) return "slides";
  if (normalized.includes("video")) return "videos";
  if (normalized.includes("guide") || normalized.includes("rehber") || normalized.includes("guideline")) return "guidelines";
  if (normalized.includes("exam") || normalized.includes("sinav") || normalized.includes("osce") || normalized.includes("tus")) return "exam-content";
  return "notes";
}

export function getManagedDriveBlueprint() {
  return {
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
    tree: {
      "00_system": ["imports", "failed", "logs"],
      "01_library": ["textbooks", "slides", "notes", "videos", "exam-content", "guidelines"],
      "02_orgs": ["org_<orgId>/shared", "org_<orgId>/uploads"],
      "03_users": ["user_<userId>/inbox", "user_<userId>/processed", "user_<userId>/archive"],
      "99_temp": [],
    },
  };
}

export function getManagedSystemDrivePlan(kind: "imports" | "failed" | "logs"): ManagedDrivePlan {
  return {
    scope: "system",
    folderPath: buildManagedFolderPath(["00_system", kind]),
    leafFolder: kind,
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

export function getManagedLibraryDrivePlan(branch?: string): ManagedDrivePlan {
  const bucket = inferLibraryBucket(branch);
  return {
    scope: "library",
    folderPath: buildManagedFolderPath(["01_library", bucket]),
    leafFolder: bucket,
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

export function getManagedOrgDrivePlan(orgId: string, kind: "shared" | "uploads"): ManagedDrivePlan {
  const safeOrgId = sanitizeDriveSegment(orgId);
  return {
    scope: "org",
    folderPath: buildManagedFolderPath(["02_orgs", `org_${safeOrgId}`, kind]),
    leafFolder: kind,
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

export function getManagedUserDrivePlan(
  userId: string,
  kind: "inbox" | "processed" | "archive",
): ManagedDrivePlan {
  const safeUserId = sanitizeDriveSegment(userId);
  return {
    scope: "user",
    folderPath: buildManagedFolderPath(["03_users", `user_${safeUserId}`, kind]),
    leafFolder: kind,
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

export function getManagedTempDrivePlan(): ManagedDrivePlan {
  return {
    scope: "temp",
    folderPath: buildManagedFolderPath(["99_temp"]),
    leafFolder: "99_temp",
    rootFolderName: MANAGED_ROOT_NAME,
    rootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

function parseUrlOrigin(input?: string): string | null {
  if (!input) return null;
  try {
    return trimTrailingSlash(new URL(input).origin);
  } catch {
    return null;
  }
}

function parseForwardedOrigin(headers?: Headers): string | null {
  if (!headers) return null;
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost || headers.get("host");
  if (!host) return null;
  const proto = headers.get("x-forwarded-proto") || "https";
  return parseUrlOrigin(`${proto}://${host}`);
}

function inferBaseUrl(context?: DriveRequestContext): string {
  const fromRequestHeaders = parseForwardedOrigin(context?.headers);
  if (fromRequestHeaders) return fromRequestHeaders;

  const fromRequestUrl = parseUrlOrigin(context?.requestUrl);
  if (fromRequestUrl) return fromRequestUrl;

  const fromExplicitRedirect = parseUrlOrigin(REDIRECT_URI);
  if (fromExplicitRedirect) return fromExplicitRedirect;

  const fromSite = parseUrlOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromSite) return fromSite;

  const fromApp = parseUrlOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (fromApp) return fromApp;

  return "http://localhost:3000";
}

export function getAppBaseUrl(context?: DriveRequestContext): string {
  return inferBaseUrl(context);
}

export function getGDriveRedirectUri(context?: DriveRequestContext): string {
  if (REDIRECT_URI) {
    return trimTrailingSlash(REDIRECT_URI);
  }
  return `${inferBaseUrl(context)}/api/auth/gdrive/callback`;
}

export function getDriveConfigStatus(context?: DriveRequestContext): DriveConfigStatus {
  const missingConfig: string[] = [];
  if (!isValidClientId(CLIENT_ID)) missingConfig.push("GOOGLE_DRIVE_CLIENT_ID|GOOGLE_CLIENT_ID");
  if (!isValidClientSecret(CLIENT_SECRET)) missingConfig.push("GOOGLE_DRIVE_CLIENT_SECRET|GOOGLE_CLIENT_SECRET");
  if (!isValidStateSecret(STATE_SECRET)) missingConfig.push("GOOGLE_DRIVE_STATE_SECRET");

  const baseUrl = inferBaseUrl(context);
  if (!baseUrl) {
    missingConfig.push("NEXT_PUBLIC_SITE_URL_OR_NEXT_PUBLIC_APP_URL_OR_REQUEST_ORIGIN");
  }

  const redirectUri = getGDriveRedirectUri(context);
  const redirectOrigin = parseUrlOrigin(redirectUri);
  if (!redirectOrigin) {
    missingConfig.push("GOOGLE_DRIVE_REDIRECT_URI");
  }
  const baseOrigin = parseUrlOrigin(baseUrl);
  if (redirectOrigin && baseOrigin && redirectOrigin !== baseOrigin) {
    missingConfig.push("GOOGLE_DRIVE_REDIRECT_URI_ORIGIN_MISMATCH");
  }

  return {
    configured: missingConfig.length === 0,
    missingConfig,
    missingConfigDetails: describeDriveMissingConfig(missingConfig),
    baseUrl,
    redirectUri,
    redirectOrigin,
    managedRootFolderId: MANAGED_ROOT_FOLDER_ID,
  };
}

export function isDriveConfigured(context?: DriveRequestContext): boolean {
  return getDriveConfigStatus(context).configured;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function signStatePayload(payload: string): string {
  if (!isValidStateSecret(STATE_SECRET)) {
    throw new Error("Google Drive state secret geçersiz veya eksik.");
  }

  return crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createGDriveState(userId: string): string {
  const payload = JSON.stringify({
    u: userId,
    n: crypto.randomBytes(16).toString("hex"),
    t: Date.now(),
  });
  const encoded = base64url(payload);
  const signature = signStatePayload(encoded);
  return `${encoded}.${signature}`;
}

export function parseGDriveState(state: string, maxAgeMs = 20 * 60 * 1000): string | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signStatePayload(encodedPayload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const raw = Buffer.from(encodedPayload, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as { u?: string; t?: number };
    if (!parsed?.u || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.u;
  } catch {
    return null;
  }
}

export function getGDriveAuthUrl(state: string, context?: DriveRequestContext): string {
  const redirectUri = getGDriveRedirectUri(context);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  context?: DriveRequestContext,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
}> {
  const redirectUri = getGDriveRedirectUri(context);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Token alınamadı.");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    scope: data.scope ?? "",
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Token yenilenemedi.");

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

export async function saveUserTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date,
  scope: string,
): Promise<void> {
  await ensureUserGoogleTokensTable();
  driveConnectionCache.set(userId, {
    accessToken,
    refreshToken,
    expiresAt,
    cachedAt: Date.now(),
  });
  await prisma.$executeRaw`
    INSERT INTO user_google_tokens (user_id, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES (${userId}, ${accessToken}, ${refreshToken}, ${expiresAt}, ${scope}, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET access_token = EXCLUDED.access_token,
          refresh_token = COALESCE(EXCLUDED.refresh_token, user_google_tokens.refresh_token),
          expires_at = EXCLUDED.expires_at,
          scope = EXCLUDED.scope,
          updated_at = NOW()
  `;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  await ensureUserGoogleTokensTable();
  const rows = await getStoredUserGoogleTokens(userId);

  if (!rows.length) return null;
  const { accessToken, refreshToken, expiresAt } = rows[0];

  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) return accessToken;
  if (!refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await saveUserTokens(userId, refreshed.accessToken, refreshToken, refreshed.expiresAt, "");
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function hasDriveConnection(userId: string): Promise<boolean> {
  await ensureUserGoogleTokensTable();
  const rows = await getStoredUserGoogleTokens(userId);
  return rows.length > 0;
}

export async function getDriveConnectionStatus(userId: string): Promise<{
  connected: boolean;
  reauthRequired: boolean;
}> {
  const tokenRows = await getStoredUserGoogleTokens(userId);
  if (!tokenRows.length) return { connected: false, reauthRequired: false };

  const token = await getValidAccessToken(userId);
  if (!token) return { connected: false, reauthRequired: true };
  return { connected: true, reauthRequired: false };
}

export async function revokeDriveConnection(userId: string): Promise<void> {
  await ensureUserGoogleTokensTable();
  driveConnectionCache.delete(userId);
  const rows = await prisma.$queryRaw<{ accessToken: string }[]>`
    SELECT access_token AS "accessToken" FROM user_google_tokens WHERE user_id = ${userId} LIMIT 1
  `;
  if (rows.length) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${rows[0].accessToken}`).catch(() => {});
  }
  await prisma.$executeRaw`DELETE FROM user_google_tokens WHERE user_id = ${userId}`;
}

async function getStoredUserGoogleTokens(userId: string): Promise<
  {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
  }[]
> {
  const cached = driveConnectionCache.get(userId);
  if (cached && cached.cachedAt + DRIVE_CONNECTION_CACHE_TTL_MS > Date.now()) {
    if (!cached.accessToken || !cached.expiresAt) return [];
    return [
      {
        accessToken: cached.accessToken,
        refreshToken: cached.refreshToken,
        expiresAt: cached.expiresAt,
      },
    ];
  }

  const rows = await prisma.$queryRaw<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
  }[]>`
    SELECT access_token AS "accessToken", refresh_token AS "refreshToken", expires_at AS "expiresAt"
    FROM user_google_tokens WHERE user_id = ${userId} LIMIT 1
  `;

  const first = rows[0];
  driveConnectionCache.set(userId, {
    accessToken: first?.accessToken ?? null,
    refreshToken: first?.refreshToken ?? null,
    expiresAt: first?.expiresAt ?? null,
    cachedAt: Date.now(),
  });

  return rows;
}

function toDriveError(reason: DriveDownloadErrorReason, fallback?: string): DriveIntegrationError {
  switch (reason) {
    case "file_not_found":
      return new DriveIntegrationError(reason, fallback || "Drive dosyası bulunamadı.", 404);
    case "access_denied":
      return new DriveIntegrationError(reason, fallback || "Drive dosyasına erişim izni yok.", 403);
    case "reauth_required":
      return new DriveIntegrationError(reason, fallback || "Drive bağlantısı yenilenmeli.", 403);
    case "export_unsupported":
      return new DriveIntegrationError(reason, fallback || "Bu Google dosya tipi export edilemiyor.", 400);
    case "download_failed":
    default:
      return new DriveIntegrationError(reason, fallback || "Drive dosyası indirilemedi.", 500);
  }
}

function mapDriveHttpError(status: number, fallback?: string): DriveIntegrationError {
  if (status === 401) return toDriveError("reauth_required", fallback);
  if (status === 403) return toDriveError("access_denied", fallback);
  if (status === 404) return toDriveError("file_not_found", fallback);
  return toDriveError("download_failed", fallback);
}

async function fetchDriveMeta(accessToken: string, fileId: string): Promise<DriveFileMeta> {
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,webViewLink,shortcutDetails(targetId,targetMimeType),exportLinks`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) throw mapDriveHttpError(metaRes.status, "Drive dosyası bilgileri alınamadı.");
  return (await metaRes.json()) as DriveFileMeta;
}

export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<{ buffer: Buffer; name: string; mimeType: string; size: number; webViewLink: string }> {
  let meta = await fetchDriveMeta(accessToken, fileId);
  let effectiveFileId = fileId;

  if (meta.mimeType === "application/vnd.google-apps.shortcut" && meta.shortcutDetails?.targetId) {
    effectiveFileId = meta.shortcutDetails.targetId;
    meta = await fetchDriveMeta(accessToken, effectiveFileId);
  }

  const initialMime = meta.mimeType || "";
  let mimeType = initialMime;
  let downloadUrl: string | null = null;

  if (EXPORT_MAP[initialMime]) {
    const targetMime = EXPORT_MAP[initialMime].mime;
    const canExport =
      !!meta.exportLinks?.[targetMime] ||
      initialMime.startsWith("application/vnd.google-apps.");
    if (!canExport) {
      throw toDriveError("export_unsupported");
    }
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${effectiveFileId}/export?mimeType=${encodeURIComponent(
      targetMime,
    )}`;
    mimeType = targetMime;
  } else if (initialMime.startsWith("application/vnd.google-apps.")) {
    throw toDriveError("export_unsupported");
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${effectiveFileId}?alt=media`;
  }

  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) throw mapDriveHttpError(fileRes.status, "Drive dosyası indirilemedi.");

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const webViewLink = meta.webViewLink || `https://drive.google.com/file/d/${effectiveFileId}/view`;

  return {
    buffer,
    name: meta.name || "Drive Dosyası",
    mimeType,
    size: buffer.length,
    webViewLink,
  };
}

export function mimeToType(mimeType: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return "docx";
  if (mimeType.includes("presentationml") || mimeType.includes("powerpoint")) return "pptx";
  if (mimeType.includes("spreadsheetml") || mimeType.includes("excel")) return "xlsx";
  if (mimeType.includes("text/plain")) return "txt";
  return "txt";
}

export function normalizeDriveError(error: unknown): DriveIntegrationError {
  if (error instanceof DriveIntegrationError) return error;
  const message = error instanceof Error ? error.message : "Drive işlemi başarısız.";
  if (/not found|bulunamad/i.test(message)) return toDriveError("file_not_found", message);
  if (/permission|forbidden|erişim/i.test(message)) return toDriveError("access_denied", message);
  if (/token|reauth|unauthorized/i.test(message)) return toDriveError("reauth_required", message);
  if (/export/i.test(message)) return toDriveError("export_unsupported", message);
  return toDriveError("download_failed", message);
}
