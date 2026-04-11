import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { getSpaceDetails } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const space = await getSpaceDetails(slug, auth.user.id);
  if (!space) {
    return NextResponse.json({ error: "Alan bulunamadi" }, { status: 404 });
  }

  return NextResponse.json(space);
}
