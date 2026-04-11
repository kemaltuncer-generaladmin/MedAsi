import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cases = await prisma.case.findMany({
    where: { userId: user.id },
    include: { patient: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cases });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const caseRecord = await prisma.case.create({
    data: {
      userId: user.id,
      patientId: body.patientId,
      title: body.title,
      description: body.description,
    },
  });

  return NextResponse.json({ case: caseRecord });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }

  const existing = await prisma.case.findFirst({
    where: { id: body.id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  }

  const caseRecord = await prisma.case.update({
    where: { id: body.id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      patientId: body.patientId ?? existing.patientId,
    },
  });

  return NextResponse.json({ case: caseRecord });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }

  const existing = await prisma.case.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Vaka bulunamadı" }, { status: 404 });
  }

  await prisma.case.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
