export type DriveMissingConfigDetail = {
  key: string;
  label: string;
  description: string;
};

const DRIVE_CONFIG_DETAIL_MAP: Record<string, DriveMissingConfigDetail> = {
  "GOOGLE_DRIVE_CLIENT_ID|GOOGLE_CLIENT_ID": {
    key: "GOOGLE_DRIVE_CLIENT_ID|GOOGLE_CLIENT_ID",
    label: "Drive OAuth Client ID",
    description: "Google OAuth uygulamasının Client ID değeri eksik.",
  },
  "GOOGLE_DRIVE_CLIENT_SECRET|GOOGLE_CLIENT_SECRET": {
    key: "GOOGLE_DRIVE_CLIENT_SECRET|GOOGLE_CLIENT_SECRET",
    label: "Drive OAuth Client Secret",
    description: "Google OAuth uygulamasının Client Secret değeri eksik.",
  },
  GOOGLE_DRIVE_STATE_SECRET: {
    key: "GOOGLE_DRIVE_STATE_SECRET",
    label: "Drive State Secret",
    description: "CSRF koruması için en az 32 karakterlik state secret gerekli.",
  },
  NEXT_PUBLIC_SITE_URL_OR_NEXT_PUBLIC_APP_URL_OR_REQUEST_ORIGIN: {
    key: "NEXT_PUBLIC_SITE_URL_OR_NEXT_PUBLIC_APP_URL_OR_REQUEST_ORIGIN",
    label: "Uygulama Base URL",
    description: "OAuth callback origin için uygulama URL bilgisi bulunamıyor.",
  },
  GOOGLE_DRIVE_REDIRECT_URI: {
    key: "GOOGLE_DRIVE_REDIRECT_URI",
    label: "Drive Redirect URI",
    description: "Google OAuth callback URL değeri eksik veya geçersiz.",
  },
  GOOGLE_DRIVE_REDIRECT_URI_ORIGIN_MISMATCH: {
    key: "GOOGLE_DRIVE_REDIRECT_URI_ORIGIN_MISMATCH",
    label: "Redirect Origin Uyuşmazlığı",
    description: "Redirect URI origin ile uygulama origin aynı değil.",
  },
};

export function describeDriveMissingConfig(missingConfig: string[]): DriveMissingConfigDetail[] {
  const unique = Array.from(new Set(missingConfig));
  return unique.map((key) => {
    const known = DRIVE_CONFIG_DETAIL_MAP[key];
    if (known) return known;
    return {
      key,
      label: key,
      description: "Eksik veya geçersiz konfigürasyon alanı.",
    };
  });
}

export function formatDriveMissingConfigLabel(missingConfig: string[]): string {
  const details = describeDriveMissingConfig(missingConfig);
  if (details.length === 0) return "Drive OAuth env değişkenleri";
  return details.map((item) => item.label).join(", ");
}

export function getDriveConfigMissingMessage(missingConfig: string[]): string {
  return `Google Drive OAuth yapılandırması eksik: ${formatDriveMissingConfigLabel(missingConfig)}`;
}
