import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { createCommunityPost } from "@/lib/community/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const post = await createCommunityPost(auth.user.id, id, {
    body: body.body,
    quotedPostId: body.quotedPostId,
    markAsBestAnswer: body.markAsBestAnswer === true,
  });

  return NextResponse.json({ post }, { status: 201 });
}
