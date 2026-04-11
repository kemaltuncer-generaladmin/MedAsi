import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listUserMaterials, getMaterialStats, deleteMaterial } from "@/lib/rag/user-materials";
import {
  getManagedDriveHandshakeStatus,
  getOrCreateUserDriveWorkspace,
  listLibraryFiles,
} from "@/lib/gdrive/service-account";

export const dynamic = "force-dynamic";

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue) =>
      typeof currentValue === "bigint" ? Number(currentValue) : currentValue,
    ),
  ) as T;
}

/** GET /api/materials — kullanıcının materyalleri + istatistikler */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [materials, stats, handshake] = await Promise.all([
    listUserMaterials(user.id),
    getMaterialStats(user.id),
    getManagedDriveHandshakeStatus(),
  ]);
  const workspace = handshake.ready ? await getOrCreateUserDriveWorkspace(user.id) : null;
  const libraryFiles = handshake.ready ? await listLibraryFiles(20).catch(() => []) : [];

  return NextResponse.json(toJsonSafe({
    materials,
    stats,
    workspace,
    managedDrive: {
      handshake,
      visibility: {
        systemHidden: true,
        libraryReadOnly: true,
        userAreaFullAccess: true,
      },
    },
    library: {
      files: libraryFiles,
      readOnly: true,
    },
  }));
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
