import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type AiPrefsPayload = {
  model?: "FAST" | "EFFICIENT";
  language?: "tr" | "en" | "auto";
  responseLength?: "short" | "medium" | "long";
  clinicalTerminology?: boolean;
  showReferences?: boolean;
  addDisclaimer?: boolean;
};

function sanitizeAiPrefs(value: unknown): AiPrefsPayload {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const output: AiPrefsPayload = {};

  if (input.model === "FAST" || input.model === "EFFICIENT") output.model = input.model;
  if (input.language === "tr" || input.language === "en" || input.language === "auto") output.language = input.language;
  if (input.responseLength === "short" || input.responseLength === "medium" || input.responseLength === "long") {
    output.responseLength = input.responseLength;
  }
  if (typeof input.clinicalTerminology === "boolean") output.clinicalTerminology = input.clinicalTerminology;
  if (typeof input.showReferences === "boolean") output.showReferences = input.showReferences;
  if (typeof input.addDisclaimer === "boolean") output.addDisclaimer = input.addDisclaimer;

  return output;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    });

    const prefs = (dbUser?.notificationPrefs as Record<string, unknown> | null)?.aiPrefs ?? null;
    return NextResponse.json({ prefs });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const safePrefs = sanitizeAiPrefs(body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    });

    const existing = (dbUser?.notificationPrefs as Record<string, unknown> | null) ?? {};

    await prisma.user.update({
      where: { id: user.id },
      data: {
        notificationPrefs: { ...existing, aiPrefs: safePrefs },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
