import { z } from "zod";

export const onboardingSchema = z.object({
  goals: z.array(z.string()).min(1, "En az bir hedef seçmelisin"),
  interests: z.array(z.string()).default([]),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  profile: z
    .object({
      displayName: z.string().optional(),
      university: z.string().optional(),
      universityId: z.string().optional(),
      programId: z.string().optional(),
      termId: z.string().optional(),
      level: z.string().optional(),
      expectedGradYear: z.string().optional(),
      dailyStudyHours: z.number().min(0).max(24).optional(),
      preferredStudyTime: z.string().optional(),
      learningStyle: z.string().optional(),
      dailyQuestionTarget: z.number().min(0).optional(),
      dailyFlashcardTarget: z.number().min(0).optional(),
      subjectLevels: z.record(z.string()).optional(),
      tusTargetDate: z.string().optional(),
      tusTargetScore: z.number().nullable().optional(),
    })
    .optional(),
});

export type OnboardingSchema = z.infer<typeof onboardingSchema>;
