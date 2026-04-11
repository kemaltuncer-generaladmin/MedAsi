import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudyWorkspace, refreshDerivedStudyRecommendations } from "@/lib/study/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await refreshDerivedStudyRecommendations(user.id).catch(() => {});
  const workspace = await getStudyWorkspace(user.id);
  return NextResponse.json(workspace);
}
