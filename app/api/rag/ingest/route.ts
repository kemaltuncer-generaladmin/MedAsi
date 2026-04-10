import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/rag/admin";
import { ingestPdfFile, ingestTextDocument } from "@/lib/rag/service";

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const branch =
      typeof body.branch === "string" && body.branch.trim()
        ? body.branch.trim()
        : "Genel";

    if (typeof body.filePath === "string" && body.filePath.trim()) {
      const result = await ingestPdfFile({
        filePath: body.filePath.trim(),
        title:
          typeof body.title === "string" && body.title.trim()
            ? body.title.trim()
            : undefined,
        branch,
      });

      return NextResponse.json({ success: true, mode: "file", ...result });
    }

    if (
      typeof body.fullText === "string" &&
      body.fullText.trim() &&
      typeof body.title === "string" &&
      body.title.trim()
    ) {
      const result = await ingestTextDocument({
        title: body.title.trim(),
        branch,
        fullText: body.fullText,
        metadata:
          body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      });

      return NextResponse.json({ success: true, mode: "text", ...result });
    }

    return NextResponse.json(
      { error: "filePath veya title + fullText gerekli." },
      { status: 400 },
    );
  } catch (error) {
    console.error("RAG ingest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF içe aktarılamadı." },
      { status: 500 },
    );
  }
}
