import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGDriveAuthUrl,
  getDriveConfigStatus,
  getDriveConnectionStatus,
  revokeDriveConnection,
  createGDriveState,
} from "@/lib/gdrive/client";
import { getDriveConfigMissingMessage } from "@/lib/gdrive/config";

export const dynamic = "force-dynamic";

/** GET /api/auth/gdrive — OAuth başlat veya bağlantı durumu döndür */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = getDriveConfigStatus({
    requestUrl: req.url,
    headers: req.headers,
  });

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      reauthRequired: false,
      missingConfig: config.missingConfig,
      missingConfigDetails: config.missingConfigDetails,
      message: getDriveConfigMissingMessage(config.missingConfig),
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    const status = await getDriveConnectionStatus(user.id);
    const message = !config.configured
      ? "Google Drive OAuth yapılandırması eksik."
      : status.reauthRequired
        ? "Drive oturumu yenilenmeli. Devam etmek için bağlantıyı tekrar kurun."
        : status.connected
          ? "Drive hesabı bağlı. Dosya seçerek içe aktarabilirsiniz."
          : "Drive hesabı bağlı değil. İçeri aktarmak için önce bağlanın.";
    return NextResponse.json({
      configured: true,
      ...status,
      missingConfig: [],
      missingConfigDetails: [],
      baseUrl: config.baseUrl,
      redirectUri: config.redirectUri,
      message,
    });
  }

  if (action === "connect") {
    const state = createGDriveState(user.id);
    const authUrl = getGDriveAuthUrl(state, {
      requestUrl: req.url,
      headers: req.headers,
    });
    return NextResponse.json({ authUrl, configured: true, missingConfig: [], missingConfigDetails: [] });
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
