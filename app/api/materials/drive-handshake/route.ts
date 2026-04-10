import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getManagedDriveHandshakeStatus, getOrCreateUserDriveWorkspace } from "@/lib/gdrive/service-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const handshake = await getManagedDriveHandshakeStatus();
  let workspace = null;
  if (handshake.ready) {
    workspace = await getOrCreateUserDriveWorkspace(user.id);
  }

  return NextResponse.json({
    handshake,
    workspace,
  });
}

