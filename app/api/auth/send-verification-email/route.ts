import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX) return false;
  current.count += 1;
  rateLimitStore.set(key, current);
  return true;
}

function getBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    req.nextUrl.origin
  ).replace(/\/$/, "");
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

    const baseUrl = getBaseUrl(req);
    const supabase = createAdminClient();

    // Admin API ile magiclink üret — PKCE-uyumlu confirm endpoint kullanılır
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${baseUrl}/login?verified=true` },
    });

    if (error || (!data?.properties?.hashed_token && !data?.properties?.action_link)) {
      return NextResponse.json(
        { success: false, error: "Doğrulama e-postası oluşturulamadı: " + (error?.message ?? "Bilinmeyen hata") },
        { status: 400 },
      );
    }

    const hashedToken = data.properties.hashed_token;
    // PKCE-uyumlu confirm endpoint tercih edilir — code_verifier gerektirmez
    // next parametresi doğru URL encode edilmeli
    const verificationLink = hashedToken
      ? `${baseUrl}/api/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${encodeURIComponent("/dashboard?verified=true")}`
      : data.properties.action_link;

    await sendVerificationEmail({
      to: email,
      name: userName,
      verificationLink,
    });

    return NextResponse.json({
      success: true,
      message: `${userName} için doğrulama e-postası gönderildi.`,
    });
  } catch (error) {
    console.error("[send-verification-email]", error);
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
