import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { consumeQuestionBankQuota } from "@/lib/access/entitlements";
import { rememberQuestionBankResults } from "@/lib/ai/personalization";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const results = body.results;
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const quota = await consumeQuestionBankQuota(user.id, results.length);
    if (!quota.ok) {
      return NextResponse.json(
        {
          error:
            quota.code === "question_limit_reached"
              ? "Aylık soru bankası limitinize ulaştınız."
              : "Paketiniz soru bankası kullanımına uygun değil.",
          code: quota.code,
          usage: {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
          },
        },
        { status: 403 },
      );
    }

    // 1. Tüm soru denemelerini DB'ye toplu kaydet
    await prisma.questionAttempt.createMany({
      data: results.map((r: any) => ({
        userId: user.id,
        subject: r.subject,
        difficulty: r.difficulty,
        questionText: r.questionText,
        isCorrect: r.isCorrect,
      }))
    });

    void rememberQuestionBankResults({
      userId: user.id,
      results,
    }).catch(() => {});

    // 2. AI analizini arka planda başlat
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/ai/analyze-learning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? ''
      },
      body: JSON.stringify({ userId: user.id }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit Session Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
