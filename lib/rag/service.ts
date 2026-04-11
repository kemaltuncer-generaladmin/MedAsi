import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getResolvedGeminiConfig } from "@/lib/ai/env";
import { shouldRetryWithAlternateGeminiKey } from "@/lib/ai/failover";
import { normalizeGeminiError } from "@/lib/ai/google-errors";

type SourceRow = {
  sourceKey: string;
  title: string;
  branch: string;
  fileName: string | null;
  sourcePath: string | null;
  fileHash: string | null;
  chunkCount: bigint | number;
  createdAt: Date;
};

type IngestTextInput = {
  title: string;
  branch?: string;
  fullText: string;
  metadata?: Record<string, unknown>;
};

type IngestPdfInput = {
  filePath: string;
  title?: string;
  branch?: string;
};

const EMBEDDING_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.RAG_EMBED_CONCURRENCY ?? "3", 10) || 3,
);

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} eksik.`);
  }
  return value;
}

function createRagSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase ayarları eksik.");
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getEmbeddingModel() {
  const primary = getResolvedGeminiConfig("embeddings", { keyPreference: "server-first" });
  if (!primary.apiKey) {
    throw new Error("Gemini API key eksik. Beklenen anahtarlar: GEMINI_SERVER_API_KEY / GEMINI_KEY_EMBEDDINGS.");
  }
  const genAI = new GoogleGenerativeAI(primary.apiKey);
  return genAI.getGenerativeModel({ model: "text-embedding-004" });
}

function normalizeWhitespace(input: string) {
  return input.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

const DEFAULT_WATCH_FOLDER = path.join(
  /* turbopackIgnore: true */ os.homedir(),
  "Desktop",
  "egit",
);

export function getDefaultWatchFolder() {
  return process.env.RAG_WATCH_FOLDER || DEFAULT_WATCH_FOLDER;
}

export function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 150) {
  const cleanText = normalizeWhitespace(text);
  if (!cleanText) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end).trim());
    if (end >= cleanText.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

async function loadPdfParser() {
  const pdfParseModule = (await import("pdf-parse")) as unknown as {
    default?: (buffer: Buffer) => Promise<{ text: string }>;
  };
  return (pdfParseModule.default ??
    (pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string }>));
}

async function sourceExistsByHash(fileHash: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    select exists(
      select 1
      from public.document_chunks
      where metadata->>'file_hash' = ${fileHash}
    ) as "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function deleteExistingByPathOrHash(sourcePath: string, fileHash: string) {
  await prisma.$executeRaw`
    delete from public.document_chunks
    where metadata->>'source_path' = ${sourcePath}
       or metadata->>'file_hash' = ${fileHash}
  `;
}

export async function ingestTextDocument({
  title,
  branch = "Genel",
  fullText,
  metadata = {},
}: IngestTextInput) {
  const chunks = splitTextIntoChunks(fullText);

  if (chunks.length === 0) {
    return { insertedChunks: 0, skipped: true, reason: "empty_text" as const };
  }

  const supabase = createRagSupabaseClient();
  const model = getEmbeddingModel();
  let fallbackModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

  await mapWithConcurrency(chunks, EMBEDDING_CONCURRENCY, async (chunk, index) => {
    let result;
    try {
      result = await model.embedContent(chunk);
    } catch (error) {
      if (!shouldRetryWithAlternateGeminiKey(error)) {
        throw normalizeGeminiError(error);
      }
      if (!fallbackModel) {
        const fallback = getResolvedGeminiConfig("embeddings", { keyPreference: "module-first" });
        if (!fallback.apiKey) throw normalizeGeminiError(error);
        fallbackModel = new GoogleGenerativeAI(fallback.apiKey).getGenerativeModel({
          model: "text-embedding-004",
        });
      }
      try {
        result = await fallbackModel.embedContent(chunk);
      } catch {
        throw normalizeGeminiError(error);
      }
    }
    const embedding = result.embedding.values;

    const { error } = await supabase.rpc("insert_document_chunk", {
      p_title: title,
      p_branch: branch,
      p_content: chunk,
      p_embedding: embedding,
      p_metadata: {
        ...metadata,
        chunk_index: index,
        total_chunks: chunks.length,
      },
    });

    if (error) {
      throw new Error(`Supabase kayıt hatası: ${error.message}`);
    }
  });

  return { insertedChunks: chunks.length, skipped: false };
}

export async function ingestPdfFile({
  filePath,
  title,
  branch = "Genel",
}: IngestPdfInput) {
  const absolutePath = path.resolve(/* turbopackIgnore: true */ filePath);
  const [stats, buffer] = await Promise.all([
    fs.promises.stat(/* turbopackIgnore: true */ absolutePath),
    fs.promises.readFile(/* turbopackIgnore: true */ absolutePath),
  ]);
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileName = path.basename(/* turbopackIgnore: true */ absolutePath);
  const documentTitle = title || fileName.replace(/\.pdf$/i, "");

  if (await sourceExistsByHash(fileHash)) {
    return {
      title: documentTitle,
      branch,
      fileName,
      fileHash,
      insertedChunks: 0,
      skipped: true,
      reason: "already_ingested" as const,
    };
  }

  const parsePdf = await loadPdfParser();
  const data = await parsePdf(buffer);

  await deleteExistingByPathOrHash(absolutePath, fileHash);

  const result = await ingestTextDocument({
    title: documentTitle,
    branch,
    fullText: data.text || "",
    metadata: {
      file_hash: fileHash,
      file_name: fileName,
      source_path: absolutePath,
      file_size: stats.size,
      last_modified_at: stats.mtime.toISOString(),
    },
  });

  return {
    title: documentTitle,
    branch,
    fileName,
    fileHash,
    insertedChunks: result.insertedChunks,
    skipped: result.skipped,
  };
}

export async function scanWatchFolder(branch = "Genel") {
  const watchFolder = getDefaultWatchFolder();

  try {
    await fs.promises.access(/* turbopackIgnore: true */ watchFolder);
  } catch {
    throw new Error(`İzlenen klasör bulunamadı: ${watchFolder}`);
  }

  const files = (await fs.promises.readdir(/* turbopackIgnore: true */ watchFolder))
    .filter((file) => file.toLowerCase().endsWith(".pdf"))
    .sort((a, b) => a.localeCompare(b, "tr"));

  const results = [];
  for (const file of files) {
    const filePath = path.join(/* turbopackIgnore: true */ watchFolder, file);
    const result = await ingestPdfFile({ filePath, branch });
    results.push(result);
  }

  return {
    watchFolder,
    totalFiles: files.length,
    processed: results.filter((item) => !item.skipped).length,
    skipped: results.filter((item) => item.skipped).length,
    results,
  };
}

export async function getRagStats() {
  const [totals] = await prisma.$queryRaw<
    Array<{ totalChunks: bigint | number; totalSources: bigint | number }>
  >`
    select
      count(*)::bigint as "totalChunks",
      count(
        distinct coalesce(metadata->>'file_hash', title || '|' || branch)
      )::bigint as "totalSources"
    from public.document_chunks
  `;

  return {
    totalChunks: Number(totals?.totalChunks ?? 0),
    totalSources: Number(totals?.totalSources ?? 0),
    watchFolder: getDefaultWatchFolder(),
  };
}

export async function listRagSources() {
  const rows = await prisma.$queryRaw<SourceRow[]>`
    select
      coalesce(metadata->>'file_hash', title || '|' || branch) as "sourceKey",
      title,
      branch,
      max(metadata->>'file_name') as "fileName",
      max(metadata->>'source_path') as "sourcePath",
      max(metadata->>'file_hash') as "fileHash",
      count(*)::bigint as "chunkCount",
      max(created_at) as "createdAt"
    from public.document_chunks
    group by coalesce(metadata->>'file_hash', title || '|' || branch), title, branch
    order by max(created_at) desc
  `;

  return rows.map((row) => ({
    sourceKey: row.sourceKey,
    title: row.title,
    branch: row.branch,
    fileName: row.fileName,
    sourcePath: row.sourcePath,
    fileHash: row.fileHash,
    chunkCount: Number(row.chunkCount),
    createdAt: row.createdAt,
  }));
}

export async function deleteRagSource(sourceKey: string) {
  const deleted = await prisma.$executeRaw`
    delete from public.document_chunks
    where coalesce(metadata->>'file_hash', title || '|' || branch) = ${sourceKey}
  `;

  return { deletedRows: Number(deleted) };
}
