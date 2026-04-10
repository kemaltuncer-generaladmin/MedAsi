import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

type SupabaseUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type CurrentUserDbSnapshot = {
  id: string;
  role: string;
  packageId: string | null;
  createdAt: Date;
  onboardingCompleted: boolean;
  package: { id: string; name: string; dailyAiLimit: number; price: number } | null;
} | null;

export const getCurrentUserContext = cache(async (): Promise<{
  user: SupabaseUser | null;
  role: string | null;
  dbUser: CurrentUserDbSnapshot;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, role: null, dbUser: null };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      packageId: true,
      createdAt: true,
      onboardingCompleted: true,
      package: { select: { id: true, name: true, dailyAiLimit: true, price: true } },
    },
  });

  return {
    user,
    role: dbUser?.role ?? null,
    dbUser,
  };
});

export async function getCurrentUserWithRole(): Promise<{
  user: SupabaseUser | null;
  role: string | null;
}> {
  const { user, role } = await getCurrentUserContext();
  return {
    user,
    role,
  };
}
