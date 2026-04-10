import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGDriveAuthUrl,
  isDriveConfigured,
  hasDriveConnection,
  revokeDriveConnection,
  createGDriveState,
} from "@/lib/gdrive/client";

export const dynamic = "force-dynamic";

/** GET /api/auth/gdrive — OAuth başlat veya bağlantı durumu döndür */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isDriveConfigured()) {
    return NextResponse.json({
      configured: false,
      message: "GOOGLE_DRIVE_CLIENT_ID ve GOOGLE_DRIVE_CLIENT_SECRET ayarlanmamış.",
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    const connected = await hasDriveConnection(user.id);
    return NextResponse.json({ configured: true, connected });
  }

  if (action === "connect") {
    const state = createGDriveState(user.id);
    const authUrl = getGDriveAuthUrl(state);
    return NextResponse.json({ authUrl });
  }

  return NextResponse.json({ error: "action parametresi gerekli (status|connect)" }, { status: 400 });
}

/** DELETE /api/auth/gdrive — Drive bağlantısını kaldır */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await revokeDriveConnection(user.id);
  return NextResponse.json({ success: true });
}
