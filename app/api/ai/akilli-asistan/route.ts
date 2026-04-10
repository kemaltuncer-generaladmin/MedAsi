import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndLogAiUsage, logAIUsage } from "@/lib/ai/check-limit";
import {
  AI_LIMITS,
  sanitizeContextText,
  sanitizeHistory,
  sanitizeUserMessage,
} from "@/lib/ai/limits";
import { appendCentralSystemPrompt, createCentralAiRuntime } from "@/lib/ai/orchestrator";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = await checkAndLogAiUsage();
    if (!limitResult.canProceed) {
      return NextResponse.json(
        { error: "AI kullanım limitiniz doldu veya aktif paketiniz yok." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const message = sanitizeUserMessage(body.message);
    const aiRuntime = await createCentralAiRuntime({
      moduleName: "akilli-asistan",
      requestedModel: "EFFICIENT",
      requestedMaxOutputTokens: 512,
    });
    if (!aiRuntime.settings.globalEnabled) {
      return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
    }
    const history = sanitizeHistory(
      body.history,
      aiRuntime.settings.historyItemsLimit,
      aiRuntime.settings.historyItemChars,
    );
    const materialIdsRaw = Array.isArray(body.materialIds) ? body.materialIds : [];
    const materialIds: string[] = Array.isArray(materialIdsRaw)
      ? materialIdsRaw.filter((id: unknown): id is string => typeof id === "string").slice(0, 12)
      : [];

    if (!message) {
      return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    }

    // RAG: seçili materyal chunk'larını çek
    let ragContext = "";
    if (materialIds.length > 0) {
      // Kullanıcıya ait ve seçili materiallerin chunk'larını çek
      const chunks = await prisma.$queryRaw<{ content: string }[]>`
        SELECT content
        FROM user_document_chunks
        WHERE material_id = ANY(${materialIds}::text[])
          AND user_id = ${user.id}
        ORDER BY RANDOM()
        LIMIT 8
      `;

      if (chunks.length > 0) {
        const joined = chunks.map((c) => c.content).join("\n\n---\n\n");
        ragContext = sanitizeContextText(
          `Kullanıcının seçtiği materyaller:\n\n${joined}\n\n`,
          Math.min(AI_LIMITS.MAX_RAG_CONTEXT_CHARS, aiRuntime.settings.ragContextChars),
        );
      }
    }

    const systemPrompt = appendCentralSystemPrompt(
      sanitizeContextText(`Sen MEDASI platformunun Akıllı Asistanısın. Tıp öğrencilerine kendi ders notları ve materyalleri üzerinden yardımcı oluyorsun.
${ragContext ? ragContext + "Yukarıdaki materyallere dayanarak kullanıcının sorusunu yanıtla. Materyallerde bilgi yoksa genel tıp bilginle yanıtla." : "Kullanıcının sorularını genel tıp bilginle yanıtla."}
Türkçe yanıt ver. Açık, kısa ve öğrenci dostu ol.`),
      aiRuntime.settings,
    );

    // Önceki konuşma bağlamını oluştur
    const conversationContext = history.length > 0
      ? history
          .map((m) => `${m.role === "user" ? "Kullanıcı" : "Asistan"}: ${m.content}`)
          .join("\n")
      : "";

    const fullMessage = conversationContext
      ? `${conversationContext}\nKullanıcı: ${message}`
      : message;

    const { text, usage } = await generateText({
      model: aiRuntime.model,
      system: systemPrompt,
      prompt: fullMessage,
      temperature: aiRuntime.temperature,
      maxOutputTokens: aiRuntime.maxOutputTokens,
    });

    // Token logla
    const inputTokens = (usage as { inputTokens?: number } | undefined)?.inputTokens ?? 0;
    const outputTokens = (usage as { outputTokens?: number } | undefined)?.outputTokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    await logAIUsage(user.id, aiRuntime.modelId, totalTokens, "akilli-asistan");
    await recordAiUsageTelemetry({
      userId: user.id,
      route: "/api/ai/akilli-asistan",
      model: aiRuntime.modelId,
      inputTokens,
      outputTokens,
      module: "akilli-asistan",
      source: "generateText",
      trackOrg: limitResult.isOrgMember,
    });

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[akilli-asistan] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sunucu hatası" },
      { status: 500 },
    );
  }
}
