import type { AIModel } from '@/types'

export const AI_MODEL_MAP: Record<AIModel, string> = {
  FAST: 'claude-3-5-sonnet-20241022',
  EFFICIENT: 'claude-3-5-haiku-20241022',
}

export const AI_ERROR_MESSAGES = {
  LIMIT_EXCEEDED: 'Günlük AI kullanım limitinize ulaştınız.',
  UNAUTHORIZED: 'Bu modüle erişim yetkiniz yok.',
  GENERIC: 'Bir hata oluştu, lütfen tekrar deneyin.',
} as const
