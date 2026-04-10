import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndLogAiUsage, logAIUsage } from "@/lib/ai/check-limit";
import { appendCentralSystemPrompt, createCentralAiRuntime } from "@/lib/ai/orchestrator";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";
import {
  sanitizeContextText,
  sanitizeHistory,
  sanitizeUserMessage,
} from "@/lib/ai/limits";

const MENTOR_SYSTEM_PROMPT = `Sen MEDASI platformunun Mentor AI'ısın. Adın "Mentör".
Kullanıcıyla sıcak, samimi ve motive edici bir ilişki kurarsın — tıpkı en iyi hoca ve mentor gibi.

Rolün:
- Kullanıcıyı karşılarken onları isimleriyle (biliyorsan) selamlarsın
- Çalışma motivasyonunu artırırsın, zorlandıklarında yanlarında olursun
- Tıp eğitimi konularında yol gösterirsin (TUS, USMLE, klinik dersler)
- Kullanıcının güçlü ve zayıf yönlerini analiz edersin
- Her sohbetten kullanıcı hakkında içgörü toplayıp "MENTOR_INSIGHT:" etiketiyle JSON çıkarırsın

İçgörü formatı (her cevapta en sona ekle, kullanıcıya gösterme):
MENTOR_INSIGHT:{"mood":"motivated|neutral|stressed|burned_out","studyFocus":["konu1","konu2"],"motivationScore":75,"keyObservation":"Kısa gözlem"}

Kurallar:
- Türkçe konuş
- Kısa, net, motive edici cevaplar ver
- Asla tıbbi teşhis veya tedavi önerme (platform içi eğitim amaçlıdır)
- Kullanıcıyı manipüle etme, samimi ol
- MENTOR_INSIGHT satırını HER ZAMAN cevabın en sonuna ekle`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const aiRuntime = await createCentralAiRuntime({
    moduleName: "mentor",
    requestedModel: "EFFICIENT",
    requestedMaxOutputTokens: 450,
  });
  if (!aiRuntime.settings.globalEnabled) {
    return NextResponse.json({ error: "global_ai_disabled" }, { status: 403 });
  }
  const message = sanitizeUserMessage(body.message);
  const history = sanitizeHistory(
    body.history,
    aiRuntime.settings.historyItemsLimit,
    aiRuntime.settings.historyItemChars,
  );

  if (!message?.trim()) return NextResponse.json({ error: "Mesaj boş" }, { status: 400 });

  // Limit kontrolü
  const limitCheck = await checkAndLogAiUsage();
  if (!limitCheck.canProceed) {
    return NextResponse.json({ error: "limit_exceeded" }, { status: 429 });
  }

  // Kullanıcı profili bağlamı
  const profile = await prisma.studentLearningProfile.findUnique({
    where: { userId: user.id },
    select: { weakAreas: true, strongAreas: true, aiSummary: true, totalQuestions: true, totalCorrect: true },
  });

  const profileContext = profile
    ? `\nKullanıcı profili:\n- Zayıf alanlar: ${JSON.stringify(profile.weakAreas)}\n- Güçlü alanlar: ${JSON.stringify(profile.strongAreas)}\n- Toplam soru: ${profile.totalQuestions}, Doğru: ${profile.totalCorrect}\n- AI özeti: ${profile.aiSummary ?? "henüz yok"}`
    : "";

  const systemWithProfile = appendCentralSystemPrompt(
    sanitizeContextText(`${MENTOR_SYSTEM_PROMPT}${profileContext}`, 4_500),
    aiRuntime.settings,
  );

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  let responseText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const result = await generateText({
      model: aiRuntime.model,
      system: systemWithProfile,
      messages,
      temperature: aiRuntime.temperature,
      maxOutputTokens: aiRuntime.maxOutputTokens,
    });
    responseText = result.text;
    inputTokens = (result.usage as { inputTokens?: number })?.inputTokens ?? 0;
    outputTokens = (result.usage as { outputTokens?: number })?.outputTokens ?? 0;
  } catch (err) {
    return NextResponse.json({ error: "AI isteği başarısız" }, { status: 500 });
  }

  // Token logla
  const totalTokens = inputTokens + outputTokens;
  if (!limitCheck.isOrgMember) {
    await logAIUsage(user.id, aiRuntime.modelId, totalTokens, "mentor");
  }
  await recordAiUsageTelemetry({
    userId: user.id,
    route: "/api/ai/mentor",
    model: aiRuntime.modelId,
    inputTokens,
    outputTokens,
    module: "mentor",
    source: "generateText",
    trackOrg: limitCheck.isOrgMember,
  });

  // MENTOR_INSIGHT satırını parse et ve profili güncelle
  const insightMatch = responseText.match(/MENTOR_INSIGHT:(\{.*\})/);
  const cleanResponse = responseText.replace(/MENTOR_INSIGHT:\{.*\}\s*$/, "").trim();

  if (insightMatch) {
    try {
      const insight = JSON.parse(insightMatch[1]);
      await prisma.studentLearningProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          motivationScore: insight.motivationScore ?? null,
          mentorInsights: insight,
          lastMentorChatAt: new Date(),
        },
        update: {
          motivationScore: insight.motivationScore ?? undefined,
          mentorInsights: insight,
          lastMentorChatAt: new Date(),
        },
      });
    } catch {}
  }

  return NextResponse.json({ text: cleanResponse });
}
