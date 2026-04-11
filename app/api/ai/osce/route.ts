import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndLogAiUsage, logAIUsage } from "@/lib/ai/check-limit";
import { createSystemLog } from "@/lib/system-log";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";
import { canAccessModule } from "@/lib/access/entitlements";
import {
  AI_LIMITS,
  sanitizeContextText,
  sanitizeHistory,
  sanitizeUserMessage,
} from "@/lib/ai/limits";
import { appendCentralSystemPrompt, createCentralAiRuntime } from "@/lib/ai/orchestrator";
import { withCentralAiRuntimeFailover } from "@/lib/ai/failover";
import { geminiErrorToResponsePayload, isGeminiErrorLike } from "@/lib/ai/google-errors";
import { rememberUserSignals } from "@/lib/ai/personalization";
import { getAiRefusalMessage } from "@/lib/ai/access";
import { maskGeminiEnvName } from "@/lib/ai/env";
import { ensureMaterialsSchema, ensureOsceSchema } from "@/lib/db/schema-guard";

export const maxDuration = 60;

/* ─── Types ─── */

export type OscePhase =
  | "ANAMNESIS"
  | "PHYSICAL_EXAM"
  | "INVESTIGATIONS"
  | "DIAGNOSIS"
  | "EVALUATION";

interface OsceCase {
  caseId: string;
  specialty: string;
  difficulty: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    vitals: { bp: string; hr: string; rr: string; temp: string; spo2: string };
  };
  chiefComplaint: string;
  hiddenDiagnosis: string;
  anamnesis: Record<string, string>;
  physicalExam: Record<string, string>;
  labs: Record<string, string>;
  criticalActions: string[];
  traps: string[];
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface ReferenceItem {
  chunkId: string;
  materialId: string;
}

interface SkillGap {
  competency: string;
  severity: "low" | "medium" | "high";
  evidence: string;
  recommendation: string;
}

interface OsceRequestBody {
  action: "generate_case" | "message" | "evaluate_quick" | "evaluate_deep";
  specialty?: string;
  difficulty?: string;
  phase?: OscePhase;
  message?: string;
  caseData?: OsceCase;
  history?: ConversationMessage[];
  selectedMaterialIds?: string[];
  useApprovedLibrary?: boolean;
  sessionId?: string;
}

/* ─── Helpers ─── */

function getPhaseSystemPrompt(phase: OscePhase, c: OsceCase): string {
  const vitals = `TA:${c.patient.vitals.bp} Nabız:${c.patient.vitals.hr} SS:${c.patient.vitals.rr} Ateş:${c.patient.vitals.temp} SpO2:${c.patient.vitals.spo2}`;
  const header = `Hasta: ${c.patient.name}, ${c.patient.age}y ${c.patient.gender}, ${c.patient.occupation}. Şikayet: ${c.chiefComplaint}. Vitaller: ${vitals}`;

  switch (phase) {
    case "ANAMNESIS":
      return `${header}\nAnamnez verileri (gizli, sadece sorulduğunda paylaş): ${JSON.stringify(c.anamnesis)}\n\nROLÜN: Gerçek bir HASTA gibi davran. Sadece sorulan soruya kısa ve doğal yanıt ver. Tıbbi terminoloji kullanma, hasta gibi konuş. Tek seferde tüm bilgileri dökme, adım adım yanıt ver.`;
    case "PHYSICAL_EXAM":
      return `${header}\nMuayene bulguları (gizli): ${JSON.stringify(c.physicalExam)}\n\nROLÜN: Muayene bulgularını yalnız istenen sistem için ver. Formatı: "Muayene bulgusu: ..." şeklinde olsun. İstenmemiş sistemi paylaşma.`;
    case "INVESTIGATIONS":
      return `${header}\nLab/görüntüleme sonuçları (gizli): ${JSON.stringify(c.labs)}\n\nROLÜN: Sadece istenen tetkik sonucunu kısa ve net olarak ver. Yorum ekleme, sadece sonuç bildir.`;
    case "DIAGNOSIS":
      return `${header}\nGerçek tanı: ${c.hiddenDiagnosis}\nKritik aksiyonlar: ${c.criticalActions.join(", ")}\nTuzaklar: ${c.traps.join(", ")}\n\nROLÜN: OSCE jüri üyesi. Öğrencinin sunduğu tanı ve planı dinle. Kısa sorularla derinleştir. Cevabı direkt verme.`;
    case "EVALUATION":
      return `Sen bir OSCE değerlendiricisisin. Gerçek tanı: ${c.hiddenDiagnosis}. Kritik aksiyonlar: ${c.criticalActions.join(", ")}. Tuzaklar: ${c.traps.join(", ")}.`;
  }
}

function tokenizeForMatch(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 18);
}

async function findGrounding(
  userId: string,
  materialIds: string[],
  query: string,
  topK = 3,
): Promise<{ references: ReferenceItem[]; context: string }> {
  if (!materialIds.length) return { references: [], context: "" };
  await ensureMaterialsSchema();

  const rows = await prisma.$queryRaw<{ chunkId: string; materialId: string; content: string }[]>`
    SELECT id::text as "chunkId", material_id as "materialId", content
    FROM public.user_document_chunks
    WHERE user_id = ${userId}
      AND material_id = ANY(${materialIds}::text[])
    ORDER BY created_at DESC
    LIMIT 160
  `;

  const tokens = tokenizeForMatch(query);
  const scored = rows
    .map((row) => {
      const content = String(row.content || "").toLowerCase();
      const score = tokens.reduce((acc, token) => (content.includes(token) ? acc + 1 : acc), 0);
      return { ...row, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const references: ReferenceItem[] = scored.map((row) => ({
    chunkId: row.chunkId,
    materialId: row.materialId,
  }));
  const context = scored
    .map((row, i) => `[REF ${i + 1} | chunk=${row.chunkId}] ${sanitizeContextText(row.content, 550)}`)
    .join("\n\n");

  return { references, context };
}

/**
 * Pull a random approved scenario from the admin pool.
 * Matches specialty (if provided) and difficulty (if provided).
 * If no match found, tries without difficulty filter.
 * If still no match, tries completely random from pool.
 */
async function getScenarioFromPool(
  specialty: string | undefined,
  difficulty: string | undefined,
): Promise<{ id: string; caseData: OsceCase } | null> {
  await ensureOsceSchema();

  // 1) Try exact match: specialty + difficulty
  if (specialty || difficulty) {
    const exactRows = await prisma.$queryRaw<{ id: string; casePayload: unknown }[]>`
      SELECT s.id, s.case_payload as "casePayload"
      FROM public.osce_scenarios s
      WHERE s.status = 'approved'
        AND (${specialty ?? null}::text IS NULL OR lower(s.specialty) = lower(${specialty ?? null}))
        AND (${difficulty ?? null}::text IS NULL OR lower(s.difficulty) = lower(${difficulty ?? null}))
      ORDER BY random()
      LIMIT 1
    `;

    if (exactRows[0]) {
      const caseData = exactRows[0].casePayload as OsceCase;
      if (caseData && typeof caseData === "object") {
        return { id: exactRows[0].id, caseData };
      }
    }
  }

  // 2) Fallback: match specialty only (any difficulty)
  if (specialty) {
    const specRows = await prisma.$queryRaw<{ id: string; casePayload: unknown }[]>`
      SELECT s.id, s.case_payload as "casePayload"
      FROM public.osce_scenarios s
      WHERE s.status = 'approved'
        AND lower(s.specialty) = lower(${specialty})
      ORDER BY random()
      LIMIT 1
    `;

    if (specRows[0]) {
      const caseData = specRows[0].casePayload as OsceCase;
      if (caseData && typeof caseData === "object") {
        return { id: specRows[0].id, caseData };
      }
    }
  }

  // 3) Last resort: any approved scenario from pool
  const anyRows = await prisma.$queryRaw<{ id: string; casePayload: unknown }[]>`
    SELECT s.id, s.case_payload as "casePayload"
    FROM public.osce_scenarios s
    WHERE s.status = 'approved'
    ORDER BY random()
    LIMIT 1
  `;

  if (anyRows[0]) {
    const caseData = anyRows[0].casePayload as OsceCase;
    if (caseData && typeof caseData === "object") {
      return { id: anyRows[0].id, caseData };
    }
  }

  return null;
}

function buildQuickSummary(history: ConversationMessage[]) {
  const userTurns = history.filter((h) => h.role === "user").length;
  const anamnesis = Math.min(25, 8 + userTurns * 2);
  const physicalExam = Math.min(25, 6 + Math.floor(userTurns * 1.5));
  const investigations = Math.min(20, 5 + userTurns);
  const diagnosis = Math.min(20, 6 + userTurns);
  const management = Math.min(10, 3 + Math.floor(userTurns / 2));
  const total = Math.min(100, anamnesis + physicalExam + investigations + diagnosis + management);

  const missingCompetencies: string[] = [];
  if (anamnesis < 15) missingCompetencies.push("Anamnez derinliği");
  if (physicalExam < 15) missingCompetencies.push("Fizik muayene sistematikliği");
  if (investigations < 12) missingCompetencies.push("Tetkik önceliklendirme");
  if (diagnosis < 12) missingCompetencies.push("Ayırıcı tanı");
  if (management < 6) missingCompetencies.push("Tedavi planı netliği");

  return {
    totalScore: total,
    subscores: { anamnesis, physicalExam, investigations, diagnosis, management },
    missingCompetencies,
    strengths: total >= 75 ? ["Klinik akış bütünlüğü", "Karar verme"] : ["Motivasyon", "Temel yaklaşım"],
  };
}

function extractSkillGapsFromDeep(report: string, quickMissing: string[]): SkillGap[] {
  const lines = report
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: SkillGap[] = [];
  for (const line of lines) {
    if (!/^[-*•]/.test(line)) continue;
    if (!/eksik|zayıf|geliştirilmesi|kritik/i.test(line)) continue;
    const clean = line.replace(/^[-*•]\s*/, "");
    parsed.push({
      competency: clean.slice(0, 60),
      severity: /kritik|acil|major/i.test(clean) ? "high" : /hafif|minor/i.test(clean) ? "low" : "medium",
      evidence: clean,
      recommendation: "Bu alan için hedefli vaka tekrarı ve kısa geri bildirim döngüsü önerilir.",
    });
    if (parsed.length >= 6) break;
  }

  if (parsed.length > 0) return parsed;
  return quickMissing.map((item) => ({
    competency: item,
    severity: "medium" as const,
    evidence: `Quick değerlendirme bu alanı eksik gösterdi: ${item}`,
    recommendation: `${item} için mini vaka pratikleri yapın.`,
  }));
}

/* ─── Main Handler ─── */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    if (!(await canAccessModule(user.id, "exams"))) {
      return NextResponse.json(
        { error: "Bu sınav modülü paketinizde yer almıyor." },
        { status: 403 },
      );
    }

    const limitResult = await checkAndLogAiUsage();
    if (!limitResult.canProceed) {
      return NextResponse.json(
        { error: getAiRefusalMessage(limitResult.reason), reason: limitResult.reason },
        { status: 403 },
      );
    }

    const body: OsceRequestBody = await req.json();
    const selectedMaterialIds = Array.isArray(body.selectedMaterialIds)
      ? body.selectedMaterialIds.filter((id): id is string => typeof id === "string").slice(0, 12)
      : [];

    /* ═══════════════════════════════════════════
       ACTION: generate_case
       Always pulls from admin-approved pool.
       ═══════════════════════════════════════════ */

    if (body.action === "generate_case") {
      const scenario = await getScenarioFromPool(body.specialty, body.difficulty);

      if (!scenario) {
        // Count total approved to give a helpful message
        const countRows = await prisma.$queryRaw<{ cnt: bigint }[]>`
          SELECT count(*) as cnt FROM public.osce_scenarios WHERE status = 'approved'
        `;
        const totalApproved = Number(countRows[0]?.cnt ?? 0);

        if (totalApproved === 0) {
          return NextResponse.json(
            {
              error: "OSCE havuzunda henüz onaylı istasyon bulunmuyor. Lütfen yöneticinizle iletişime geçin.",
              code: "POOL_EMPTY",
            },
            { status: 422 },
          );
        }

        return NextResponse.json(
          {
            error: `"${body.specialty || "Genel"}" alanında onaylı istasyon bulunamadı. Havuzda toplam ${totalApproved} onaylı istasyon var. Uzmanlık alanını değiştirmeyi veya "Rastgele" seçeneğini deneyin.`,
            code: "NO_MATCH",
          },
          { status: 422 },
        );
      }

      const caseData: OsceCase = {
        ...scenario.caseData,
        caseId: `osce_${Date.now()}`,
      };

      // If user requested a specific difficulty, tag it
      if (body.difficulty) caseData.difficulty = body.difficulty;

      return NextResponse.json({
        caseData,
        grounded: true,
        references: [
          { chunkId: `scenario:${scenario.id}`, materialId: "approved-library" },
        ] as ReferenceItem[],
        refusalReason: null,
        scenarioId: scenario.id,
        source: "approved-library",
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: message
       ═══════════════════════════════════════════ */

    if (body.action === "message") {
      const { phase, message, caseData, history = [] } = body;
      const safeMessage = sanitizeUserMessage(message, 1_200);
      if (!phase || !safeMessage || !caseData) {
        return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
      }

      const safeHistory = sanitizeHistory(history, 6, 900);

      // Build grounding context from case data (always use the case itself as context)
      let grounding: { references: ReferenceItem[]; context: string };

      if (selectedMaterialIds.length > 0) {
        grounding = await findGrounding(user.id, selectedMaterialIds, safeMessage, 3);
        // Merge with case data context
        const caseContext = sanitizeContextText(
          JSON.stringify({
            chiefComplaint: caseData.chiefComplaint,
            hiddenDiagnosis: caseData.hiddenDiagnosis,
            anamnesis: caseData.anamnesis,
            physicalExam: caseData.physicalExam,
            labs: caseData.labs,
            criticalActions: caseData.criticalActions,
            traps: caseData.traps,
          }),
          3200,
        );
        grounding.context = `${caseContext}\n\n${grounding.context}`;
        grounding.references = [
          { chunkId: `scenario:${caseData.caseId}`, materialId: "approved-library" },
          ...grounding.references,
        ];
      } else {
        grounding = {
          references: [{ chunkId: `scenario:${caseData.caseId}`, materialId: "approved-library" }],
          context: sanitizeContextText(
            JSON.stringify({
              chiefComplaint: caseData.chiefComplaint,
              hiddenDiagnosis: caseData.hiddenDiagnosis,
              anamnesis: caseData.anamnesis,
              physicalExam: caseData.physicalExam,
              labs: caseData.labs,
              criticalActions: caseData.criticalActions,
              traps: caseData.traps,
            }),
            3200,
          ),
        };
      }

      const aiRuntime = await createCentralAiRuntime({
        moduleName: "osce-message",
        requestedModel: "FAST",
        requestedMaxOutputTokens: 1200,
      });
      if (!aiRuntime.settings.globalEnabled) {
        return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
      }

      const systemPrompt = appendCentralSystemPrompt(
        `${sanitizeContextText(getPhaseSystemPrompt(phase, caseData), 2_800)}\n\n` +
        `Vaka verileri:\n${grounding.context}\n\n` +
        `Kural: Sadece yukarıdaki vaka verilerine göre yanıt ver. Vakadaki bilgiyi aşma.`,
        aiRuntime.settings,
      );

      const runtimeResult = await withCentralAiRuntimeFailover(
        {
          moduleName: "osce-message",
          requestedModel: "FAST",
          requestedMaxOutputTokens: 1200,
        },
        async (runtime) =>
          generateText({
            model: runtime.model,
            system: systemPrompt,
            messages: [
              ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: safeMessage },
            ],
            temperature: runtime.temperature,
            maxOutputTokens: runtime.maxOutputTokens,
          }),
      );

      const activeRuntime = runtimeResult.runtime;
      if (runtimeResult.retried) {
        await createSystemLog({
          level: "warn",
          category: "ai",
          message: "OSCE message key failover uygulandı",
          details: `module=osce-message | key=${maskGeminiEnvName(activeRuntime.keyName)}`,
          userId: user.id,
        }).catch(() => {});
      }

      const result = runtimeResult.value;
      const inputTokens = result.usage?.inputTokens ?? 0;
      const outputTokens = result.usage?.outputTokens ?? 0;

      logAIUsage(
        user.id,
        activeRuntime.modelId,
        inputTokens + outputTokens,
        "osce-message",
        caseData.caseId,
      ).catch(() => {});
      void recordAiUsageTelemetry({
        userId: user.id,
        route: "/api/ai/osce",
        model: activeRuntime.modelId,
        keyName: activeRuntime.keyName,
        inputTokens,
        outputTokens,
        module: "osce-message",
        source: "generateText",
      }).catch(() => {});

      const finalText = sanitizeContextText(result.text, 2_200);
      if (!finalText.trim()) {
        return NextResponse.json({
          text: "Yanıt üretilemedi. Lütfen sorunuzu tekrar deneyin.",
          grounded: true,
          references: grounding.references,
          refusalReason: null,
        });
      }

      void rememberUserSignals({
        userId: user.id,
        moduleName: "osce-message",
        userMessage: safeMessage,
        assistantText: finalText,
      }).catch(() => {});

      return NextResponse.json({
        text: finalText,
        grounded: true,
        references: grounding.references,
        refusalReason: null,
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: evaluate_quick
       ═══════════════════════════════════════════ */

    if (body.action === "evaluate_quick") {
      const { caseData, history = [] } = body;
      if (!caseData) {
        return NextResponse.json({ error: "Vaka verisi eksik." }, { status: 400 });
      }

      await ensureOsceSchema();
      const quick = buildQuickSummary(history);

      const rows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO public.osce_sessions (
          user_id, case_id, specialty, difficulty, quick_summary, scores, model
        )
        VALUES (
          ${user.id}, ${caseData.caseId}, ${caseData.specialty}, ${caseData.difficulty},
          ${quick as unknown as object}::jsonb,
          ${quick.subscores as unknown as object}::jsonb,
          'quick-eval'
        )
        RETURNING id
      `;

      return NextResponse.json({
        sessionId: rows[0]?.id ?? null,
        quickSummary: quick,
      });
    }

    /* ═══════════════════════════════════════════
       ACTION: evaluate_deep
       ═══════════════════════════════════════════ */

    if (body.action === "evaluate_deep") {
      const { caseData, history = [], sessionId } = body;
      if (!caseData) {
        return NextResponse.json({ error: "Vaka verisi eksik." }, { status: 400 });
      }

      const quickSummary = buildQuickSummary(history);
      const aiRuntime = await createCentralAiRuntime({
        moduleName: "osce-evaluate",
        requestedModel: "FAST",
        requestedMaxOutputTokens: 2200,
      });
      if (!aiRuntime.settings.globalEnabled) {
        return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
      }

      const conversationSummary = history
        .slice(-16)
        .map((m) => `${m.role === "user" ? "ÖĞRENCİ" : "SİSTEM"}: ${sanitizeContextText(m.content, 800)}`)
        .join("\n---\n");

      const systemPrompt = appendCentralSystemPrompt(
        `${sanitizeContextText(getPhaseSystemPrompt("EVALUATION", caseData), 3000)}\n` +
        `Çıktı: kısa başlıklar, net puanlama ve aksiyon planı.`,
        aiRuntime.settings,
      );

      const runtimeResult = await withCentralAiRuntimeFailover(
        {
          moduleName: "osce-evaluate",
          requestedModel: "FAST",
          requestedMaxOutputTokens: 2200,
        },
        async (runtime) =>
          generateText({
            model: runtime.model,
            system: systemPrompt,
            prompt: sanitizeContextText(
              `Hızlı özet: ${JSON.stringify(quickSummary)}\n\nSınav konuşması:\n${conversationSummary}\n\nDetaylı OSCE değerlendirme raporu yaz.`,
              AI_LIMITS.MAX_SYSTEM_CONTEXT_CHARS,
            ),
            temperature: runtime.temperature,
            maxOutputTokens: runtime.maxOutputTokens,
          }),
      );

      const activeRuntime = runtimeResult.runtime;
      const result = runtimeResult.value;
      const report = sanitizeContextText(result.text, 12000);
      const skillGaps = extractSkillGapsFromDeep(report, quickSummary.missingCompetencies);

      await ensureOsceSchema();
      let activeSessionId = sessionId ?? null;
      if (!activeSessionId) {
        const created = await prisma.$queryRaw<{ id: string }[]>`
          INSERT INTO public.osce_sessions (
            user_id, case_id, specialty, difficulty, quick_summary, scores, deep_report, model, finalized_at
          )
          VALUES (
            ${user.id}, ${caseData.caseId}, ${caseData.specialty}, ${caseData.difficulty},
            ${quickSummary as unknown as object}::jsonb,
            ${quickSummary.subscores as unknown as object}::jsonb,
            ${report}, ${activeRuntime.modelId}, now()
          )
          RETURNING id
        `;
        activeSessionId = created[0]?.id ?? null;
      } else {
        await prisma.$executeRaw`
          UPDATE public.osce_sessions
          SET deep_report = ${report},
              scores = ${quickSummary.subscores as unknown as object}::jsonb,
              quick_summary = ${quickSummary as unknown as object}::jsonb,
              model = ${activeRuntime.modelId},
              finalized_at = now()
          WHERE id = ${activeSessionId}
        `;
      }

      if (activeSessionId) {
        await prisma.$executeRaw`DELETE FROM public.osce_skill_gaps WHERE session_id = ${activeSessionId}`;
        for (const gap of skillGaps) {
          await prisma.$executeRaw`
            INSERT INTO public.osce_skill_gaps (
              session_id, user_id, competency, severity, evidence, recommendation
            )
            VALUES (
              ${activeSessionId}, ${user.id}, ${gap.competency}, ${gap.severity}, ${gap.evidence}, ${gap.recommendation}
            )
          `;
        }
      }

      const inputTokens = result.usage?.inputTokens ?? 0;
      const outputTokens = result.usage?.outputTokens ?? 0;
      Promise.allSettled([
        logAIUsage(
          user.id,
          activeRuntime.modelId,
          inputTokens + outputTokens,
          "osce-evaluate",
          caseData.caseId,
        ),
        recordAiUsageTelemetry({
          userId: user.id,
          route: "/api/ai/osce",
          model: activeRuntime.modelId,
          keyName: activeRuntime.keyName,
          inputTokens,
          outputTokens,
          module: "osce-evaluate",
          source: "generateText",
        }),
      ]).catch(() => {});

      return NextResponse.json({
        sessionId: activeSessionId,
        report,
        quickSummary,
        skillGaps,
      });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    console.error("OSCE API Hatası:", error);
    if (isGeminiErrorLike(error)) {
      const geminiError = geminiErrorToResponsePayload(error);
      await createSystemLog({
        level: "error",
        category: "ai",
        message: `Gemini hatası (${geminiError.reason})`,
        details: `module=osce | reason=${geminiError.reason} | message=${geminiError.message}`,
      }).catch(() => {});
      return NextResponse.json(
        { error: geminiError.message, reason: geminiError.reason },
        { status: geminiError.status },
      );
    }
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: `Sistem hatası: ${message}` }, { status: 500 });
  }
}
