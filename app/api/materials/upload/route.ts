import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMaterial,
  getManagedMaterialPaths,
  processMaterial,
  updateMaterialDriveArtifacts,
} from "@/lib/rag/user-materials";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
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
export const maxDuration = 120; // Processing can take time

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ["pdf", "docx", "doc", "pptx", "ppt", "txt", "md"];

function resolveMimeType(ext: string, fallback?: string) {
  if (fallback && fallback.trim()) return fallback;
  switch (ext.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "md":
      return "text/markdown; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

/**
 * POST /api/materials/upload
 * Multipart form: file, branch?
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const branch = (formData.get("branch") as string) || "Genel";
  const materialType = (formData.get("materialType") as string) || "Genel";
  const customTitle = (formData.get("title") as string) || "";

  if (!file) return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya 50 MB sınırını aşıyor." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json({
      error: `Desteklenmeyen dosya tipi. İzin verilenler: ${ALLOWED_TYPES.join(", ")}`,
    }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await ensureMaterialsSchema();
  const handshake = await getManagedDriveHandshakeStatus();
  if (!handshake.ready) {
    return NextResponse.json(
      {
        error:
          "Drive handshake başarısız. service_account.json veya Medasi Root erişimi doğrulanamadı.",
        handshake,
      },
      { status: 503 },
    );
  }
  const workspace = await getOrCreateUserDriveWorkspace(user.id);
  const managedPaths = getManagedMaterialPaths(user.id);

  // Tekrar yükleme kontrolü (hem dosya adı hem hash ile)
  const existing = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM user_materials
    WHERE user_id = ${user.id}
      AND (name = ${file.name.replace(/\.[^.]+$/, "")} OR name = ${file.name})
    LIMIT 1
  `;

  if (existing.length > 0) {
    return NextResponse.json({
      error: "Bu dosya zaten yüklü.",
      materialId: existing[0].id,
    }, { status: 409 });
  }

  // Materyal kaydı oluştur
  const baseName = customTitle.trim() || file.name.replace(/\.[^.]+$/, "");
  const normalizedType = materialType.trim();
  const persistedName =
    normalizedType && normalizedType !== "Genel"
      ? `[${normalizedType}] ${baseName}`
      : baseName;

  const sourceUpload = await uploadBinaryToDriveFolder({
    folderId: workspace.inboxFolderId,
    name: file.name,
    mimeType: resolveMimeType(ext, file.type),
    buffer,
    userEmail: user.email,
  });

  const materialId = await createMaterial({
    userId: user.id,
    name: persistedName,
    type: ext,
    sizeBytes: file.size,
    source: "upload",
    driveWebViewLink: sourceUpload.webViewLink ?? undefined,
    branch,
    managedDriveFileId: sourceUpload.fileId,
  });

  // Arka planda işle (response hemen dön)
  processMaterial(user.id, materialId, file.name.replace(/\.[^.]+$/, ""), ext, branch, buffer)
    .then(async (result) => {
      createSystemLog({
        level: "info",
        category: "materials",
        message: `Ajan-1 tetiklendi: ${file.name}`,
        details: `User: ${user.id} | Material: ${materialId}`,
        userId: user.id,
      }).catch(() => {});

      const summary = await generateMaterialSummary({
        title: persistedName,
        branch,
        text: result.extractedText ?? "",
      }).catch(() => "Ozet olusturulamadi.");

      const summaryFile = await writeTextFileToDriveFolder({
        folderId: workspace.processedFolderId,
        name: `${file.name.replace(/\.[^.]+$/, "")}_ozet.txt`,
        content: summary,
        userEmail: user.email,
      });
      await moveDriveFileToFolder(sourceUpload.fileId, workspace.archiveFolderId);
      await updateMaterialDriveArtifacts(materialId, {
        managedDriveFileId: sourceUpload.fileId,
        managedDriveProcessedFileId: summaryFile.fileId,
        managedDriveArchiveFileId: sourceUpload.fileId,
        driveWebViewLink: sourceUpload.webViewLink,
      });

      createSystemLog({
        level: "info",
        category: "materials",
        message: `Materyal işlendi ve arşivlendi: ${file.name}`,
        details: `User: ${user.id} | Chunks: ${result.chunkCount} | DriveProcessedPath: ${managedPaths.processed} | SummaryFile: ${summaryFile.fileId}`,
        userId: user.id,
      }).catch(() => {});
    })
    .catch((err) => {
      console.error("Material processing error:", err);
    });

  return NextResponse.json({
    success: true,
    materialId,
    name: file.name,
    status: "processing",
    managedDrive: managedPaths,
    message: "Dosya inbox klasorune yüklendi, işleniyor...",
  });
}
