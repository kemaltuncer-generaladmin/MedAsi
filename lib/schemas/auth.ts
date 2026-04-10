import { z } from "zod";

export const SENIORITY_OPTIONS = [
  "1. Sınıf - Temel Tıp",
  "2. Sınıf - Temel Tıp",
  "3. Sınıf - Temel Tıp",
  "4. Sınıf - Klinik Dönem",
  "5. Sınıf - Klinik Dönem",
  "6. Sınıf - Klinik Dönem",
  "TUS Hazırlık",
] as const;

export const PACKAGE_SELECTION_OPTIONS = [
  "ucretsiz",
  "giris",
  "pro",
  "enterprise",
] as const;

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

const requiredConsentField = (message: string) =>
  z.preprocess(
    (value) => value === true || value === "true" || value === "on" || value === "1",
    z.literal(true, {
      errorMap: () => ({ message }),
    }),
  );

export const registerSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir email girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  selectedPackage: z.enum(PACKAGE_SELECTION_OPTIONS, {
    errorMap: () => ({
      message: "Lütfen bir paket seçin.",
    }),
  }),
  seniority: z.enum(SENIORITY_OPTIONS, {
    errorMap: () => ({
      message:
        "Lütfen yalnızca 1-6. sınıf, klinik dönem veya TUS hazırlık seçeneklerinden birini seçin.",
    }),
  }),
  couponCode: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .optional()
    .or(z.literal("")),
  termsAccepted: requiredConsentField("Kullanım şartlarını kabul etmelisiniz."),
  privacyAccepted: requiredConsentField("Gizlilik politikasını kabul etmelisiniz."),
  medicalDataConsentAccepted: requiredConsentField(
    "Sağlık/hasta verisi işleme aydınlatmasını kabul etmelisiniz.",
  ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
