import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/auth/current-user-role";
import { createSystemLog } from "@/lib/system-log";
import { generateModuleStudioSpec } from "@/lib/ai/module-studio";
import { moduleStudioInputSchema } from "@/lib/ai/module-studio-schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, role } = await getCurrentUserWithRole();
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const input = moduleStudioInputSchema.parse(body);
    const result = await generateModuleStudioSpec(input);

    await createSystemLog({
      level: "success",
      category: "ai",
      message: "Module Studio spec uretildi",
      details: [
        `module=${result.spec.overview.slug}`,
        `surface=${result.spec.routing.primarySurface}`,
        `source=${result.spec.meta.source}`,
      ].join(" | "),
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Module Studio istegi islenemedi.";

    await createSystemLog({
      level: "error",
      category: "ai",
      message: "Module Studio spec uretimi basarisiz",
      details: message,
      userId: user.id,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
