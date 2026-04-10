"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(data: {
  studyLevel: string;
  goals: string[];
  weeklyStudyHours: string;
  preferredStudyTime: string;
  tusExamDate?: string;
  communicationStyle?: string;
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

    return { success: true };
  } catch {
    return { success: false, error: "Bağlantı hatası, lütfen tekrar dene" };
  }
}
