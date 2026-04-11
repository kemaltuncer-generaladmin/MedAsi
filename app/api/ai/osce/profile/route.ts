import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { rememberUserSignals } from "@/lib/ai/personalization";

export interface OsceSessionResult {
  caseId: string;
  specialty: string;
  difficulty: string;
  diagnosis: string;
  totalScore: number;
  subscores: {
    anamnesis: number;
    physicalExam: number;
    investigations: number;
    diagnosis: number;
    management: number;
  };
  strengths: string[];
  weaknesses: string[];
  criticalMisses: string[];
  completedAt: string;
}

/**
 * POST /api/ai/osce/profile
 * OSCE sınav sonucunu kullanıcı profiline kaydeder.
 * notificationPrefs.osceProfile altında biriktirilir.
 * Diğer AI ajanları bu veriyi kullanabilir.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { result: OsceSessionResult };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { result } = body;
  if (!result || typeof result.totalScore !== "number") {
    return NextResponse.json({ error: "Geçersiz sonuç verisi." }, { status: 400 });
  }

  // Mevcut profili al
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notificationPrefs: true },
  });

  const prefs = (dbUser?.notificationPrefs as Record<string, unknown> | null) ?? {};
  const existingOsceProfile = (prefs.osceProfile as OsceProfile | undefined) ?? {
    sessions: [],
    totalSessions: 0,
    averageScore: 0,
    specialtyPerformance: {},
    weakAreas: [],
    strongAreas: [],
    lastUpdated: "",
  };

  // Oturumu ekle
  const sessions: OsceSessionResult[] = [
    ...(existingOsceProfile.sessions ?? []).slice(-19), // son 20 sınav
    result,
  ];

  // Ortalama hesapla
  const averageScore = Math.round(sessions.reduce((s, r) => s + r.totalScore, 0) / sessions.length);

  // Uzmanlık bazlı performans
  const specialtyPerformance: Record<string, { count: number; avg: number }> = {
    ...(existingOsceProfile.specialtyPerformance ?? {}),
  };
  if (!specialtyPerformance[result.specialty]) {
    specialtyPerformance[result.specialty] = { count: 0, avg: 0 };
  }
  const sp = specialtyPerformance[result.specialty];
  sp.avg = Math.round((sp.avg * sp.count + result.totalScore) / (sp.count + 1));
  sp.count += 1;

  // Güçlü/zayıf alan analizi (son 5 sınavdan)
  const recentSessions = sessions.slice(-5);
  const allWeaknesses = recentSessions.flatMap(s => s.weaknesses ?? []);
  const allStrengths = recentSessions.flatMap(s => s.strengths ?? []);
  const weakAreas = [...new Set(allWeaknesses)].slice(0, 5);
  const strongAreas = [...new Set(allStrengths)].slice(0, 5);

  const updatedOsceProfile: OsceProfile = {
    sessions,
    totalSessions: sessions.length,
    averageScore,
    specialtyPerformance,
    weakAreas,
    strongAreas,
    lastUpdated: new Date().toISOString(),
  };

  const updatedPrefs = {
    ...prefs,
    osceProfile: updatedOsceProfile as unknown as Prisma.InputJsonValue,
  } as Prisma.InputJsonValue;

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPrefs: updatedPrefs },
  });

  void rememberUserSignals({
    userId: user.id,
    moduleName: "osce-evaluate",
    insight: {
      weakAreas,
      strongAreas,
      studyFocus: [result.specialty, ...weakAreas].filter(Boolean),
      summary: `OSCE ozeti: ${result.specialty} alaninda ortalama skor ${averageScore}/100. Zayif alanlar: ${weakAreas.slice(0, 3).join(", ") || "belirsiz"}.`,
      keyObservation: result.totalScore < 70
        ? `${result.specialty} OSCE performansinda ek pekistirme gerekiyor.`
        : `${result.specialty} OSCE performansi toparlaniyor.`,
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    profile: updatedOsceProfile,
  });
}

/**
 * GET /api/ai/osce/profile
 * Kullanıcının OSCE profil özetini döndürür.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notificationPrefs: true },
  });

  const prefs = (dbUser?.notificationPrefs as Record<string, unknown> | null) ?? {};
  const osceProfile = (prefs.osceProfile as OsceProfile | undefined) ?? null;

  return NextResponse.json({ profile: osceProfile });
}

interface OsceProfile {
  sessions: OsceSessionResult[];
  totalSessions: number;
  averageScore: number;
  specialtyPerformance: Record<string, { count: number; avg: number }>;
  weakAreas: string[];
  strongAreas: string[];
  lastUpdated: string;
}
