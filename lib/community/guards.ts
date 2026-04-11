import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/current-user-role";

export async function requireSignedInUser() {
  const { user, role, dbUser } = await getCurrentUserContext();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      role: null,
      dbUser: null,
    };
  }

  return { user, role, dbUser, error: null };
}

export async function requireAdminUser() {
  const context = await requireSignedInUser();
  if (context.error) return context;
  if (context.role !== "admin") {
    return {
      ...context,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return context;
}
