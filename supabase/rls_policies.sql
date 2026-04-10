-- ============================================================
-- MEDASI — ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ============================================================
-- Çalıştırma ortamı: Supabase SQL Editor (service_role veya postgres)
-- Strateji:
--   • auth.uid()  → oturum açmış kullanıcının UUID'si
--   • is_admin()  → JWT user_metadata.role = 'admin' ise true
--   • Prisma / server-side kodlar service_role key ile çalışır → RLS bypass
--   • Bu politikalar yalnızca anon/authenticated key ile yapılan
--     doğrudan Supabase client çağrılarını korur
-- ============================================================

-- ── Yardımcı fonksiyon: admin kontrolü ────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- ── Yardımcı fonksiyon: org_admin kontrolü ───────────────────────────────
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'org_admin'),
    false
  )
$$;


-- ============================================================
-- 1. USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own"   ON users;
DROP POLICY IF EXISTS "users_update_own"   ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_all_admin"    ON users;

-- Kullanıcı kendi satırını okuyabilir
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = auth.uid()::text);

-- Kullanıcı kendi satırını güncelleyebilir
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- Admin tüm kullanıcıları yönetebilir
CREATE POLICY "users_all_admin"
  ON users FOR ALL
  USING (is_admin());


-- ============================================================
-- 2. PACKAGES (lookup — herkese okunabilir)
-- ============================================================
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_select_all" ON packages;
DROP POLICY IF EXISTS "packages_all_admin"  ON packages;

CREATE POLICY "packages_select_all"
  ON packages FOR SELECT
  USING (true);

CREATE POLICY "packages_all_admin"
  ON packages FOR ALL
  USING (is_admin());


-- ============================================================
-- 3. COUPON_CODES (yalnızca admin)
-- ============================================================
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupon_codes_all_admin" ON coupon_codes;

CREATE POLICY "coupon_codes_all_admin"
  ON coupon_codes FOR ALL
  USING (is_admin());


-- ============================================================
-- 4. MODULES (lookup — herkese okunabilir)
-- ============================================================
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_select_all" ON modules;
DROP POLICY IF EXISTS "modules_all_admin"  ON modules;

CREATE POLICY "modules_select_all"
  ON modules FOR SELECT
  USING (true);

CREATE POLICY "modules_all_admin"
  ON modules FOR ALL
  USING (is_admin());


-- ============================================================
-- 5. USER_MODULES
-- ============================================================
ALTER TABLE user_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_modules_select_own" ON user_modules;
DROP POLICY IF EXISTS "user_modules_all_admin"  ON user_modules;

CREATE POLICY "user_modules_select_own"
  ON user_modules FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "user_modules_all_admin"
  ON user_modules FOR ALL
  USING (is_admin());


-- ============================================================
-- 6. PACKAGE_MODULES (lookup — herkese okunabilir)
-- ============================================================
ALTER TABLE package_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "package_modules_select_all" ON package_modules;
DROP POLICY IF EXISTS "package_modules_all_admin"  ON package_modules;

CREATE POLICY "package_modules_select_all"
  ON package_modules FOR SELECT
  USING (true);

CREATE POLICY "package_modules_all_admin"
  ON package_modules FOR ALL
  USING (is_admin());


-- ============================================================
-- 7. PATIENTS
-- ============================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_own"       ON patients;
DROP POLICY IF EXISTS "patients_all_admin" ON patients;

CREATE POLICY "patients_own"
  ON patients FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "patients_all_admin"
  ON patients FOR ALL
  USING (is_admin());


-- ============================================================
-- 8. CASES
-- ============================================================
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_own"       ON cases;
DROP POLICY IF EXISTS "cases_all_admin" ON cases;

CREATE POLICY "cases_own"
  ON cases FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "cases_all_admin"
  ON cases FOR ALL
  USING (is_admin());


-- ============================================================
-- 9. SESSIONS (AI session logs)
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
DROP POLICY IF EXISTS "sessions_all_admin"  ON sessions;

-- Kullanıcı kendi session'larını okuyabilir (yazma service_role'den)
CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "sessions_all_admin"
  ON sessions FOR ALL
  USING (is_admin());


-- ============================================================
-- 10. NOTES
-- ============================================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_own"       ON notes;
DROP POLICY IF EXISTS "notes_all_admin" ON notes;

CREATE POLICY "notes_own"
  ON notes FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "notes_all_admin"
  ON notes FOR ALL
  USING (is_admin());


-- ============================================================
-- 11. POMODORO_LOGS
-- ============================================================
ALTER TABLE pomodoro_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pomodoro_logs_own"       ON pomodoro_logs;
DROP POLICY IF EXISTS "pomodoro_logs_all_admin" ON pomodoro_logs;

CREATE POLICY "pomodoro_logs_own"
  ON pomodoro_logs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "pomodoro_logs_all_admin"
  ON pomodoro_logs FOR ALL
  USING (is_admin());


-- ============================================================
-- 12. RESEARCH_ORGANIZATIONS
-- ============================================================
ALTER TABLE research_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_member"    ON research_organizations;
DROP POLICY IF EXISTS "orgs_select_own_admin" ON research_organizations;
DROP POLICY IF EXISTS "orgs_all_super_admin"  ON research_organizations;

-- Org üyeleri kendi organizasyonlarını görebilir
CREATE POLICY "orgs_select_member"
  ON research_organizations FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
    OR admin_user_id = auth.uid()::text
  );

-- Super admin her şeyi yönetebilir
CREATE POLICY "orgs_all_super_admin"
  ON research_organizations FOR ALL
  USING (is_admin());


-- ============================================================
-- 13. ORG_MEMBERS
-- ============================================================
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_own"    ON org_members;
DROP POLICY IF EXISTS "org_members_select_orgadm" ON org_members;
DROP POLICY IF EXISTS "org_members_all_admin"     ON org_members;

-- Kullanıcı kendi üyeliğini görebilir
CREATE POLICY "org_members_select_own"
  ON org_members FOR SELECT
  USING (user_id = auth.uid()::text);

-- Org admin kendi organizasyonunun üyelerini yönetebilir
CREATE POLICY "org_members_select_orgadm"
  ON org_members FOR ALL
  USING (
    org_id IN (
      SELECT id FROM research_organizations
      WHERE admin_user_id = auth.uid()::text
    )
  );

CREATE POLICY "org_members_all_admin"
  ON org_members FOR ALL
  USING (is_admin());


-- ============================================================
-- 14. ORG_MODULES
-- ============================================================
ALTER TABLE org_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_modules_select_member" ON org_modules;
DROP POLICY IF EXISTS "org_modules_all_admin"     ON org_modules;

CREATE POLICY "org_modules_select_member"
  ON org_modules FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

CREATE POLICY "org_modules_all_admin"
  ON org_modules FOR ALL
  USING (is_admin());


-- ============================================================
-- 15. ORG_AI_USAGE
-- ============================================================
ALTER TABLE org_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_ai_usage_select_own"    ON org_ai_usage;
DROP POLICY IF EXISTS "org_ai_usage_select_orgadm" ON org_ai_usage;
DROP POLICY IF EXISTS "org_ai_usage_all_admin"     ON org_ai_usage;

CREATE POLICY "org_ai_usage_select_own"
  ON org_ai_usage FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "org_ai_usage_select_orgadm"
  ON org_ai_usage FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM research_organizations
      WHERE admin_user_id = auth.uid()::text
    )
  );

CREATE POLICY "org_ai_usage_all_admin"
  ON org_ai_usage FOR ALL
  USING (is_admin());


-- ============================================================
-- 16. ORG_INVITATIONS
-- ============================================================
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_invitations_orgadm"  ON org_invitations;
DROP POLICY IF EXISTS "org_invitations_by_token" ON org_invitations;
DROP POLICY IF EXISTS "org_invitations_admin"   ON org_invitations;

-- Org admin kendi davetlerini yönetebilir
CREATE POLICY "org_invitations_orgadm"
  ON org_invitations FOR ALL
  USING (
    org_id IN (
      SELECT id FROM research_organizations
      WHERE admin_user_id = auth.uid()::text
    )
  );

-- Herkes token ile davet okuyabilir (kayıt akışı için)
CREATE POLICY "org_invitations_by_token"
  ON org_invitations FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());

CREATE POLICY "org_invitations_admin"
  ON org_invitations FOR ALL
  USING (is_admin());


-- ============================================================
-- 17. MODEL_PRICING (lookup — herkese okunabilir)
-- ============================================================
ALTER TABLE model_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "model_pricing_select_all" ON model_pricing;
DROP POLICY IF EXISTS "model_pricing_all_admin"  ON model_pricing;

CREATE POLICY "model_pricing_select_all"
  ON model_pricing FOR SELECT
  USING (true);

CREATE POLICY "model_pricing_all_admin"
  ON model_pricing FOR ALL
  USING (is_admin());


-- ============================================================
-- 18. DOCUMENT_CHUNKS (global RAG — sadece admin yazar)
-- ============================================================
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_chunks_select_auth" ON document_chunks;
DROP POLICY IF EXISTS "document_chunks_all_admin"   ON document_chunks;

-- Oturum açmış tüm kullanıcılar okuyabilir (RAG sorguları)
CREATE POLICY "document_chunks_select_auth"
  ON document_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "document_chunks_all_admin"
  ON document_chunks FOR ALL
  USING (is_admin());


-- ============================================================
-- 19. STUDENT_LEARNING_PROFILES
-- ============================================================
ALTER TABLE student_learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slp_own"       ON student_learning_profiles;
DROP POLICY IF EXISTS "slp_all_admin" ON student_learning_profiles;

CREATE POLICY "slp_own"
  ON student_learning_profiles FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "slp_all_admin"
  ON student_learning_profiles FOR ALL
  USING (is_admin());


-- ============================================================
-- 20. DASHBOARD_PREFERENCES
-- ============================================================
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dash_prefs_own"       ON dashboard_preferences;
DROP POLICY IF EXISTS "dash_prefs_all_admin" ON dashboard_preferences;

CREATE POLICY "dash_prefs_own"
  ON dashboard_preferences FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "dash_prefs_all_admin"
  ON dashboard_preferences FOR ALL
  USING (is_admin());


-- ============================================================
-- 21. STUDY_SESSIONS
-- ============================================================
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_sessions_own"       ON study_sessions;
DROP POLICY IF EXISTS "study_sessions_all_admin" ON study_sessions;

CREATE POLICY "study_sessions_own"
  ON study_sessions FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "study_sessions_all_admin"
  ON study_sessions FOR ALL
  USING (is_admin());


-- ============================================================
-- 22. QUESTION_ATTEMPTS
-- ============================================================
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_attempts_own"       ON question_attempts;
DROP POLICY IF EXISTS "question_attempts_all_admin" ON question_attempts;

CREATE POLICY "question_attempts_own"
  ON question_attempts FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "question_attempts_all_admin"
  ON question_attempts FOR ALL
  USING (is_admin());


-- ============================================================
-- 23. TOKEN_WALLETS
-- ============================================================
ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_wallets_select_own" ON token_wallets;
DROP POLICY IF EXISTS "token_wallets_all_admin"  ON token_wallets;

-- Kullanıcı yalnızca kendi cüzdanını okuyabilir (yazma service_role'den)
CREATE POLICY "token_wallets_select_own"
  ON token_wallets FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "token_wallets_all_admin"
  ON token_wallets FOR ALL
  USING (is_admin());


-- ============================================================
-- 24. TOKEN_TRANSACTIONS
-- ============================================================
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_tx_select_own" ON token_transactions;
DROP POLICY IF EXISTS "token_tx_all_admin"  ON token_transactions;

CREATE POLICY "token_tx_select_own"
  ON token_transactions FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "token_tx_all_admin"
  ON token_transactions FOR ALL
  USING (is_admin());


-- ============================================================
-- 25. TOKEN_PACKAGES (lookup — herkese okunabilir)
-- ============================================================
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_packages_select_active" ON token_packages;
DROP POLICY IF EXISTS "token_packages_all_admin"     ON token_packages;

CREATE POLICY "token_packages_select_active"
  ON token_packages FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "token_packages_all_admin"
  ON token_packages FOR ALL
  USING (is_admin());


-- ============================================================
-- 26. SYSTEM_SETTINGS
-- ============================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select_auth" ON system_settings;
DROP POLICY IF EXISTS "system_settings_all_admin"   ON system_settings;

-- Oturum açmış kullanıcılar okuyabilir (maintenance modu vb. kontrol için)
CREATE POLICY "system_settings_select_auth"
  ON system_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "system_settings_all_admin"
  ON system_settings FOR ALL
  USING (is_admin());


-- ============================================================
-- 27. SYSTEM_LOGS
-- ============================================================
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_logs_all_admin" ON system_logs;

-- Yalnızca admin görebilir (yazma service_role'den)
CREATE POLICY "system_logs_all_admin"
  ON system_logs FOR ALL
  USING (is_admin());


-- ============================================================
-- 28. DECKS (global flashcard desteleri — auth kullanıcı okuyabilir)
-- ============================================================
ALTER TABLE "Deck" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decks_select_auth" ON "Deck";
DROP POLICY IF EXISTS "decks_all_admin"   ON "Deck";

CREATE POLICY "decks_select_auth"
  ON "Deck" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "decks_all_admin"
  ON "Deck" FOR ALL
  USING (is_admin());


-- ============================================================
-- 29. FLASHCARDS
-- ============================================================
ALTER TABLE "Flashcard" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flashcards_select_auth" ON "Flashcard";
DROP POLICY IF EXISTS "flashcards_all_admin"   ON "Flashcard";

CREATE POLICY "flashcards_select_auth"
  ON "Flashcard" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "flashcards_all_admin"
  ON "Flashcard" FOR ALL
  USING (is_admin());


-- ============================================================
-- 30. ACTIVE_PLAN (admin yönetir)
-- ============================================================
ALTER TABLE "ActivePlan" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_plan_select_auth" ON "ActivePlan";
DROP POLICY IF EXISTS "active_plan_all_admin"   ON "ActivePlan";

CREATE POLICY "active_plan_select_auth"
  ON "ActivePlan" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "active_plan_all_admin"
  ON "ActivePlan" FOR ALL
  USING (is_admin());


-- ============================================================
-- 31. USER_MATERIALS (raw SQL tablosu)
-- ============================================================
ALTER TABLE user_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_materials_own"       ON user_materials;
DROP POLICY IF EXISTS "user_materials_all_admin" ON user_materials;

CREATE POLICY "user_materials_own"
  ON user_materials FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_materials_all_admin"
  ON user_materials FOR ALL
  USING (is_admin());


-- ============================================================
-- 32. USER_DOCUMENT_CHUNKS (per-user RAG)
-- ============================================================
ALTER TABLE user_document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_doc_chunks_own"       ON user_document_chunks;
DROP POLICY IF EXISTS "user_doc_chunks_all_admin" ON user_document_chunks;

CREATE POLICY "user_doc_chunks_own"
  ON user_document_chunks FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_doc_chunks_all_admin"
  ON user_document_chunks FOR ALL
  USING (is_admin());


-- ============================================================
-- STORAGE BUCKET POLİTİKALARI
-- ============================================================

-- user-videos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('user-videos', 'user-videos', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "user_videos_select_own"  ON storage.objects;
DROP POLICY IF EXISTS "user_videos_insert_own"  ON storage.objects;
DROP POLICY IF EXISTS "user_videos_delete_own"  ON storage.objects;

CREATE POLICY "user_videos_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "user_videos_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "user_videos_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user-audio bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('user-audio', 'user-audio', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "user_audio_select_own" ON storage.objects;
DROP POLICY IF EXISTS "user_audio_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_audio_delete_own" ON storage.objects;

CREATE POLICY "user_audio_select_own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "user_audio_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "user_audio_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- DOĞRULAMA — tüm RLS aktif tabloları listele
-- ============================================================
-- Bu sorguyu çalıştırarak kontrol edin:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' ORDER BY tablename;
