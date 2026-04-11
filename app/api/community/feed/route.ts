import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { getCommunityFeed } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);

  const feed = await getCommunityFeed(auth.user.id, {
    universityId: searchParams.get("universityId"),
    programId: searchParams.get("programId"),
    termId: searchParams.get("termId"),
    courseId: searchParams.get("courseId"),
    contentType: searchParams.get("contentType"),
    visibilityScope: searchParams.get("visibilityScope"),
    q: searchParams.get("q"),
  });

  return NextResponse.json(feed);
}
