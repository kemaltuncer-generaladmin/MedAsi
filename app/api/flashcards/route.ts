import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listFlashcardDecks, replaceFlashcardDecks } from "@/lib/study/core";

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
  const decks = await listFlashcardDecks(user.id);
  return NextResponse.json({ decks });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.decks)) {
    return NextResponse.json({ error: "decks array gerekli" }, { status: 400 });
  }
  const decks = await replaceFlashcardDecks(user.id, body.decks);
  return NextResponse.json({ success: true, decks });
}
