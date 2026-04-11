import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/community/guards";
import { createTaxonomyItem, getCommunityTaxonomy } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const taxonomy = await getCommunityTaxonomy();
  return NextResponse.json(taxonomy);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { entity } = await params;
  const item = await createTaxonomyItem(entity, body);
  return NextResponse.json({ item }, { status: 201 });
}
