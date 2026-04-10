export const AI_LIMITS = {
  MAX_USER_MESSAGE_CHARS: 2_400,
  MAX_HISTORY_ITEMS: 4,
  MAX_HISTORY_ITEM_CHARS: 700,
  MAX_SYSTEM_CONTEXT_CHARS: 6_000,
  MAX_RAG_CONTEXT_CHARS: 1_600,
  DEFAULT_OUTPUT_TOKENS: 384,
  MAX_OUTPUT_TOKENS_HARD_CAP: 1_024,
} as const;

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export function compactText(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncateText(value: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}...`;
}

export function sanitizeUserMessage(
  value: unknown,
  maxChars: number = AI_LIMITS.MAX_USER_MESSAGE_CHARS,
): string {
  if (typeof value !== "string") return "";
  return truncateText(compactText(value), maxChars);
}

export function sanitizeContextText(
  value: unknown,
  maxChars: number = AI_LIMITS.MAX_SYSTEM_CONTEXT_CHARS,
): string {
  if (typeof value !== "string") return "";
  return truncateText(compactText(value), maxChars);
}

export function sanitizeHistory(
  history: unknown,
  maxItems: number = AI_LIMITS.MAX_HISTORY_ITEMS,
  maxItemChars: number = AI_LIMITS.MAX_HISTORY_ITEM_CHARS,
): ChatHistoryItem[] {
  if (!Array.isArray(history)) return [];
  const finalMaxItems = Math.min(Math.max(maxItems, 0), AI_LIMITS.MAX_HISTORY_ITEMS);

  return history
    .slice(-finalMaxItems)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
      if (!role || typeof row.content !== "string") return null;
      return {
        role,
        content: truncateText(compactText(row.content), maxItemChars),
      };
    })
    .filter((item): item is ChatHistoryItem => item !== null && item.content.length > 0);
}

export function clampOutputTokens(
  value: unknown,
  fallback: number = AI_LIMITS.DEFAULT_OUTPUT_TOKENS,
  cap: number = AI_LIMITS.MAX_OUTPUT_TOKENS_HARD_CAP,
): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(128, Math.min(parsed, cap));
}
