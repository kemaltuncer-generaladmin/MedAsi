import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackModuleActivity } from "@/lib/telemetry/module-activity";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          path?: string;
          action?: string;
          module?: string;
          metadata?: Record<string, unknown> | null;
        }
      | null;

    const path = typeof body?.path === "string" ? body.path.trim() : "";
    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    await trackModuleActivity({
      userId: user.id,
      path,
      action: typeof body?.action === "string" ? body.action : undefined,
      module: typeof body?.module === "string" ? body.module : undefined,
      metadata: body?.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("module activity telemetry failed", error);
    return NextResponse.json({ error: "Telemetry failed" }, { status: 500 });
  }
}

