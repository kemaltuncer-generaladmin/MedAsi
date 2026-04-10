export type NormalizedPackageTier =
  | "ucretsiz"
  | "giris"
  | "pro"
  | "kurumsal";

export const PACKAGES: Record<
  NormalizedPackageTier,
  { label: string; dailyAiLimit: number; price: number }
> = {
  ucretsiz: {
    label: "Ücretsiz",
    dailyAiLimit: 25,
    price: 0,
  },
  giris: {
    label: "Giriş",
    dailyAiLimit: 100,
    price: 149,
  },
  pro: {
    label: "Pro",
    dailyAiLimit: 400,
    price: 399,
  },
  kurumsal: {
    label: "Kurumsal",
    dailyAiLimit: 2000,
    price: 1299,
  },
};
