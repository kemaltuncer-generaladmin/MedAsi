import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/rag/admin";
import { scanWatchFolder } from "@/lib/rag/service";

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const branch =
      typeof body.branch === "string" && body.branch.trim()
        ? body.branch.trim()
        : "Genel";

    const result = await scanWatchFolder(branch);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("RAG scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Klasör taranamadı." },
      { status: 500 },
    );
  }
}
