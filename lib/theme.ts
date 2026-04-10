export const SYSTEM_KEY = "medasi_system_prefs_v1";

export type ThemeOption =
  | "dark"
  | "light"
  | "night_blue"
  | "cream_contrast"
  | "system";

type ResolvedTheme = "dark" | "light" | "night_blue" | "cream_contrast";

const RESOLVED_THEMES: readonly ResolvedTheme[] = [
  "dark",
  "light",
  "night_blue",
  "cream_contrast",
];

function isResolvedTheme(value: unknown): value is ResolvedTheme {
  return typeof value === "string" && RESOLVED_THEMES.includes(value as ResolvedTheme);
}

export function resolveTheme(theme: ThemeOption): ResolvedTheme {
  if (
    theme === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }

  if (isResolvedTheme(theme)) {
    return theme;
  }

  return "dark";
}

export function readStoredTheme(): ThemeOption {
  if (typeof window === "undefined") return "dark";

  try {
    const raw = window.localStorage.getItem(SYSTEM_KEY);
    if (!raw) return "dark";
    const parsed = JSON.parse(raw) as { theme?: ThemeOption };
    return parsed.theme && (isResolvedTheme(parsed.theme) || parsed.theme === "system")
      ? parsed.theme
      : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: ThemeOption) {
  if (typeof document === "undefined") return;

  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme =
    resolved === "light" || resolved === "cream_contrast" ? "light" : "dark";
}

export const themeBootScript = `(() => {
  const storageKey = "${SYSTEM_KEY}";
  const defaultTheme = "dark";
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const theme = parsed?.theme ?? defaultTheme;
    const resolved =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : (["dark","light","night_blue","cream_contrast"].includes(theme) ? theme : defaultTheme);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved === "cream_contrast" ? "light" : (resolved === "light" ? "light" : "dark");
  } catch {
    document.documentElement.dataset.theme = defaultTheme;
    document.documentElement.style.colorScheme = defaultTheme;
  }
})();`;
