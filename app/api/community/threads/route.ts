import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { createCommunityThread } from "@/lib/community/service";

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const thread = await createCommunityThread(auth.user.id, {
    spaceId: body.spaceId,
    title: body.title,
    description: body.description,
    contentType: body.contentType ?? "discussion",
    visibilityScope: body.visibilityScope,
    tags: Array.isArray(body.tags) ? body.tags : [],
    containsSpoiler: body.containsSpoiler === true,
    attachedMaterialId: body.attachedMaterialId,
    initialPostBody: body.initialPostBody,
  });

  return NextResponse.json({ thread }, { status: 201 });
}
