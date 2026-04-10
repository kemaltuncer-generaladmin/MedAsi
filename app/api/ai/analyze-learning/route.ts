import { NextRequest, NextResponse } from 'next/server';
import { generateText } from "ai";
import { prisma } from '@/lib/prisma';
import { getSystemSettingsFromDb } from '@/lib/system-settings';
import { createSystemLog } from '@/lib/system-log';
import { createCentralAiRuntime } from "@/lib/ai/orchestrator";
import { recordAiUsageTelemetry } from "@/lib/ai/telemetry";

export async function POST(req: NextRequest) {
  try {
    const settings = await getSystemSettingsFromDb();
    if (!settings.aiEnabled) {
      return NextResponse.json({ error: 'AI özellikleri devre dışı' }, { status: 403 });
    }

    const secret = req.headers.get('x-internal-secret');
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const attempts = await prisma.questionAttempt.findMany({
      where: { userId, attemptedAt: { gte: thirtyDaysAgo } }
    });

    if (attempts.length === 0) {
      return NextResponse.json({ success: true, message: 'Analiz edilecek veri yok' });
    }

    const bySubject: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      if (!bySubject[a.subject]) bySubject[a.subject] = { total: 0, correct: 0 };
      bySubject[a.subject].total++;
      if (a.isCorrect) bySubject[a.subject].correct++;
    }

    const statsText = Object.entries(bySubject)
      .map(([subject, s]) => {
        const pct = Math.round((s.correct / s.total) * 100);
        return `${subject}: ${s.correct}/${s.total} doğru (%${pct})`;
      })
      .join('\n');

    const aiRuntime = await createCentralAiRuntime({
      moduleName: "analyze-learning",
      requestedModel: "EFFICIENT",
      requestedMaxOutputTokens: 600,
    });
    if (!aiRuntime.settings.globalEnabled) {
      return NextResponse.json({ error: "Global AI disabled" }, { status: 403 });
    }

    const result = await generateText({
      model: aiRuntime.model,
      system: `Sen bir tıp eğitimi analiz sistemisin. Öğrenci performans verisini analiz et ve SADECE aşağıdaki JSON formatında yanıt ver. Başka metin yazma.\n\n{\n  "topicMastery": { "KonuAdı": 0.0 },\n  "weakAreas": ["en zayıf 3 konu"],\n  "strongAreas": ["en güçlü 3 konu"],\n  "aiSummary": "Türkçe 1-2 cümle özet"\n}`,
      prompt: `Son 30 günlük performans:\n${statsText}`,
      temperature: aiRuntime.temperature,
      maxOutputTokens: aiRuntime.maxOutputTokens,
    });
    await recordAiUsageTelemetry({
      userId,
      route: "/api/ai/analyze-learning",
      model: aiRuntime.modelId,
      inputTokens: (result.usage as { inputTokens?: number } | undefined)?.inputTokens ?? 0,
      outputTokens: (result.usage as { outputTokens?: number } | undefined)?.outputTokens ?? 0,
      module: "analyze-learning",
      source: "background",
    });

    const raw = result.text;
    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch (e) {
      console.error("AI JSON Parse Error:", raw);
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    const totalQuestions = attempts.length;
    const totalCorrect = attempts.filter(a => a.isCorrect).length;

    await prisma.studentLearningProfile.upsert({
      where: { userId },
      create: {
        userId,
        topicMastery: analysis.topicMastery || {},
        weakAreas: analysis.weakAreas || [],
        strongAreas: analysis.strongAreas || [],
        aiSummary: analysis.aiSummary || "",
        totalQuestions,
        totalCorrect,
      },
      update: {
        topicMastery: analysis.topicMastery || {},
        weakAreas: analysis.weakAreas || [],
        strongAreas: analysis.strongAreas || [],
        aiSummary: analysis.aiSummary || "",
        totalQuestions,
        totalCorrect,
        lastAnalyzedAt: new Date()
      }
    });

    await createSystemLog({
      level: "info",
      category: "ai",
      message: "Öğrenme analizi güncellendi",
      details: `userId: ${userId} | deneme: ${attempts.length}`,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analyze Learning Error:', error);
    await createSystemLog({
      level: "error",
      category: "ai",
      message: "Öğrenme analizi hatası",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
