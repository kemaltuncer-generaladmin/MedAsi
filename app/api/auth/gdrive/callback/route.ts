import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  saveUserTokens,
  parseGDriveState,
  getAppBaseUrl,
} from "@/lib/gdrive/client";

export const dynamic = "force-dynamic";

/** GET /api/auth/gdrive/callback — Google OAuth callback */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = getAppBaseUrl();

  if (errorParam || !code || !state) {
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=${errorParam ?? "missing_params"}`);
  }

  const userId = parseGDriveState(state);
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
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
    return NextResponse.redirect(`${appUrl}/materials?gdrive=error&reason=token_exchange`);
  }
}
