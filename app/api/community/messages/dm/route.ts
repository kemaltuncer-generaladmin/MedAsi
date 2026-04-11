import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { sendDirectMessage } from "@/lib/community/service";

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const message = await sendDirectMessage(auth.user.id, {
    targetUserId: body.targetUserId,
    body: body.body,
  });

  return NextResponse.json({ message }, { status: 201 });
}
