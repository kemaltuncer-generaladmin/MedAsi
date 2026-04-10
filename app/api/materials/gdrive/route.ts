import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  downloadDriveFile,
  mimeToType,
} from "@/lib/gdrive/client";
import { createMaterial, processMaterial } from "@/lib/rag/user-materials";
import { createSystemLog } from "@/lib/system-log";
import { prisma } from "@/lib/prisma";

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

  let body: { fileId: string; fileName?: string; branch?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!body.fileId) return NextResponse.json({ error: "fileId gerekli." }, { status: 400 });

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

  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json({
      error: "Google Drive bağlı değil. Lütfen önce Drive'ı bağlayın.",
      needsConnection: true,
    }, { status: 403 });
  }

  // Drive'dan indir
  let fileData: { buffer: Buffer; name: string; mimeType: string; size: number };
  try {
    fileData = await downloadDriveFile(accessToken, body.fileId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dosya indirilemedi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const fileType = mimeToType(fileData.mimeType);
  const branch = body.branch ?? "Genel";
  const name = body.fileName || fileData.name;
  const cleanName = name.replace(/\.[^.]+$/, "");

  const materialId = await createMaterial({
    userId: user.id,
    name: cleanName,
    type: fileType,
    sizeBytes: fileData.size,
    source: "gdrive",
    driveFileId: body.fileId,
    driveWebViewLink: `https://drive.google.com/file/d/${body.fileId}/view`,
    branch,
  });

  // Arka planda işle
  processMaterial(user.id, materialId, cleanName, fileType, branch, fileData.buffer)
    .then((result) => {
      createSystemLog({
        level: "info",
        category: "materials",
        message: `Drive materyali işlendi: ${cleanName}`,
        details: `User: ${user.id} | FileId: ${body.fileId} | Chunks: ${result.chunkCount}`,
        userId: user.id,
      }).catch(() => {});
    })
    .catch(console.error);

  return NextResponse.json({
    success: true,
    materialId,
    name: cleanName,
    status: "processing",
  });
}
