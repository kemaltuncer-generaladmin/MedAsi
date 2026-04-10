export type GeminiErrorReason =
  | "missing_key"
  | "invalid_key"
  | "referrer_blocked"
  | "quota_or_billing"
  | "model_access_denied"
  | "upstream_error";

export class GeminiIntegrationError extends Error {
  reason: GeminiErrorReason;
  status: number;

  constructor(reason: GeminiErrorReason, message: string, status = 500) {
    super(message);
    this.name = "GeminiIntegrationError";
    this.reason = reason;
    this.status = status;
  }
}

function detectReason(raw: string): GeminiErrorReason {
  const text = raw.toLowerCase();
  if (text.includes("gemini_api_key") || text.includes("missing_key") || text.includes("api key") && text.includes("missing")) {
    return "missing_key";
  }
  if (text.includes("api_key_http_referrer_blocked") || text.includes("referer") || text.includes("referrer")) {
    return "referrer_blocked";
  }
  if (
    text.includes("invalid api key") ||
    text.includes("api key not valid") ||
    text.includes("apikeyinvalid") ||
    text.includes("unauthenticated")
  ) {
    return "invalid_key";
  }
  if (
    text.includes("quota") ||
    text.includes("billing") ||
    text.includes("resource_exhausted") ||
    text.includes("insufficient_quota")
  ) {
    return "quota_or_billing";
  }
  if (
    text.includes("permission_denied") ||
    text.includes("model not found") ||
    text.includes("not found for api version") ||
    text.includes("not allowed")
  ) {
    return "model_access_denied";
  }
  return "upstream_error";
}

export function isGeminiErrorLike(error: unknown): boolean {
  if (error instanceof GeminiIntegrationError) return true;
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const text = rawMessage.toLowerCase();
  return (
    text.includes("gemini") ||
    text.includes("generativelanguage.googleapis.com") ||
    text.includes("googlegenerativeai") ||
    text.includes("api key") ||
    text.includes("resource_exhausted") ||
    text.includes("permission_denied") ||
    text.includes("model not found")
  );
}

function statusFromReason(reason: GeminiErrorReason): number {
  switch (reason) {
    case "missing_key":
      return 503;
    case "invalid_key":
    case "referrer_blocked":
    case "model_access_denied":
      return 502;
    case "quota_or_billing":
      return 429;
    case "upstream_error":
    default:
      return 502;
  }
}

function userMessage(reason: GeminiErrorReason): string {
  switch (reason) {
    case "missing_key":
      return "Gemini yapılandırması eksik. GEMINI_KEY_* veya global fallback key tanımlanmalı.";
    case "invalid_key":
      return "Gemini anahtarı geçersiz veya kullanım yetkisi yok.";
    case "referrer_blocked":
      return "Gemini anahtarı HTTP referrer kısıtlı. Server-side key gerekli.";
    case "quota_or_billing":
      return "Gemini kota veya faturalandırma limiti aşıldı.";
    case "model_access_denied":
      return "Gemini model erişimi reddedildi.";
    case "upstream_error":
    default:
      return "Gemini servisine erişilirken hata oluştu.";
  }
}

export function normalizeGeminiError(error: unknown): GeminiIntegrationError {
  if (error instanceof GeminiIntegrationError) return error;
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const reason = detectReason(rawMessage);
  return new GeminiIntegrationError(reason, userMessage(reason), statusFromReason(reason));
}

export function geminiErrorToResponsePayload(error: unknown): {
  reason: GeminiErrorReason;
  message: string;
  status: number;
} {
  const normalized = normalizeGeminiError(error);
  return {
    reason: normalized.reason,
    message: normalized.message,
    status: normalized.status,
  };
}
