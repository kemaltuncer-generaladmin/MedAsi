import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSystemSettingsFromDb } from "@/lib/system-settings";
import { getResolvedGeminiConfig } from "@/lib/ai/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiErrorToResponsePayload, isGeminiErrorLike } from "@/lib/ai/google-errors";
import { getAdminStudyOverview } from "@/lib/study/core";

export const dynamic = "force-dynamic";

function compactNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [userCount, packageDist, aiSessions, settings, errorLogs24h, warnLogs24h, supportOpen, communityReports, moduleRows, recentUsers, studyOverview] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.groupBy({ by: ["packageId"], _count: { id: true } }),
        prisma.session.count({ where: { createdAt: { gte: dayAgo } } }),
        getSystemSettingsFromDb(),
        prisma.systemLog.count({ where: { level: "error", createdAt: { gte: dayAgo } } }),
        prisma.systemLog.count({ where: { level: "warn", createdAt: { gte: dayAgo } } }),
        prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
        prisma.communityReport.count({ where: { status: { in: ["open", "in_review"] } } }),
        prisma.module.findMany({
          select: { name: true, _count: { select: { userModules: true, packageModules: true } } },
          take: 6,
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, createdAt: true, package: { select: { name: true } } },
        }),
        getAdminStudyOverview(),
      ]);

    const packages = await prisma.package.findMany({
      select: { id: true, name: true, price: true },
    });

    const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]));
    const monthlyRevenue = packageDist.reduce((sum, group) => {
      const pkg = packageMap.get(group.packageId);
      return sum + (pkg?.price ?? 0) * group._count.id;
    }, 0);

    const packageDistribution = packageDist.map((group) => ({
      name: packageMap.get(group.packageId)?.name ?? "Bilinmiyor",
      count: group._count.id,
      share: userCount > 0 ? Math.round((group._count.id / userCount) * 100) : 0,
    }));

    const geminiConfig = getResolvedGeminiConfig("admin-ai", { keyPreference: "server-first" });
    let aiProbe = {
      ok: false,
      reason: "missing_key",
      detail: "Anahtar eksik",
    };
    if (geminiConfig.apiKey) {
      try {
        const model = new GoogleGenerativeAI(geminiConfig.apiKey).getGenerativeModel({
          model: "gemini-2.5-flash",
        });
        await model.generateContent("healthcheck");
        aiProbe = { ok: true, reason: "ok", detail: "Probe başarılı" };
      } catch (error) {
        if (isGeminiErrorLike(error)) {
          const normalized = geminiErrorToResponsePayload(error);
          aiProbe = { ok: false, reason: normalized.reason, detail: normalized.message };
        } else {
          aiProbe = {
            ok: false,
            reason: "upstream_error",
            detail: error instanceof Error ? error.message : "Probe başarısız",
          };
        }
      }
    }
    const walletPurchaseEnabled = process.env.WALLET_PURCHASES_ENABLED === "true";
    let dbHealthy = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }
    const emailProvider = process.env.EMAIL_PROVIDER || "resend";
    const emailConfigured =
      emailProvider === "smtp"
        ? Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        : Boolean(process.env.RESEND_API_KEY && (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      kpis: [
        { label: "Aktif kullanıcı", value: compactNumber(userCount), detail: "Tüm kayıtlı kullanıcılar" },
        { label: "24s AI oturumu", value: compactNumber(aiSessions), detail: "Son 24 saatte AI kullanım hacmi" },
        { label: "Açık destek", value: compactNumber(supportOpen), detail: "Yanıt bekleyen destek talepleri" },
        {
          label: "Study çekirdeği",
          value: compactNumber(studyOverview.wrongQuestionCount + studyOverview.flashcardDeckCount),
          detail: `${studyOverview.failedMaterials} başarısız materyal · ${studyOverview.dueFlashcardCount} due kart`,
        },
      ],
      health: [
        {
          label: "AI erişimi",
          status: settings.aiEnabled && aiProbe.ok ? "healthy" : "warning",
          detail: settings.aiEnabled
            ? aiProbe.ok
              ? "Probe başarılı"
              : `Probe hata: ${aiProbe.reason}`
            : "Kapalı",
        },
        { label: "E-posta", status: emailConfigured ? "healthy" : "warning", detail: emailConfigured ? `${emailProvider.toUpperCase()} hazır` : "Sağlayıcı eksik" },
        { label: "Bakım modu", status: settings.maintenanceMode ? "warning" : "healthy", detail: settings.maintenanceMode ? "Bakım aktif" : "Normal akış" },
        { label: "Risk logları", status: errorLogs24h > 0 ? "warning" : "healthy", detail: `${errorLogs24h} error · ${warnLogs24h} warning` },
        {
          label: "Materyal pipeline",
          status: studyOverview.failedMaterials > 0 || studyOverview.stuckProcessing > 0 ? "warning" : "healthy",
          detail: `${studyOverview.stuckProcessing} kuyruğa takılı · kalite ort. ${studyOverview.averageQualityScore}`,
        },
      ],
      packageDistribution,
      moderation: {
        openReports: communityReports,
        supportQueue: supportOpen,
        errorLogs24h: errorLogs24h + studyOverview.failedMaterials,
        warnLogs24h,
      },
      costlyServices: {
        ai: {
          enabled: settings.aiEnabled,
          probeOk: aiProbe.ok,
          reason: aiProbe.reason,
          detail: aiProbe.detail,
        },
        walletPurchase: {
          enabled: walletPurchaseEnabled,
          detail: walletPurchaseEnabled
            ? "Token satın alma açık"
            : "Token satın alma bakım/kapalı modda",
        },
        database: {
          ok: dbHealthy,
          detail: dbHealthy ? "DB bağlantısı sağlıklı" : "DB erişiminde hata",
        },
      },
      moduleHealth: moduleRows.map((module) => ({
        name: module.name,
        userAssignments: module._count.userModules,
        packageAssignments: module._count.packageModules,
      })),
      recentUsers: recentUsers.map((item) => ({
        id: item.id,
        name: item.name || item.email,
        packageName: item.package.name,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
