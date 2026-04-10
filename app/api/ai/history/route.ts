import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

    // Sessions tablosundan son AI kullanımlarını al
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        model: true,
        tokensUsed: true,
        createdAt: true,
      },
    });

    // Aynı döneme ait system log'lardan modül bilgisini eşleştir
    if (sessions.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const oldestSession = sessions[sessions.length - 1].createdAt;
    const logs = await prisma.systemLog.findMany({
      where: {
        userId: user.id,
        category: "ai",
        level: "info",
        createdAt: { gte: oldestSession },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        message: true,
        details: true,
        createdAt: true,
      },
    });

    // Log'lardan modül adını çıkar ("AI sorgusu işlendi (moduleName)")
    const logMap: Record<string, string> = {};
    for (const log of logs) {
      const match = log.message.match(/\(([^)]+)\)/);
      if (match) {
        const key = log.createdAt.toISOString().slice(0, 16); // dakika hassasiyeti
        logMap[key] = match[1];
      }
    }

    const history = sessions.map((s) => {
      const key = s.createdAt.toISOString().slice(0, 16);
      return {
        id: s.id,
        model: s.model.includes("pro") ? "FAST" : "EFFICIENT",
        modelName: s.model,
        tokensUsed: s.tokensUsed,
        module: logMap[key] ?? "genel",
        createdAt: s.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("AI History Error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
