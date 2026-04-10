import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/rag/admin";
import { getRagStats } from "@/lib/rag/service";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const stats = await getRagStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("RAG stats error:", error);
    return NextResponse.json(
      { error: "RAG istatistikleri alınamadı." },
      { status: 500 },
    );
  }
}
