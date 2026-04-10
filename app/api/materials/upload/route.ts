import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMaterial, processMaterial, computeFileHash } from "@/lib/rag/user-materials";
import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Processing can take time

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ["pdf", "docx", "doc", "pptx", "ppt", "txt", "md"];

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
  const fileHash = computeFileHash(buffer);

  // Tekrar yükleme kontrolü
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM user_materials
    WHERE user_id = ${user.id}
      AND name = ${file.name}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return NextResponse.json({
      error: "Bu dosya zaten yüklü.",
      materialId: existing[0].id,
    }, { status: 409 });
  }

  // Materyal kaydı oluştur
  const materialId = await createMaterial({
    userId: user.id,
    name: customTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
    type: ext,
    sizeBytes: file.size,
    source: "upload",
    branch,
  });

  // Arka planda işle (response hemen dön)
  processMaterial(user.id, materialId, file.name.replace(/\.[^.]+$/, ""), ext, branch, buffer)
    .then((result) => {
      createSystemLog({
        level: "info",
        category: "materials",
        message: `Materyal işlendi: ${file.name}`,
        details: `User: ${user.id} | Chunks: ${result.chunkCount}`,
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
    message: "Dosya yüklendi, işleniyor...",
  });
}
