import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { getCommunityTaxonomy } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const taxonomy = await getCommunityTaxonomy();
  return NextResponse.json(taxonomy);
}
