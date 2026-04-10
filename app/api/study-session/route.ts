import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST /api/study-session → yeni oturum başlat
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Açık oturum varsa onu kapat
  const open = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (open) {
    const durationMin = Math.round((Date.now() - open.startedAt.getTime()) / 60000);
    await prisma.studySession.update({
      where: { id: open.id },
      data: { endedAt: new Date(), durationMin },
    });
  }

  const session = await prisma.studySession.create({
    data: { userId: user.id },
  });

  return NextResponse.json({ session });
}

// PATCH /api/study-session → aktif oturumu kapat
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notes } = await req.json().catch(() => ({}));

  const open = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!open) return NextResponse.json({ ok: true, durationMin: 0 });

  const durationMin = Math.round((Date.now() - open.startedAt.getTime()) / 60000);
  const updated = await prisma.studySession.update({
    where: { id: open.id },
    data: { endedAt: new Date(), durationMin, notes: notes ?? null },
  });

  return NextResponse.json({ ok: true, durationMin, session: updated });
}
