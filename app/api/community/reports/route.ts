import { NextRequest, NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/community/guards";
import { createCommunityReport } from "@/lib/community/service";

export async function POST(request: NextRequest) {
  const auth = await requireSignedInUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const report = await createCommunityReport(auth.user.id, {
    reasonId: body.reasonId,
    targetType: body.targetType,
    targetId: body.targetId,
    details: body.details,
  });

  return NextResponse.json({ report }, { status: 201 });
}
