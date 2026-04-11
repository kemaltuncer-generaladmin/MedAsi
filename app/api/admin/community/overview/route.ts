import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/community/guards";
import { getAdminCommunityOverview } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const overview = await getAdminCommunityOverview();
  return NextResponse.json(overview);
}
