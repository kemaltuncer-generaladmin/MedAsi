import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/rag/admin";
import { deleteRagSource, listRagSources } from "@/lib/rag/service";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const sources = await listRagSources();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("RAG sources error:", error);
    return NextResponse.json(
      { error: "RAG kaynak listesi alınamadı." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { sourceKey } = await req.json();
    if (!sourceKey || typeof sourceKey !== "string") {
      return NextResponse.json(
        { error: "sourceKey zorunlu." },
        { status: 400 },
      );
    }

    const result = await deleteRagSource(sourceKey);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("RAG delete error:", error);
    return NextResponse.json(
      { error: "Kaynak silinemedi." },
      { status: 500 },
    );
  }
}
