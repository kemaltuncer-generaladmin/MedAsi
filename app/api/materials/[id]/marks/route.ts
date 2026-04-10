import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addMaterialMark, getMaterialById, listMaterialMarks } from "@/lib/rag/user-materials";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const material = await getMaterialById(user.id, id);
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı." }, { status: 404 });

  const marks = await listMaterialMarks(user.id, id);
  return NextResponse.json({ marks });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const material = await getMaterialById(user.id, id);
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı." }, { status: 404 });

  const payload = await req.json().catch(() => null);
  const note = typeof payload?.note === "string" ? payload.note : "";
  const color = typeof payload?.color === "string" ? payload.color : "yellow";
  const slideNoRaw = payload?.slideNo;
  const slideNo = Number.isFinite(slideNoRaw) ? Number(slideNoRaw) : null;

  if (!note.trim()) return NextResponse.json({ error: "Not metni zorunlu." }, { status: 400 });
  if (note.length > 2000) return NextResponse.json({ error: "Not metni çok uzun." }, { status: 400 });

  const mark = await addMaterialMark({
    userId: user.id,
    materialId: id,
    note,
    color,
    slideNo,
  });
  return NextResponse.json({ success: true, mark });
}

