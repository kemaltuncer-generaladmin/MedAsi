import { Readable } from "stream";
import { promises as fs } from "fs";
import { google, type drive_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { ensureMaterialsSchema } from "@/lib/db/schema-guard";

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

type ServiceAccountCredentials = {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
};

type HandshakeStatus = {
  serviceAccountFilePresent: boolean;
  rootFolderConfigured: boolean;
  rootFolderReachable: boolean;
  rootFolderId: string | null;
  serviceAccountEmail: string | null;
  ready: boolean;
};

export type UserDriveWorkspace = {
  userId: string;
  userFolderId: string;
  inboxFolderId: string;
  processedFolderId: string;
  archiveFolderId: string;
};

export type LibraryFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  size: number | null;
  modifiedTime: string | null;
  bucket: string;
};

let cachedCredentials: ServiceAccountCredentials | null = null;
let cachedDrive: drive_v3.Drive | null = null;
let cachedResolvedRootFolderId: string | null = null;
let handshakeCache:
  | { value: HandshakeStatus; expiresAt: number }
  | null = null;
let libraryFilesCache:
  | { value: LibraryFile[]; expiresAt: number }
  | null = null;
const userWorkspaceCache = new Map<
  string,
  { value: UserDriveWorkspace; expiresAt: number }
>();
const folderIdCache = new Map<string, string>();
const HANDSHAKE_TTL_MS = 60_000;
const LIBRARY_TTL_MS = 60_000;
const USER_WORKSPACE_TTL_MS = 5 * 60_000;

function getRootFolderId() {
  const value = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "").trim();
  return value.length > 0 ? value : null;
}

function getServiceAccountJsonEnv() {
  return (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "").trim();
}

function getServiceAccountFileEnv() {
  return (
    (process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? "").trim() ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "").trim()
  );
}

function sanitizeDriveSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
      .replace(/\s+/g, "_")
      .replace(/-+/g, "-")
      .replace(/_+/g, "_")
      .replace(/^[_-]+|[_-]+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function assertServiceCredentialsShape(input: any): ServiceAccountCredentials {
  if (!input || typeof input !== "object") throw new Error("Service account JSON okunamadı.");
  if (input.type !== "service_account") throw new Error("JSON tipi service_account değil.");
  if (!input.project_id || !input.private_key || !input.client_email) {
    throw new Error("Service account JSON zorunlu alanları eksik.");
  }
  return {
    type: input.type,
    project_id: input.project_id,
    private_key: input.private_key,
    client_email: input.client_email,
  };
}

async function loadServiceAccountCredentials(): Promise<ServiceAccountCredentials> {
  if (cachedCredentials) return cachedCredentials;

  const fromJson = getServiceAccountJsonEnv();
  if (fromJson) {
    cachedCredentials = assertServiceCredentialsShape(JSON.parse(fromJson));
    return cachedCredentials;
  }

  const fromFile = getServiceAccountFileEnv();
  if (!fromFile) {
    throw new Error("Service account yolu bulunamadı. GOOGLE_SERVICE_ACCOUNT_FILE tanımlayın.");
  }

  const raw = await fs.readFile(fromFile, "utf-8");
  cachedCredentials = assertServiceCredentialsShape(JSON.parse(raw));
  return cachedCredentials;
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  if (cachedDrive) return cachedDrive;
  const credentials = await loadServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: DRIVE_SCOPES,
  });
  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

async function resolveRootFolderId(): Promise<string> {
  if (cachedResolvedRootFolderId) return cachedResolvedRootFolderId;
  const configured = getRootFolderId();
  if (configured) {
    cachedResolvedRootFolderId = configured;
    return configured;
  }

  const drive = await getDriveClient();
  const existing = await drive.files.list({
    q: `name='Medasi Root' and mimeType='${DRIVE_FOLDER_MIME}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    cachedResolvedRootFolderId = existingId;
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name: "Medasi Root",
      mimeType: DRIVE_FOLDER_MIME,
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Medasi Root klasoru olusturulamadi.");
  cachedResolvedRootFolderId = created.data.id;
  return created.data.id;
}

export async function getManagedDriveHandshakeStatus(): Promise<HandshakeStatus> {
  if (handshakeCache && handshakeCache.expiresAt > Date.now()) {
    return handshakeCache.value;
  }

  const configuredRootFolderId = getRootFolderId();
  const serviceAccountFilePresent = Boolean(getServiceAccountJsonEnv() || getServiceAccountFileEnv());
  const rootFolderConfigured = Boolean(configuredRootFolderId);

  if (!serviceAccountFilePresent) {
    const status = {
      serviceAccountFilePresent,
      rootFolderConfigured: false,
      rootFolderReachable: false,
      rootFolderId: configuredRootFolderId,
      serviceAccountEmail: null,
      ready: false,
    };
    handshakeCache = { value: status, expiresAt: Date.now() + HANDSHAKE_TTL_MS };
    return status;
  }

  try {
    const credentials = await loadServiceAccountCredentials();
    const rootFolderId = await resolveRootFolderId();
    const drive = await getDriveClient();
    await drive.files.get({
      fileId: rootFolderId!,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });
    const status = {
      serviceAccountFilePresent: true,
      rootFolderConfigured: true,
      rootFolderReachable: true,
      rootFolderId,
      serviceAccountEmail: credentials.client_email,
      ready: true,
    };
    handshakeCache = { value: status, expiresAt: Date.now() + HANDSHAKE_TTL_MS };
    return status;
  } catch {
    const status = {
      serviceAccountFilePresent: true,
      rootFolderConfigured,
      rootFolderReachable: false,
      rootFolderId: configuredRootFolderId,
      serviceAccountEmail: null,
      ready: false,
    };
    handshakeCache = { value: status, expiresAt: Date.now() + HANDSHAKE_TTL_MS };
    return status;
  }
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const cacheKey = `${parentId}:${name}`;
  const cached = folderIdCache.get(cacheKey);
  if (cached) return cached;

  const drive = await getDriveClient();
  const safeName = escapeDriveQueryValue(name);
  const q = `'${parentId}' in parents and mimeType='${DRIVE_FOLDER_MIME}' and trashed=false and name='${safeName}'`;

  const listed = await drive.files.list({
    q,
    fields: "files(id,name)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const existingId = listed.data.files?.[0]?.id;
  if (existingId) {
    folderIdCache.set(cacheKey, existingId);
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error(`Drive klasörü oluşturulamadı: ${name}`);
  folderIdCache.set(cacheKey, created.data.id);
  return created.data.id;
}

async function ensureManagedUserFolderTree(userId: string) {
  const rootFolderId = await resolveRootFolderId();

  const usersRoot = await findOrCreateFolder(rootFolderId, "03_users");
  const userFolder = await findOrCreateFolder(usersRoot, `user_${sanitizeDriveSegment(userId)}`);
  const inbox = await findOrCreateFolder(userFolder, "inbox");
  const processed = await findOrCreateFolder(userFolder, "processed");
  const archive = await findOrCreateFolder(userFolder, "archive");

  return {
    userFolderId: userFolder,
    inboxFolderId: inbox,
    processedFolderId: processed,
    archiveFolderId: archive,
  };
}

export async function getOrCreateUserDriveWorkspace(userId: string): Promise<UserDriveWorkspace> {
  const cached = userWorkspaceCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  await ensureMaterialsSchema();

  const existing = await prisma.$queryRaw<UserDriveWorkspace[]>`
    SELECT
      user_id AS "userId",
      user_folder_id AS "userFolderId",
      inbox_folder_id AS "inboxFolderId",
      processed_folder_id AS "processedFolderId",
      archive_folder_id AS "archiveFolderId"
    FROM public.user_drive_workspaces
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    userWorkspaceCache.set(userId, {
      value: existing[0]!,
      expiresAt: Date.now() + USER_WORKSPACE_TTL_MS,
    });
    return existing[0]!;
  }

  const created = await ensureManagedUserFolderTree(userId);
  await prisma.$executeRaw`
    INSERT INTO public.user_drive_workspaces (
      user_id,
      user_folder_id,
      inbox_folder_id,
      processed_folder_id,
      archive_folder_id,
      created_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${created.userFolderId},
      ${created.inboxFolderId},
      ${created.processedFolderId},
      ${created.archiveFolderId},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
      SET user_folder_id = EXCLUDED.user_folder_id,
          inbox_folder_id = EXCLUDED.inbox_folder_id,
          processed_folder_id = EXCLUDED.processed_folder_id,
          archive_folder_id = EXCLUDED.archive_folder_id,
          updated_at = NOW()
  `;

  const workspace = {
    userId,
    ...created,
  };
  userWorkspaceCache.set(userId, {
    value: workspace,
    expiresAt: Date.now() + USER_WORKSPACE_TTL_MS,
  });
  return workspace;
}

export async function uploadBinaryToDriveFolder(params: {
  folderId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
  userEmail?: string | null;
}): Promise<{ fileId: string; webViewLink: string | null; size: number | null }> {
  const drive = await getDriveClient();
  const created = await drive.files.create({
    requestBody: {
      name: params.name,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id,webViewLink,size",
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) throw new Error("Drive dosyası oluşturulamadı.");

  if (params.userEmail && params.userEmail.includes("@")) {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role: "reader",
        emailAddress: params.userEmail,
      },
      sendNotificationEmail: false,
      supportsAllDrives: true,
    }).catch(() => {});
  }

  return {
    fileId,
    webViewLink: created.data.webViewLink ?? null,
    size: created.data.size ? Number(created.data.size) : null,
  };
}

export async function writeTextFileToDriveFolder(params: {
  folderId: string;
  name: string;
  content: string;
  userEmail?: string | null;
}): Promise<{ fileId: string; webViewLink: string | null }> {
  const result = await uploadBinaryToDriveFolder({
    folderId: params.folderId,
    name: params.name,
    mimeType: "text/plain; charset=utf-8",
    buffer: Buffer.from(params.content, "utf-8"),
    userEmail: params.userEmail,
  });
  return { fileId: result.fileId, webViewLink: result.webViewLink };
}

export async function moveDriveFileToFolder(fileId: string, targetFolderId: string): Promise<void> {
  const drive = await getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const previousParents = (meta.data.parents ?? []).join(",");
  await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: previousParents || undefined,
    fields: "id,parents",
    supportsAllDrives: true,
  });
}

export async function listLibraryFiles(limitPerBucket = 20): Promise<LibraryFile[]> {
  if (libraryFilesCache && libraryFilesCache.expiresAt > Date.now()) {
    return libraryFilesCache.value;
  }

  const rootFolderId = getRootFolderId();
  if (!rootFolderId) return [];

  const drive = await getDriveClient();
  const libraryRootId = await findOrCreateFolder(rootFolderId, "01_library");
  const buckets = ["textbooks", "slides", "notes", "videos", "exam-content", "guidelines"];
  const all: LibraryFile[] = [];

  for (const bucket of buckets) {
    const bucketId = await findOrCreateFolder(libraryRootId, bucket);
    const listed = await drive.files.list({
      q: `'${bucketId}' in parents and trashed=false and mimeType!='${DRIVE_FOLDER_MIME}'`,
      fields: "files(id,name,mimeType,webViewLink,size,modifiedTime)",
      pageSize: limitPerBucket,
      orderBy: "modifiedTime desc",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    for (const item of listed.data.files ?? []) {
      if (!item.id) continue;
      all.push({
        id: item.id,
        name: item.name ?? "Adsız",
        mimeType: item.mimeType ?? "application/octet-stream",
        webViewLink: item.webViewLink ?? null,
        size: item.size ? Number(item.size) : null,
        modifiedTime: item.modifiedTime ?? null,
        bucket,
      });
    }
  }

  const value = all.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
  libraryFilesCache = { value, expiresAt: Date.now() + LIBRARY_TTL_MS };
  return value;
}
