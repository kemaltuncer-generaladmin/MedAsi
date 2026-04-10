import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listUserMaterials, getMaterialStats, deleteMaterial } from "@/lib/rag/user-materials";

export const dynamic = "force-dynamic";

/** GET /api/materials — kullanıcının materyalleri + istatistikler */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [materials, stats] = await Promise.all([
    listUserMaterials(user.id),
    getMaterialStats(user.id),
  ]);

  return NextResponse.json({ materials, stats });
}

/** DELETE /api/materials?id=xxx */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await deleteMaterial(user.id, id);
  return NextResponse.json({ success: true });
}
