'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { ProfileData } from '@/stores/onboarding'

export async function completeOnboarding(data: {
  goals: string[]
  interests: string[]
  notifications: { email: boolean; push: boolean; sms: boolean }
  profile?: Partial<ProfileData>
}) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Oturum doğrulanamadı' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        goals: data.goals,
        interests: data.interests,
        notificationPrefs: {
          ...data.notifications,
          ...(data.profile ? { _profile: data.profile } : {}),
        },
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Bağlantı hatası, lütfen tekrar dene' }
  }
}
