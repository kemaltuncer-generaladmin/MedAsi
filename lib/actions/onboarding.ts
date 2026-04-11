"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { upsertUserAcademicProfile } from "@/lib/community/service";

export async function completeOnboarding(data: {
  studyLevel: string;
  goals: string[];
  weeklyStudyHours: string;
  preferredStudyTime: string;
  tusExamDate?: string;
  communicationStyle?: string;
  universityId?: string;
  programId?: string;
  termId?: string;
  specialty?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Oturum doğrulanamadı" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        goals: data.goals,
        interests: [data.studyLevel],
        notificationPrefs: {
          weeklyStudyHours: data.weeklyStudyHours,
          preferredStudyTime: data.preferredStudyTime,
          tusExamDate: data.tusExamDate ?? null,
          studyLevel: data.studyLevel,
          communicationStyle: data.communicationStyle ?? "friendly",
        },
      },
    });

    if (data.universityId || data.programId || data.termId || data.specialty) {
      await upsertUserAcademicProfile(user.id, {
        universityId: data.universityId ?? null,
        programId: data.programId ?? null,
        termId: data.termId ?? null,
        specialty: data.specialty ?? null,
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: "Bağlantı hatası, lütfen tekrar dene" };
  }
}
