import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { createCommunityResource } from "@/lib/community/service";

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const resource = await createCommunityResource(auth.user.id, {
    title: body.title,
    description: body.description,
    resourceType: body.resourceType,
    visibilityScope: body.visibilityScope,
    url: body.url,
    filePath: body.filePath,
    linkedMaterialId: body.linkedMaterialId,
    spaceId: body.spaceId,
    universityId: body.universityId,
    programId: body.programId,
    termId: body.termId,
    courseId: body.courseId,
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  return NextResponse.json({ resource }, { status: 201 });
}
