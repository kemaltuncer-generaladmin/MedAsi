/**
 * Google Drive OAuth 2.0 & Dosya İndirme
 * ────────────────────────────────────────
 * Kullanıcı Google Drive'ına erişim izni verir.
 * Seçilen dosyalar server-side indirilip işlenir.
 *
 * Gerekli env:
 *   GOOGLE_DRIVE_CLIENT_ID
 *   GOOGLE_DRIVE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL veya NEXT_PUBLIC_SITE_URL (ör: https://medasi.app)
 *   GOOGLE_DRIVE_REDIRECT_URI (opsiyonel, OAuth panelindeki callback ile birebir eşleşmeli)
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET!;
const STATE_SECRET = process.env.GOOGLE_DRIVE_STATE_SECRET || CLIENT_SECRET;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return trimTrailingSlash(fromEnv);
}

export function getGDriveRedirectUri(): string {
  const explicit = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (explicit && explicit.trim()) {
    return trimTrailingSlash(explicit.trim());
  }
  return `${getAppBaseUrl()}/api/auth/gdrive/callback`;
}

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function signStatePayload(payload: string): string {
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

export function parseGDriveState(state: string, maxAgeMs = 10 * 60 * 1000): string | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signStatePayload(encodedPayload);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

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

// ─── OAuth URL ────────────────────────────────────────────────────────────────
export function getGDriveAuthUrl(state: string): string {
  const redirectUri = getGDriveRedirectUri();
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

// ─── Token değişimi (code → access+refresh) ──────────────────────────────────
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
}> {
  const redirectUri = getGDriveRedirectUri();
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

// ─── Token yenile ────────────────────────────────────────────────────────────
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

// ─── DB: token kaydet ─────────────────────────────────────────────────────────
export async function saveUserTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date,
  scope: string,
): Promise<void> {
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

// ─── DB: geçerli access token al (auto-refresh) ──────────────────────────────
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
  }[]>`
    SELECT access_token AS "accessToken", refresh_token AS "refreshToken", expires_at AS "expiresAt"
    FROM user_google_tokens WHERE user_id = ${userId} LIMIT 1
  `;

  if (!rows.length) return null;
  const { accessToken, refreshToken, expiresAt } = rows[0];

  // 5 dakika öncesinden yenile
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return accessToken;
  }

  if (!refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await saveUserTokens(userId, refreshed.accessToken, refreshToken, refreshed.expiresAt, "");
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

// ─── Kullanıcının Drive bağlantısı var mı? ───────────────────────────────────
export async function hasDriveConnection(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ user_id: string }[]>`
    SELECT user_id FROM user_google_tokens WHERE user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

// ─── Drive bağlantısını kaldır ────────────────────────────────────────────────
export async function revokeDriveConnection(userId: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ accessToken: string }[]>`
    SELECT access_token AS "accessToken" FROM user_google_tokens WHERE user_id = ${userId} LIMIT 1
  `;
  if (rows.length) {
    // Revoke at Google (best effort)
    fetch(`https://oauth2.googleapis.com/revoke?token=${rows[0].accessToken}`).catch(() => {});
  }
  await prisma.$executeRaw`DELETE FROM user_google_tokens WHERE user_id = ${userId}`;
}

// ─── Drive dosyası indir ──────────────────────────────────────────────────────
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<{ buffer: Buffer; name: string; mimeType: string; size: number }> {
  // Önce metadata al
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!metaRes.ok) throw new Error("Drive dosyası bulunamadı.");
  const meta = await metaRes.json();

  let downloadUrl: string;
  let mimeType = meta.mimeType as string;

  // Google Docs → dönüştür
  const exportMap: Record<string, { mime: string; ext: string }> = {
    "application/vnd.google-apps.document":      { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
    "application/vnd.google-apps.presentation":  { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx" },
  };

  if (exportMap[mimeType]) {
    const { mime } = exportMap[mimeType];
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mime)}`;
    mimeType = mime;
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!fileRes.ok) throw new Error("Dosya indirilemedi.");

  const arrayBuffer = await fileRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    name: meta.name as string,
    mimeType,
    size: buffer.length,
  };
}

// ─── MIME → dosya tipi ────────────────────────────────────────────────────────
export function mimeToType(mimeType: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) return "docx";
  if (mimeType.includes("presentationml") || mimeType.includes("powerpoint")) return "pptx";
  if (mimeType.includes("text/plain")) return "txt";
  return "txt";
}

// ─── Drive bağlantı durumu ────────────────────────────────────────────────────
export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET);
}
