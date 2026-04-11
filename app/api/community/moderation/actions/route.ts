import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { performModerationAction } from "@/lib/community/service";

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const action = await performModerationAction(auth.user.id, {
    targetType: body.targetType,
    targetId: body.targetId,
    actionType: body.actionType,
    targetUserId: body.targetUserId,
    reason: body.reason,
  });

  return NextResponse.json({ action }, { status: 201 });
}
