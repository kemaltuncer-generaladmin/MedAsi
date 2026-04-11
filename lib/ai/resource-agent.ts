/**
 * RAG Kaynak Ajanı
 * ─────────────────────────────────────────────
 * Kullanıcının sorusuna en ilgili belge parçalarını getirir.
 * Öncelik sırası:
 *   1. Kullanıcının kendi yüklediği materyaller
 *   2. Genel kütüphane (admin tarafından eklenen)
 *
 * Tüm AI modülleri bu fonksiyonu kullanır.
 */

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getResolvedGeminiConfig } from "@/lib/ai/env";
import { normalizeGeminiError } from "@/lib/ai/google-errors";
import { shouldRetryWithAlternateGeminiKey } from "@/lib/ai/failover";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase ayarları eksik.");
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface RagDocument {
  id: string;
  title: string;
  branch: string;
  content: string;
  materialId: string | null;
  sourceType: "user" | "library";
  similarity: number;
}

// ─── Embedding oluştur ────────────────────────────────────────────────────────
export async function createEmbedding(text: string): Promise<number[]> {
  const run = async (keyPreference: "server-first" | "module-first") => {
    const resolved = getResolvedGeminiConfig("embeddings", { keyPreference });
    if (!resolved.apiKey) throw new Error("GEMINI_KEY_EMBEDDINGS eksik.");
    const model = new GoogleGenerativeAI(resolved.apiKey).getGenerativeModel({
      model: "text-embedding-004",
    });
    const result = await model.embedContent(text.slice(0, 2000));
    return result.embedding.values;
  };

  try {
    return await run("server-first");
  } catch (error) {
    if (!shouldRetryWithAlternateGeminiKey(error)) {
      throw normalizeGeminiError(error);
    }
    try {
      return await run("module-first");
    } catch {
      throw normalizeGeminiError(error);
    }
  }
}

// ─── Hibrit RAG: kullanıcı materyalleri + global kütüphane ───────────────────
export async function getResourceReport(
  query: string,
  userId?: string,
): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const embedding = await createEmbedding(query);

    let documents: RagDocument[] = [];

    if (userId) {
      // Hibrit: kullanıcı materyalleri önce, kütüphane sonra
      const { data, error } = await supabase.rpc("match_documents_hybrid", {
        query_embedding: embedding,
        p_user_id: userId,
        match_threshold: 0.5,
        match_count: 6,
        global_count: 3,
      });

      if (!error && data && data.length > 0) {
        documents = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          branch: d.branch,
          content: d.content,
          materialId: d.material_id,
          sourceType: d.source_type,
          similarity: Number(d.similarity ?? 0),
        }));
      }
    } else {
      // Sadece global kütüphane
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.55,
        match_count: 4,
      });

      if (!error && data && data.length > 0) {
        documents = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          branch: d.branch,
          content: d.content,
          materialId: null,
          sourceType: "library" as const,
          similarity: Number(d.similarity ?? 0),
        }));
      }
    }

    if (documents.length === 0) return "";

    // Kullanıcı materyallerini öne çıkar
    const userDocs = documents.filter((d) => d.sourceType === "user");
    const libDocs = documents.filter((d) => d.sourceType === "library");
    const sorted = [...userDocs, ...libDocs];

    const report = sorted
      .map((doc, i) => {
        const src = doc.sourceType === "user" ? "👤 Materyalin" : "📚 Kütüphane";
        return `[REF ${i + 1} | ${src} | ${doc.branch} | sim=${doc.similarity.toFixed(2)}] ${doc.title}: ${doc.content.slice(0, 900)}`;
      })
      .join("\n\n");

    const hasUserMats = userDocs.length > 0;
    const header = hasUserMats
      ? `\n--- KAYNAK RAPORU (${userDocs.length} kişisel + ${libDocs.length} kütüphane) ---\n`
      : "\n--- KÜTÜPHANE KAYNAK RAPORU ---\n";

    return `${header}${report}\n----------------------------\n`;
  } catch (err) {
    console.error("RAG Hatası:", err);
    return "";
  }
}

// ─── Sadece kullanıcı materyallerinden ara ────────────────────────────────────
export async function getUserMaterialReport(
  query: string,
  userId: string,
  materialIds?: string[],
): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const embedding = await createEmbedding(query);

    const { data, error } = await supabase.rpc("match_user_documents", {
      p_user_id: userId,
      query_embedding: embedding,
      match_threshold: 0.45,
      match_count: 8,
    });

    if (error || !data || data.length === 0) return "";

    let docs: any[] = data;

    // Belirli materyallerle filtrele
    if (materialIds && materialIds.length > 0) {
      docs = docs.filter((d: any) => materialIds.includes(d.material_id));
    }

    if (docs.length === 0) return "";

    const report = docs
      .map((doc: any, i: number) =>
        `[REF ${i + 1} | ${doc.branch} | sim=${Number(doc.similarity ?? 0).toFixed(2)}] ${doc.title}: ${doc.content.slice(0, 1000)}`,
      )
      .join("\n\n");

    return `\n--- KİŞİSEL MATERYAL RAPORU (${docs.length} kaynak) ---\n${report}\n----------------------------\n`;
  } catch (err) {
    console.error("User RAG Hatası:", err);
    return "";
  }
}
