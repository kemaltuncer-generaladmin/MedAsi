import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  saveUserTokens,
  parseGDriveState,
  getAppBaseUrl,
} from "@/lib/gdrive/client";

export const dynamic = "force-dynamic";

function inferCallbackErrorReason(err: unknown) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "");

  if (/invalid[_-]?grant|revoked|reauth|expired/i.test(message)) {
    return "reauth_required";
  }

  return "token_exchange";
}

/** GET /api/auth/gdrive/callback — Google OAuth callback */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = getAppBaseUrl({
    requestUrl: req.url,
    headers: req.headers,
  });

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=${errorParam ?? "missing_params"}`);
  }

  const userId = parseGDriveState(state);
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, {
      requestUrl: req.url,
      headers: req.headers,
    });
    await saveUserTokens(
      userId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt,
      tokens.scope,
    );
    return NextResponse.redirect(`${appUrl}/materials?gdrive=connected`);
  } catch (err) {
    console.error("GDrive callback error:", err);
    const reason = inferCallbackErrorReason(err);
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=${reason}`);
  }
}
