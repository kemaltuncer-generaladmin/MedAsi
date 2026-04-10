import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDriveConnectionStatus,
  getValidAccessToken,
  downloadDriveFile,
  mimeToType,
  normalizeDriveError,
  getManagedUserDrivePlan,
} from "@/lib/gdrive/client";
import {
  createMaterial,
  processMaterial,
  updateMaterialDriveArtifacts,
} from "@/lib/rag/user-materials";
import { createSystemLog } from "@/lib/system-log";
import { prisma } from "@/lib/prisma";
import { ensureMaterialsSchema } from "@/lib/db/schema-guard";
import {
  getManagedDriveHandshakeStatus,
  getOrCreateUserDriveWorkspace,
  moveDriveFileToFolder,
  uploadBinaryToDriveFolder,
  writeTextFileToDriveFolder,
} from "@/lib/gdrive/service-account";
import { generateMaterialSummary } from "@/lib/ai/material-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/materials/gdrive
 * Body: { fileId: string, fileName?: string, branch?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { fileId: string; fileName?: string; branch?: string; materialType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!body.fileId) return NextResponse.json({ error: "fileId gerekli." }, { status: 400 });

  await ensureMaterialsSchema();
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM user_materials
    WHERE user_id = ${user.id}
      AND drive_file_id = ${body.fileId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return NextResponse.json({
      success: true,
      materialId: existing[0].id,
      status: "exists",
      message: "Bu Drive dosyası daha önce eklenmiş.",
    });
  }

  const [connectionStatus, accessToken] = await Promise.all([
    getDriveConnectionStatus(user.id),
    getValidAccessToken(user.id),
  ]);
  const handshake = await getManagedDriveHandshakeStatus();
  if (!handshake.ready) {
    return NextResponse.json(
      {
        error: "Drive servis hesabı hazır değil. service_account ve root erişimini kontrol edin.",
        reason: "managed_drive_unavailable",
      },
      { status: 503 },
    );
  }
  const workspace = await getOrCreateUserDriveWorkspace(user.id);
  const userDrivePaths = {
    inbox: getManagedUserDrivePlan(user.id, "inbox").folderPath,
    processed: getManagedUserDrivePlan(user.id, "processed").folderPath,
    archive: getManagedUserDrivePlan(user.id, "archive").folderPath,
  };

  if (!accessToken) {
    return NextResponse.json({
      error: "Google Drive bağlı değil. Lütfen önce Drive'ı bağlayın.",
      needsConnection: true,
      reauthRequired: connectionStatus.reauthRequired,
      reason: connectionStatus.reauthRequired ? "reauth_required" : "needs_connection",
      action: connectionStatus.reauthRequired ? "reauth" : "connect",
    }, { status: 403 });
  }

  // Drive'dan indir
  let fileData: { buffer: Buffer; name: string; mimeType: string; size: number; webViewLink: string };
  try {
    fileData = await downloadDriveFile(accessToken, body.fileId);
  } catch (err) {
    const driveError = normalizeDriveError(err);
    return NextResponse.json(
      {
        error: driveError.message,
        reason: driveError.reason,
        reauthRequired: driveError.reason === "reauth_required",
        retryable: ["download_failed", "token_exchange"].includes(driveError.reason),
        action: driveError.reason === "reauth_required"
          ? "reauth"
          : ["download_failed", "token_exchange"].includes(driveError.reason)
            ? "retry"
            : undefined,
      },
      { status: driveError.status },
    );
  }

  const fileType = mimeToType(fileData.mimeType);
  const branch = body.branch ?? "Genel";
  const name = body.fileName || fileData.name;
  const normalizedType = body.materialType?.trim() || "Genel";
  const cleanName = name.replace(/\.[^.]+$/, "");
  const persistedName =
    normalizedType !== "Genel" ? `[${normalizedType}] ${cleanName}` : cleanName;
  const sourceUpload = await uploadBinaryToDriveFolder({
    folderId: workspace.inboxFolderId,
    name,
    mimeType: fileData.mimeType,
    buffer: fileData.buffer,
    userEmail: user.email,
  });

  const materialId = await createMaterial({
    userId: user.id,
    name: persistedName,
    type: fileType,
    sizeBytes: fileData.size,
    source: "gdrive",
    driveFileId: body.fileId,
    driveWebViewLink: sourceUpload.webViewLink ?? fileData.webViewLink,
    branch,
    managedDriveFileId: sourceUpload.fileId,
  });

  // Arka planda işle
  processMaterial(user.id, materialId, cleanName, fileType, branch, fileData.buffer)
    .then(async (result) => {
      const summary = await generateMaterialSummary({
        title: persistedName,
        branch,
        text: result.extractedText ?? "",
      }).catch(() => "Ozet olusturulamadi.");

      const summaryFile = await writeTextFileToDriveFolder({
        folderId: workspace.processedFolderId,
        name: `${cleanName}_ozet.txt`,
        content: summary,
        userEmail: user.email,
      });
      await moveDriveFileToFolder(sourceUpload.fileId, workspace.archiveFolderId);
      await updateMaterialDriveArtifacts(materialId, {
        managedDriveFileId: sourceUpload.fileId,
        managedDriveProcessedFileId: summaryFile.fileId,
        managedDriveArchiveFileId: sourceUpload.fileId,
        driveWebViewLink: sourceUpload.webViewLink ?? fileData.webViewLink,
      });

      createSystemLog({
        level: "info",
        category: "materials",
        message: `Drive materyali işlendi: ${cleanName}`,
        details: `User: ${user.id} | SourceFileId: ${body.fileId} | ManagedFile: ${sourceUpload.fileId} | Chunks: ${result.chunkCount} | DriveProcessedPath: ${userDrivePaths.processed}`,
        userId: user.id,
      }).catch(() => {});
    })
    .catch(console.error);

  return NextResponse.json({
    success: true,
    materialId,
    name: cleanName,
    status: "processing",
    managedDrive: userDrivePaths,
  });
}
