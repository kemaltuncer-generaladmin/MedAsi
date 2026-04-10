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
  branch: string;
  chunkCount: number;
  pageCount: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngestResult {
  materialId: string;
  chunkCount: number;
  pageCount?: number;
}

// ─── Supabase client ─────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getEmbedder() {
  return new GoogleGenerativeAI(requireGeminiApiKey()).getGenerativeModel({
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
}): Promise<string> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO user_materials (id, user_id, name, type, size_bytes, status, source, drive_file_id, drive_web_view_link, branch, chunk_count)
    VALUES (
      gen_random_uuid()::text, ${data.userId}, ${data.name}, ${data.type},
      ${data.sizeBytes ?? null}, 'processing', ${data.source},
      ${data.driveFileId ?? null}, ${data.driveWebViewLink ?? null},
      ${data.branch ?? "Genel"}, 0
    )
    RETURNING id
  `;
  return rows[0]!.id;
}

// ─── Materyal güncelle ────────────────────────────────────────────────────────
async function updateMaterial(
  materialId: string,
  status: string,
  chunkCount: number,
  pageCount?: number,
  errorMessage?: string,
) {
  await prisma.$executeRaw`
    UPDATE user_materials
    SET status = ${status}, chunk_count = ${chunkCount},
        page_count = ${pageCount ?? null},
        error_message = ${errorMessage ?? null},
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
    const result = await embedder.embedContent(chunk);
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
      return { materialId, chunkCount: 0 };
    }

    const chunks = splitTextIntoChunks(text, 1000, 150);
    const chunkCount = await embedAndInsertChunks(userId, materialId, name, branch, chunks);
    await updateMaterial(materialId, "ready", chunkCount, pageCount);

    return { materialId, chunkCount, pageCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateMaterial(materialId, "failed", 0, undefined, msg);
    throw err;
  }
}

// ─── Materyal listesi ────────────────────────────────────────────────────────
export async function listUserMaterials(userId: string): Promise<UserMaterial[]> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      id, user_id AS "userId", name, type, size_bytes AS "sizeBytes",
      status, source, drive_file_id AS "driveFileId",
      drive_web_view_link AS "driveWebViewLink", branch,
      chunk_count AS "chunkCount", page_count AS "pageCount",
      error_message AS "errorMessage", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM user_materials
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows;
}

// ─── Materyal sil ────────────────────────────────────────────────────────────
export async function deleteMaterial(userId: string, materialId: string): Promise<void> {
  // Chunks will be deleted by CASCADE
  await prisma.$executeRaw`
    DELETE FROM user_materials WHERE id = ${materialId} AND user_id = ${userId}
  `;
}

// ─── Materyal istatistikleri ─────────────────────────────────────────────────
export async function getMaterialStats(userId: string) {
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
  const rows = await prisma.$queryRaw<any[]>`
    SELECT id, user_id AS "userId", name, type, status, branch, chunk_count AS "chunkCount",
           page_count AS "pageCount", source, created_at AS "createdAt"
    FROM user_materials WHERE id = ${materialId} AND user_id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

// ─── Dosya hash kontrolü (tekrar yükleme engeli) ─────────────────────────────
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
