/**
 * Kullanıcı Materyalleri — İşleme & Yönetim
 * ─────────────────────────────────────────
 * PDF, DOCX, PPTX ve metin dosyalarını kullanıcıya özel RAG pipeline'ına aktarır.
 * Her dosya:
 *   1. Metin çıkarılır (PDF/DOCX/PPTX)
 *   2. Parçalara ayrılır (1000 karakter, 150 örtüşme)
 *   3. Gemini text-embedding-004 ile vektörleştirilir
 *   4. document_chunks tablosuna user_id + material_id ile kaydedilir
 */

import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { requireGeminiApiKey } from "@/lib/ai/env";
import { normalizeGeminiError } from "@/lib/ai/google-errors";
import { ensureMaterialsSchema } from "@/lib/db/schema-guard";
import { getManagedUserDrivePlan } from "@/lib/gdrive/client";
import { splitTextIntoChunks } from "./service";

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface UserMaterial {
  id: string;
  userId: string;
  name: string;
  type: string;
  sizeBytes: number | null;
  status: "processing" | "ready" | "failed";
  source: "upload" | "gdrive";
  driveFileId: string | null;
  driveWebViewLink: string | null;
  managedDriveFileId?: string | null;
  managedDriveProcessedFileId?: string | null;
  managedDriveArchiveFileId?: string | null;
  branch: string;
  chunkCount: number;
  pageCount: number | null;
  slideCount?: number | null;
  errorMessage: string | null;
  processingStage?: string;
  qualityScore?: number | null;
  extractionConfidence?: number | null;
  readyForQuestions?: boolean;
  readyForFlashcards?: boolean;
  managedDrivePath?: string;
  managedProcessedPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialMark {
  id: string;
  userId: string;
  materialId: string;
  slideNo: number | null;
  color: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngestResult {
  materialId: string;
  chunkCount: number;
  pageCount?: number;
  extractedText?: string;
}

// ─── Supabase client ─────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getEmbedder() {
  return new GoogleGenerativeAI(requireGeminiApiKey("embeddings")).getGenerativeModel({
    model: "text-embedding-004",
  });
}

// ─── Materyal oluştur (DB) ───────────────────────────────────────────────────
export async function createMaterial(data: {
  userId: string;
  name: string;
  type: string;
  sizeBytes?: number;
  source: "upload" | "gdrive";
  driveFileId?: string;
  driveWebViewLink?: string;
  branch?: string;
  managedDriveFileId?: string | null;
  managedDriveProcessedFileId?: string | null;
  managedDriveArchiveFileId?: string | null;
}): Promise<string> {
  await ensureMaterialsSchema();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO user_materials (
      id, user_id, name, type, size_bytes, status, source, drive_file_id, drive_web_view_link, branch, chunk_count,
      managed_drive_file_id, managed_drive_processed_file_id, managed_drive_archive_file_id
    )
    VALUES (
      gen_random_uuid()::text, ${data.userId}, ${data.name}, ${data.type},
      ${data.sizeBytes ?? null}, 'processing', ${data.source},
      ${data.driveFileId ?? null}, ${data.driveWebViewLink ?? null},
      ${data.branch ?? "Genel"}, 0,
      ${data.managedDriveFileId ?? null},
      ${data.managedDriveProcessedFileId ?? null},
      ${data.managedDriveArchiveFileId ?? null}
    )
    RETURNING id
  `;
  return rows[0]!.id;
}

// ─── Materyal güncelle ────────────────────────────────────────────────────────
export async function updateMaterial(
  materialId: string,
  status: string,
  chunkCount: number,
  pageCount?: number,
  errorMessage?: string,
  processingStage?: string,
) {
  await ensureMaterialsSchema();
  await prisma.$executeRaw`
    UPDATE user_materials
    SET status = ${status}, chunk_count = ${chunkCount},
        page_count = ${pageCount ?? null},
        error_message = ${errorMessage ?? null},
        processing_stage = COALESCE(${processingStage ?? null}, processing_stage),
        updated_at = NOW()
    WHERE id = ${materialId}
  `;
}

export async function updateMaterialDriveArtifacts(
  materialId: string,
  data: {
    managedDriveFileId?: string | null;
    managedDriveProcessedFileId?: string | null;
    managedDriveArchiveFileId?: string | null;
    driveWebViewLink?: string | null;
  },
): Promise<void> {
  await ensureMaterialsSchema();
  await prisma.$executeRaw`
    UPDATE user_materials
    SET managed_drive_file_id = COALESCE(${data.managedDriveFileId ?? null}, managed_drive_file_id),
        managed_drive_processed_file_id = COALESCE(${data.managedDriveProcessedFileId ?? null}, managed_drive_processed_file_id),
        managed_drive_archive_file_id = COALESCE(${data.managedDriveArchiveFileId ?? null}, managed_drive_archive_file_id),
        drive_web_view_link = COALESCE(${data.driveWebViewLink ?? null}, drive_web_view_link),
        updated_at = NOW()
    WHERE id = ${materialId}
  `;
}

// ─── Vektör kayıt ─────────────────────────────────────────────────────────────
async function embedAndInsertChunks(
  userId: string,
  materialId: string,
  title: string,
  branch: string,
  chunks: string[],
): Promise<number> {
  const embedder = getEmbedder();
  const supabase = getSupabase();
  let inserted = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let result;
    try {
      result = await embedder.embedContent(chunk);
    } catch (error) {
      throw normalizeGeminiError(error);
    }
    const embedding = result.embedding.values;

    const { error } = await supabase.rpc("insert_user_document_chunk", {
      p_user_id: userId,
      p_material_id: materialId,
      p_title: title,
      p_branch: branch,
      p_content: chunk,
      p_embedding: embedding,
      p_metadata: { chunk_index: i, total_chunks: chunks.length },
    });

    if (error) throw new Error(`Embedding kayıt hatası: ${error.message}`);
    inserted++;
  }

  return inserted;
}

// ─── PDF İşleme ───────────────────────────────────────────────────────────────
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const pdfModule = (await import("pdf-parse")) as unknown as {
    default?: (b: Buffer) => Promise<{ text: string; numpages: number }>;
  };
  const parse = pdfModule.default ?? (pdfModule as unknown as (b: Buffer) => Promise<{ text: string; numpages: number }>);
  const data = await parse(buffer);
  return { text: data.text || "", pages: data.numpages || 0 };
}

// ─── DOCX İşleme ─────────────────────────────────────────────────────────────
async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")) as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

// ─── PPTX İşleme ─────────────────────────────────────────────────────────────
async function extractPptxText(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideTexts: string[] = [];

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });

  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async("text");
    // Extract text from <a:t> tags
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    const slideText = textMatches
      .map((m) => m.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(" ");
    if (slideText) slideTexts.push(`[Slayt ${slideFiles.indexOf(fileName) + 1}] ${slideText}`);
  }

  return slideTexts.join("\n\n");
}

// ─── TXT İşleme ──────────────────────────────────────────────────────────────
function extractTxtText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

// ─── Ana işleme fonksiyonu ───────────────────────────────────────────────────
export async function processMaterial(
  userId: string,
  materialId: string,
  name: string,
  type: string,
  branch: string,
  buffer: Buffer,
): Promise<IngestResult> {
  try {
    let text = "";
    let pageCount: number | undefined;

    const ext = type.toLowerCase();

    if (ext === "pdf") {
      const result = await extractPdfText(buffer);
      text = result.text;
      pageCount = result.pages;
    } else if (ext === "docx" || ext === "doc") {
      text = await extractDocxText(buffer);
    } else if (ext === "pptx" || ext === "ppt") {
      text = await extractPptxText(buffer);
    } else {
      text = extractTxtText(buffer);
    }

    if (!text.trim()) {
      await updateMaterial(materialId, "failed", 0, pageCount, "Dosyadan metin çıkarılamadı.");
      return { materialId, chunkCount: 0, extractedText: "" };
    }

    const chunks = splitTextIntoChunks(text, 1000, 150);
    const chunkCount = await embedAndInsertChunks(userId, materialId, name, branch, chunks);
    await updateMaterial(materialId, "ready", chunkCount, pageCount);

    return { materialId, chunkCount, pageCount, extractedText: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateMaterial(materialId, "failed", 0, undefined, msg);
    throw err;
  }
}

// ─── Materyal listesi ────────────────────────────────────────────────────────
export async function listUserMaterials(userId: string): Promise<UserMaterial[]> {
  await ensureMaterialsSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      id, user_id AS "userId", name, type, size_bytes AS "sizeBytes",
      status, source, drive_file_id AS "driveFileId",
      drive_web_view_link AS "driveWebViewLink",
      managed_drive_file_id AS "managedDriveFileId",
      managed_drive_processed_file_id AS "managedDriveProcessedFileId",
      managed_drive_archive_file_id AS "managedDriveArchiveFileId",
      branch,
      chunk_count AS "chunkCount", page_count AS "pageCount",
      slide_count AS "slideCount",
      processing_stage AS "processingStage",
      quality_score AS "qualityScore",
      extraction_confidence AS "extractionConfidence",
      ready_for_questions AS "readyForQuestions",
      ready_for_flashcards AS "readyForFlashcards",
      error_message AS "errorMessage", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM user_materials
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map((row) => ({
    ...row,
    managedDrivePath: getManagedUserDrivePlan(userId, "inbox").folderPath,
    managedProcessedPath: getManagedUserDrivePlan(userId, "processed").folderPath,
  }));
}

// ─── Materyal sil ────────────────────────────────────────────────────────────
export async function deleteMaterial(userId: string, materialId: string): Promise<void> {
  await ensureMaterialsSchema();
  // Chunks will be deleted by CASCADE
  await prisma.$executeRaw`
    DELETE FROM user_materials WHERE id = ${materialId} AND user_id = ${userId}
  `;
}

// ─── Materyal istatistikleri ─────────────────────────────────────────────────
export async function getMaterialStats(userId: string) {
  await ensureMaterialsSchema();
  const rows = await prisma.$queryRaw<{ total: bigint; chunks: bigint; branches: bigint }[]>`
    SELECT
      COUNT(*)::bigint AS total,
      COALESCE(SUM(chunk_count), 0)::bigint AS chunks,
      COUNT(DISTINCT branch)::bigint AS branches
    FROM user_materials
    WHERE user_id = ${userId} AND status = 'ready'
  `;
  return {
    total: Number(rows[0]?.total ?? 0),
    chunks: Number(rows[0]?.chunks ?? 0),
    branches: Number(rows[0]?.branches ?? 0),
  };
}

// ─── Belirli materialler için RAG ────────────────────────────────────────────
export async function getMaterialById(userId: string, materialId: string): Promise<UserMaterial | null> {
  await ensureMaterialsSchema();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, user_id AS "userId", name, type, status, branch, chunk_count AS "chunkCount",
           page_count AS "pageCount", slide_count AS "slideCount", source, drive_web_view_link AS "driveWebViewLink",
           managed_drive_file_id AS "managedDriveFileId",
           managed_drive_processed_file_id AS "managedDriveProcessedFileId",
           managed_drive_archive_file_id AS "managedDriveArchiveFileId",
           processing_stage AS "processingStage",
           quality_score AS "qualityScore",
           extraction_confidence AS "extractionConfidence",
           ready_for_questions AS "readyForQuestions",
           ready_for_flashcards AS "readyForFlashcards",
           created_at AS "createdAt"
    FROM user_materials WHERE id = ${materialId} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// ─── Dosya hash kontrolü (tekrar yükleme engeli) ─────────────────────────────
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function getManagedMaterialPaths(userId: string) {
  return {
    inbox: getManagedUserDrivePlan(userId, "inbox").folderPath,
    processed: getManagedUserDrivePlan(userId, "processed").folderPath,
    archive: getManagedUserDrivePlan(userId, "archive").folderPath,
  };
}

export async function addMaterialMark(input: {
  userId: string;
  materialId: string;
  note: string;
  color?: string;
  slideNo?: number | null;
}): Promise<MaterialMark> {
  await ensureMaterialsSchema();
  const note = input.note.trim();
  if (!note) throw new Error("Not metni boş olamaz.");

  const rows = await prisma.$queryRaw<MaterialMark[]>`
    INSERT INTO public.user_material_marks (
      user_id, material_id, slide_no, color, note, created_at, updated_at
    )
    VALUES (
      ${input.userId},
      ${input.materialId},
      ${input.slideNo ?? null},
      ${(input.color ?? "yellow").trim() || "yellow"},
      ${note},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      user_id AS "userId",
      material_id AS "materialId",
      slide_no AS "slideNo",
      color,
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return rows[0]!;
}

export async function listMaterialMarks(userId: string, materialId: string): Promise<MaterialMark[]> {
  await ensureMaterialsSchema();
  return prisma.$queryRaw<MaterialMark[]>`
    SELECT
      id,
      user_id AS "userId",
      material_id AS "materialId",
      slide_no AS "slideNo",
      color,
      note,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.user_material_marks
    WHERE user_id = ${userId}
      AND material_id = ${materialId}
    ORDER BY created_at DESC
  `;
}
