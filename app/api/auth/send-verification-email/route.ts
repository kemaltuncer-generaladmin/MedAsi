import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase client is not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    req.nextUrl.origin
  ).replace(/\/$/, "");
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; userName?: string };
    const email = body.email?.trim().toLowerCase();
    const userName = body.userName?.trim() || "MedAsi kullanıcısı";

    if (!email) {
      return NextResponse.json(
        { success: false, error: "E-posta gerekli." },
        { status: 400 },
      );
    }

    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { success: false, error: "Çok sık istek gönderildi. Lütfen bekleyin." },
        { status: 429 },
      );
    }

    const supabase = getClient();
    const emailRedirectTo = `${getBaseUrl(req)}/api/auth/callback?next=/setup`;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Doğrulama e-postası tekrar gönderilemedi." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${userName} için doğrulama e-postası gönderildi.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Doğrulama e-postası gönderilemedi.",
      },
      { status: 500 },
    );
  }
}
