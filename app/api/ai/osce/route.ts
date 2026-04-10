import { NextRequest, NextResponse } from "next/server";
import { streamText, generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { logAIUsage } from "@/lib/ai/check-limit";
import { createSystemLog } from "@/lib/system-log";
import { getUserMaterialReport } from "@/lib/ai/resource-agent";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";
import {
  AI_LIMITS,
  sanitizeContextText,
  sanitizeHistory,
  sanitizeUserMessage,
} from "@/lib/ai/limits";
import { appendCentralSystemPrompt, createCentralAiRuntime } from "@/lib/ai/orchestrator";

// Next.js route timeout (saniye) — Gemini yanıtları için yeterli süre
export const maxDuration = 60;

export type OscePhase =
  | "ANAMNESIS"
  | "PHYSICAL_EXAM"
  | "INVESTIGATIONS"
  | "DIAGNOSIS"
  | "EVALUATION";

// ─── Vaka üreteci sistem promptu ─────────────────────────────────────────────
const CASE_GENERATOR_PROMPT = `OSCE vaka üreticisisin. SADECE JSON döndür.
{"specialty":str,"difficulty":"kolay"|"orta"|"zor","patient":{"name":str,"age":int,"gender":"Erkek"|"Kadın","occupation":str,"vitals":{"bp":str,"hr":str,"rr":str,"temp":str,"spo2":str}},"chiefComplaint":str,"hiddenDiagnosis":str,"anamnesis":{"onset":str,"duration":str,"character":str,"radiation":str,"aggravating":str,"relieving":str,"associated":str,"pmh":str,"fh":str,"meds":str,"allergies":str,"social":str},"physicalExam":{"general":str,"cvs":str,"resp":str,"abdomen":str,"neuro":str,"skin":str,"specific":str},"labs":{"CBC":str,"BMP":str,"LFT":str,"troponin":str,"CRP":str,"lipase":str,"ECG":str,"CXR":str,"USG":str,"CT":str,"UA":str,"ABG":str},"criticalActions":[str],"traps":[str]}`;

// ─── Aşama sistem promptları ─────────────────────────────────────────────────
function getPhaseSystemPrompt(phase: OscePhase, c: OsceCase): string {
  const vitals = `TA:${c.patient.vitals.bp} Nabız:${c.patient.vitals.hr} SS:${c.patient.vitals.rr} Ateş:${c.patient.vitals.temp} SpO2:${c.patient.vitals.spo2}`;
  const header = `Hasta: ${c.patient.name}, ${c.patient.age}y ${c.patient.gender}, ${c.patient.occupation}. Şikayet: ${c.chiefComplaint}. Vitaller: ${vitals}`;

  switch (phase) {
    case "ANAMNESIS":
      return `${header}
Anamnez verileri (gizli): ${JSON.stringify(c.anamnesis)}

ROLÜN: Gerçek bir HASTA gibi davran.
KURAL 1: Sorulan soruya SADECE o sorunun cevabını ver. Ekstra bilgi verme.
KURAL 2: Asla "ayrıca şunu da söyleyeyim" yapma.
KURAL 3: Cevaplar doğal konuşma dilinde, 1-3 cümle.
KURAL 4: Muğlak sorularda (örn "nasılsınız") öğrenciden daha net soru iste.
KURAL 5: Hasta rolünden kesinlikle çıkma.`;

    case "PHYSICAL_EXAM":
      return `${header}
Muayene bulguları (gizli): ${JSON.stringify(c.physicalExam)}

ROLÜN: Muayene bulgularını sunan asistan.
KURAL 1: Öğrenci hangi sistemi muayene etmek istediğini söylediğinde SADECE o sistem bulgusunu ver.
KURAL 2: İstenmemiş bulguları söyleme.
KURAL 3: Bulgular kısa, klinik formatta olsun (örn: "Mezokard odağında 2/6 sistolik üfürüm mevcut").`;

    case "INVESTIGATIONS":
      return `${header}
Lab/görüntüleme sonuçları (gizli): ${JSON.stringify(c.labs)}

ROLÜN: Laboratuvar/radyoloji asistanı.
KURAL 1: Öğrenci hangi tetkiki istediğini söylediğinde SADECE o tetkikin sonucunu ver.
KURAL 2: İstenmeyen tetkik sonuçlarını paylaşma.
KURAL 3: Sonuçlar gerçekçi rapor formatında olsun.
KURAL 4: Tetkik verisi yoksa: "Bu tetkikin sonucu mevcut değil, ancak sipariş verebilirsiniz."`;

    case "DIAGNOSIS":
      return `${header}
Gerçek tanı: ${c.hiddenDiagnosis}
Kritik aksiyonlar: ${c.criticalActions.join(", ")}
Tuzaklar: ${c.traps.join(", ")}

ROLÜN: OSCE jüri üyesi.
Öğrenci tanısını sunduğunda:
1. Ayırıcı tanısını 1-2 soruyla sorgula.
2. Tedavi planını sor.
3. Tanı doğruysa tebrik et, eksik varsa nazikçe yönlendir.`;

    case "EVALUATION":
      return `Sen bir OSCE değerlendiricisisin. Aşağıdaki kriterlere göre kapsamlı rapor hazırla:
Gerçek tanı: ${c.hiddenDiagnosis}
Kritik aksiyonlar: ${c.criticalActions.join(", ")}
Tuzaklar: ${c.traps.join(", ")}

Rapor başlıkları:
## GENEL SKOR: XX/100
## 1. ANAMNEZ (0-25 puan)
## 2. FİZİK MUAYENE (0-25 puan)
## 3. TEKİKLER (0-20 puan)
## 4. TANI (0-20 puan)
## 5. YÖNETİM (0-10 puan)
## 6. KRİTİK ATLAMALAR
## 7. ÖĞRENCİ PROFİL ANALİZİ (güçlü yönler, geliştirilmesi gerekenler, önerilen çalışma planı)`;
  }
}

// ─── Tip tanımları ────────────────────────────────────────────────────────────
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

interface OsceRequestBody {
  action: "generate_case" | "message" | "evaluate";
  specialty?: string;
  difficulty?: string;
  phase?: OscePhase;
  message?: string;
  caseData?: OsceCase;
  history?: ConversationMessage[];
}

// ─── Yardımcı: JSON temizle ───────────────────────────────────────────────────
function extractJson(text: string): string {
  // Markdown code block varsa çıkar
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // İlk { ... } bloğunu bul
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
    }

    const body: OsceRequestBody = await req.json();

    // ── 1. VAKA ÜRET ──────────────────────────────────────────────────────────
    if (body.action === "generate_case") {
      const hints = [
        body.specialty ? `Uzmanlık: ${body.specialty}` : "",
        body.difficulty ? `Zorluk: ${body.difficulty}` : "",
      ].filter(Boolean).join(", ");

      // Kullanıcı materyallerinden konu bağlamı al
      const matContext = await getUserMaterialReport(
        `OSCE vakası ${body.specialty ?? ""}  ${body.difficulty ?? ""}`,
        user.id,
      ).catch(() => "");

      const aiRuntime = await createCentralAiRuntime({
        moduleName: "osce-generate",
        requestedModel: "EFFICIENT",
        requestedMaxOutputTokens: 900,
      });
      if (!aiRuntime.settings.globalEnabled) {
        return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
      }

      const result = await generateText({
        model: aiRuntime.model,
        system: appendCentralSystemPrompt(
          CASE_GENERATOR_PROMPT +
          (matContext
            ? `\n\nKULLANICI MATERYALLERİ (referans al):\n${sanitizeContextText(
                matContext,
                600,
              )}`
            : ""),
          aiRuntime.settings,
        ),
        prompt: `Yeni OSCE vakası üret.${hints ? " " + hints + "." : ""} JSON only.`,
        temperature: aiRuntime.temperature,
        maxOutputTokens: aiRuntime.maxOutputTokens,
      });

      let caseData: OsceCase;
      try {
        const clean = extractJson(result.text);
        caseData = JSON.parse(clean) as OsceCase;
        caseData.caseId = `osce_${Date.now()}`;
        // difficulty override
        if (body.difficulty) caseData.difficulty = body.difficulty;
      } catch (parseErr) {
        console.error("OSCE JSON parse hatası:", parseErr, "\nRaw:", result.text.slice(0, 500));
        return NextResponse.json(
          { error: "Vaka üretilemedi, lütfen tekrar deneyin." },
          { status: 500 }
        );
      }

      const inputTokens = result.usage?.inputTokens ?? 0;
      const outputTokens = result.usage?.outputTokens ?? 0;
      // Kullanım logla (arka planda)
      logAIUsage(user.id, aiRuntime.modelId, inputTokens + outputTokens).catch(() => {});
      void recordAiUsageTelemetry({
        userId: user.id,
        route: "/api/ai/osce",
        model: aiRuntime.modelId,
        inputTokens,
        outputTokens,
        module: "osce-generate",
        source: "generateText",
      }).catch(() => {});

      return NextResponse.json({ caseData });
    }

    // ── 2. AŞAMA MESAJI (streaming) ──────────────────────────────────────────
    if (body.action === "message") {
      const { phase, message, caseData, history = [] } = body;
      const safeMessage = sanitizeUserMessage(message, 1_200);
      const aiRuntime = await createCentralAiRuntime({
        moduleName: "osce-message",
        requestedModel: "EFFICIENT",
        requestedMaxOutputTokens: 450,
      });
      if (!aiRuntime.settings.globalEnabled) {
        return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
      }
      const safeHistory = sanitizeHistory(
        history,
        aiRuntime.settings.historyItemsLimit,
        aiRuntime.settings.historyItemChars,
      );

      if (!phase || !safeMessage || !caseData) {
        return NextResponse.json({ error: "Eksik parametre." }, { status: 400 });
      }

      const systemPrompt = appendCentralSystemPrompt(
        sanitizeContextText(getPhaseSystemPrompt(phase, caseData), 3_000),
        aiRuntime.settings,
      );

      if (!aiRuntime.settings.streamingEnabled) {
        const result = await generateText({
          model: aiRuntime.model,
          system: systemPrompt,
          messages: [
            ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: safeMessage },
          ],
          temperature: aiRuntime.temperature,
          maxOutputTokens: aiRuntime.maxOutputTokens,
        });

        const inputTokens = result.usage?.inputTokens ?? 0;
        const outputTokens = result.usage?.outputTokens ?? 0;
        logAIUsage(user.id, aiRuntime.modelId, inputTokens + outputTokens).catch(() => {});
        void recordAiUsageTelemetry({
          userId: user.id,
          route: "/api/ai/osce",
          model: aiRuntime.modelId,
          inputTokens,
          outputTokens,
          module: "osce-message",
          source: "generateText",
        }).catch(() => {});
        return NextResponse.json({ text: result.text });
      }

      const result = streamText({
        model: aiRuntime.model,
        system: systemPrompt,
        messages: [
          ...safeHistory.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: safeMessage },
        ],
        temperature: aiRuntime.temperature,
        maxOutputTokens: aiRuntime.maxOutputTokens,
      });

      // Kullanım logla (arka planda, streaming'i bloklamadan)
      Promise.resolve(result.usage).then(async (usage) => {
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        await Promise.allSettled([
          logAIUsage(user.id, aiRuntime.modelId, inputTokens + outputTokens),
          recordAiUsageTelemetry({
            userId: user.id,
            route: "/api/ai/osce",
            model: aiRuntime.modelId,
            inputTokens,
            outputTokens,
            module: "osce-message",
            source: "streamText",
          }),
        ]);
      }).catch(() => {});

      return result.toTextStreamResponse();
    }

    // ── 3. FINAL DEĞERLENDİRME ───────────────────────────────────────────────
    if (body.action === "evaluate") {
      const { caseData, history = [] } = body;
      const aiRuntime = await createCentralAiRuntime({
        moduleName: "osce-evaluate",
        requestedModel: "FAST",
        requestedMaxOutputTokens: 900,
      });
      if (!aiRuntime.settings.globalEnabled) {
        return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
      }
      if (!caseData) {
        return NextResponse.json({ error: "Vaka verisi eksik." }, { status: 400 });
      }

      const systemPrompt = getPhaseSystemPrompt("EVALUATION", caseData);
      const conversationSummary = history
        .slice(-12)
        .map((m) => `${m.role === "user" ? "ÖĞRENCİ" : "SİSTEM"}: ${sanitizeContextText(m.content, 600)}`)
        .join("\n---\n");

      const result = await generateText({
        model: aiRuntime.model,
        system: appendCentralSystemPrompt(
          sanitizeContextText(systemPrompt, 3_000),
          aiRuntime.settings,
        ),
        prompt: sanitizeContextText(
          `Sınav konuşması:\n${conversationSummary}\n\nKapsamlı OSCE değerlendirme raporunu yaz.`,
          AI_LIMITS.MAX_SYSTEM_CONTEXT_CHARS,
        ),
        temperature: aiRuntime.temperature,
        maxOutputTokens: aiRuntime.maxOutputTokens,
      });

      // Logla + sistem kaydı (arka planda)
      const inputTokens = result.usage?.inputTokens ?? 0;
      const outputTokens = result.usage?.outputTokens ?? 0;
      Promise.allSettled([
        logAIUsage(user.id, aiRuntime.modelId, inputTokens + outputTokens),
        recordAiUsageTelemetry({
          userId: user.id,
          route: "/api/ai/osce",
          model: aiRuntime.modelId,
          inputTokens,
          outputTokens,
          module: "osce-evaluate",
          source: "generateText",
        }),
        createSystemLog({
          level: "info",
          category: "ai",
          message: "OSCE sınavı tamamlandı",
          details: `User: ${user.id} | Case: ${caseData.caseId}`,
          userId: user.id,
        }),
      ]).catch(() => {});

      return NextResponse.json({ report: result.text });
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    console.error("OSCE API Hatası:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: `Sistem hatası: ${message}` }, { status: 500 });
  }
}
