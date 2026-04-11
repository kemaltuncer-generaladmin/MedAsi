import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/community/guards";
import { assignCommunityRole, listRoleAssignments } from "@/lib/community/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const roles = await listRoleAssignments();
  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;

  const body = await request.json();
  const role = await assignCommunityRole(auth.user.id, {
    userId: body.userId,
    role: body.role,
    universityId: body.universityId,
    programId: body.programId,
    termId: body.termId,
    courseId: body.courseId,
    spaceId: body.spaceId,
    expiresAt: body.expiresAt,
  });

  return NextResponse.json({ role }, { status: 201 });
}
