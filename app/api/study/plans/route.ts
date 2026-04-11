import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudyPlan, saveStudyPlan } from "@/lib/study/core";

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

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const weekKey = req.nextUrl.searchParams.get("weekKey") ?? undefined;
  const plan = await getStudyPlan(user.id, weekKey);
  return NextResponse.json({ plan });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.content !== "string") {
    return NextResponse.json({ error: "content gerekli" }, { status: 400 });
  }
  const plan = await saveStudyPlan(user.id, {
    weekKey: typeof body.weekKey === "string" ? body.weekKey : undefined,
    sourceSummary: typeof body.sourceSummary === "string" ? body.sourceSummary : "",
    content: body.content,
  });
  return NextResponse.json({ success: true, plan });
}
