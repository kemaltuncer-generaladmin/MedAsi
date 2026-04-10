import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMaterialById, deleteMaterial } from "@/lib/rag/user-materials";

export const dynamic = "force-dynamic";

/** GET /api/materials/:id — materyal detayı (status polling için) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const material = await getMaterialById(user.id, id);
  if (!material) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  return NextResponse.json({ material });
}

/** DELETE /api/materials/:id */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteMaterial(user.id, id);
  return NextResponse.json({ success: true });
}
