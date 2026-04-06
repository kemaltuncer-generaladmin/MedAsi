import type { PackageName } from '@/types'

export const PACKAGES: Record<PackageName, { label: string; dailyAiLimit: number; price: number }> = {
  student: {
    label: 'Öğrenci',
    dailyAiLimit: 10,
    price: 0,
  },
  clinic_pro: {
    label: 'Klinik Pro',
    dailyAiLimit: -1,
    price: 299,
  },
  enterprise: {
    label: 'Kurumsal',
    dailyAiLimit: -1,
    price: 999,
  },
}
