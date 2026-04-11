import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createWrongQuestion,
  deleteWrongQuestion,
  listWrongQuestions,
  replaceWrongQuestions,
  updateWrongQuestion,
} from "@/lib/study/core";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listWrongQuestions(user.id);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);

  if (Array.isArray(body?.items)) {
    const imported = await replaceWrongQuestions(user.id, body.items);
    return NextResponse.json({ success: true, imported });
  }

  if (!body?.questionText || !Array.isArray(body?.options)) {
    return NextResponse.json({ error: "Geçersiz payload" }, { status: 400 });
  }

  const item = await createWrongQuestion(user.id, {
    sourceQuestionId: typeof body.sourceQuestionId === "string" ? body.sourceQuestionId : null,
    subject: typeof body.subject === "string" ? body.subject : "Genel",
    difficulty: body.difficulty,
    questionText: body.questionText,
    options: body.options,
    correctAnswer: Number(body.correctAnswer ?? 0),
    userAnswer: Number(body.userAnswer ?? 0),
    explanation: typeof body.explanation === "string" ? body.explanation : null,
    learned: Boolean(body.learned),
    addedAt: typeof body.addedAt === "string" ? body.addedAt : undefined,
  });
  return NextResponse.json({ success: true, item });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  const item = await updateWrongQuestion(user.id, id, { learned: body.learned });
  return NextResponse.json({ success: true, item });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  await deleteWrongQuestion(user.id, id);
  return NextResponse.json({ success: true });
}
