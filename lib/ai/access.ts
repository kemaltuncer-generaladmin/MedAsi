import type { CheckLimitResult } from "@/lib/ai/check-limit";

type LimitReason = Exclude<CheckLimitResult, { canProceed: true }>["reason"];

const REASON_MESSAGE_MAP: Record<LimitReason, string> = {
  limit_exceeded: "AI kullanım limitiniz doldu. Paket kotanız şu anda yeterli değil.",
  no_package: "Bu hesap için aktif bir paket bulunmuyor.",
  org_inactive: "Bağlı olduğunuz organizasyon aktif değil veya süresi dolmuş.",
  budget_exceeded: "Kurumsal AI bütçesi doldu.",
  insufficient_tokens: "Yeterli token bakiyeniz yok.",
  package_blocked: "Paketiniz bu modüle erişim sağlamıyor.",
};

export function getAiRefusalMessage(reason: LimitReason): string {
  return REASON_MESSAGE_MAP[reason] ?? "AI isteği şu anda işlenemiyor.";
}
