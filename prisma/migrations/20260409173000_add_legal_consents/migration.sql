ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "privacy_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "medical_consent_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "legal_consent_version" TEXT,
  ADD COLUMN IF NOT EXISTS "legal_consent_ip" TEXT,
  ADD COLUMN IF NOT EXISTS "legal_consent_user_agent" TEXT;
