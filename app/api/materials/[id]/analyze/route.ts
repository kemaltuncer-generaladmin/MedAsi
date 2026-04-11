import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMaterialQualityReport } from "@/lib/ai/material-agent";
import { getMaterialById } from "@/lib/rag/user-materials";
import {
  getMaterialTextForAnalysis,
  recordMaterialProcessingEvent,
  saveMaterialAnalysis,
  updateMaterialStudyMetadata,
} from "@/lib/study/core";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const material = await getMaterialById(user.id, id);
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı." }, { status: 404 });

  await updateMaterialStudyMetadata(id, { processingStage: "analyzing" });
  await recordMaterialProcessingEvent(user.id, id, "analyzing", "started", "Yeniden analiz başlatıldı.");

  const text = await getMaterialTextForAnalysis(user.id, id);
  if (!text.trim()) {
    await recordMaterialProcessingEvent(user.id, id, "analyzing", "failed", "Analiz için içerik bulunamadı.");
    return NextResponse.json({ error: "Analiz için içerik bulunamadı." }, { status: 400 });
  }

  const { report, slides } = generateMaterialQualityReport({
    title: material.name,
    branch: material.branch,
    text,
    pageCount: material.pageCount ?? undefined,
  });
  await saveMaterialAnalysis(user.id, id, report, slides);
  await recordMaterialProcessingEvent(user.id, id, "analyzing", "completed", "Materyal analizi güncellendi.", {
    qualityScore: report.qualityScore,
    slideCount: report.slideCount,
  });

  return NextResponse.json({ success: true, report, slides });
}
