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

  const patients = await prisma.patient.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ patients });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      name: body.name,
      noteField: body.noteField ?? body.notes ?? "",
    },
  });

  return NextResponse.json({ patient });
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

  const existing = await prisma.patient.findFirst({
    where: { id: body.id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  const patient = await prisma.patient.update({
    where: { id: body.id },
    data: {
      name: body.name ?? existing.name,
      noteField: body.noteField ?? body.notes ?? existing.noteField,
    },
  });

  return NextResponse.json({ patient });
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

  const existing = await prisma.patient.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hasta bulunamadı" }, { status: 404 });
  }

  await prisma.patient.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
