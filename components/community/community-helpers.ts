export const CONTENT_TYPE_META: Record<
  string,
  { label: string; tone: "default" | "secondary" | "warning" | "success" | "outline" }
> = {
  discussion: { label: "Tartisma", tone: "default" },
  question: { label: "Soru-Cevap", tone: "warning" },
  resource: { label: "Kaynak", tone: "success" },
  poll: { label: "Anket", tone: "secondary" },
  study_call: { label: "Calisma Cagrisi", tone: "outline" },
  announcement: { label: "Duyuru", tone: "secondary" },
};

export const CONTENT_TYPE_OPTIONS = [
  { value: "", label: "Tum tipler" },
  { value: "discussion", label: "Tartisma" },
  { value: "question", label: "Soru-Cevap" },
  { value: "resource", label: "Kaynak" },
  { value: "poll", label: "Anket" },
  { value: "study_call", label: "Calisma Cagrisi" },
  { value: "announcement", label: "Duyuru" },
];

export const SPACE_TYPE_META: Record<string, string> = {
  global: "Merkez",
  campus: "Kampus",
  term: "Donem",
  course: "Ders",
  private: "Ozel Alan",
};

export function getContentTypeLabel(value?: string | null) {
  if (!value) return "Icerik";
  return CONTENT_TYPE_META[value]?.label ?? value;
}

export function getContentTypeTone(value?: string | null) {
  if (!value) return "secondary";
  return CONTENT_TYPE_META[value]?.tone ?? "secondary";
}

export function getSpaceTypeLabel(value?: string | null) {
  if (!value) return "Alan";
  return SPACE_TYPE_META[value] ?? value;
}

export function formatCommunityDate(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | Date) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);

  const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });
  const absMin = Math.abs(diffMin);

  if (absMin < 60) return rtf.format(diffMin, "minute");

  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");

  const diffDay = Math.round(diffHour / 24);
  return rtf.format(diffDay, "day");
}

export function getInitials(value?: string | null) {
  const text = value?.trim();
  if (!text) return "MD";

  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "MD";
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
