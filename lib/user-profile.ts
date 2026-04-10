type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

function hasStructuredValue(value: JsonLike | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => hasStructuredValue(item));
  return Object.values(value).some((item) => hasStructuredValue(item));
}

export function isUserProfileComplete(input: {
  name?: string | null;
  goals?: JsonLike | null;
  interests?: JsonLike | null;
}): boolean {
  const hasName = typeof input.name === "string" && input.name.trim().length >= 2;
  return hasName && (hasStructuredValue(input.goals ?? null) || hasStructuredValue(input.interests ?? null));
}

