import { getSystemSettingsFromDb } from "@/lib/system-settings";

const TRY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

export function convertUsdToTry(amountUsd: number, usdTryRate: number): number {
  return amountUsd * usdTryRate;
}

export function convertTryToUsd(amountTry: number, usdTryRate: number): number {
  if (!usdTryRate) return 0;
  return amountTry / usdTryRate;
}

export function formatTry(amountTry: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits,
  }).format(amountTry);
}

export function formatUsd(amountUsd: number, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(amountUsd);
}

export async function getCurrencySettings() {
  const settings = await getSystemSettingsFromDb();
  return {
    usdTryRate: settings.usdTryRate,
    formatTryFromUsd(amountUsd: number, maximumFractionDigits = 2) {
      return formatTry(convertUsdToTry(amountUsd, settings.usdTryRate), maximumFractionDigits);
    },
  };
}

export const formatTryCompact = (amountTry: number) => TRY_FORMATTER.format(amountTry);
