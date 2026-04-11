import type { AIModel } from "@/types";

export const AI_MODEL_MAP: Record<AIModel, string> = {
  FAST: "gemini-2.5-pro",
  EFFICIENT: "gemini-2.5-flash",
};

export const AI_ERROR_MESSAGES = {
  LIMIT_EXCEEDED: "Günlük AI kullanım limitinize ulaştınız.",
  UNAUTHORIZED: "Bu modüle erişim yetkiniz yok.",
  GENERIC: "Bir hata oluştu, lütfen tekrar deneyin.",
} as const;
