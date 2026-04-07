-- ============================================================
--  RESEARCH ORGANIZATIONS — Migration SQL
--  Supabase SQL Editor'da çalıştırın
--  NOT: Mevcut users.id ve modules.id kolonları TEXT tipinde
--       olduğu için tüm ID kolonları TEXT olarak tanımlandı.
-- ============================================================

-- 1. Araştırma organizasyonları
CREATE TABLE IF NOT EXISTS research_organizations (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                 TEXT        NOT NULL,
  slug                 TEXT        NOT NULL UNIQUE,
  admin_user_id        TEXT        NOT NULL REFERENCES users(id),
  status               TEXT        NOT NULL DEFAULT 'active',
  starts_at            TIMESTAMPTZ NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  markup_pct           FLOAT       NOT NULL DEFAULT 30,
  monthly_budget_usd   FLOAT,
  alert_threshold_pct  INT         NOT NULL DEFAULT 80,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Org üyeleri
CREATE TABLE IF NOT EXISTS org_members (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id     TEXT        NOT NULL REFERENCES research_organizations(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'researcher',
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 3. Org modülleri
CREATE TABLE IF NOT EXISTS org_modules (
  org_id     TEXT NOT NULL REFERENCES research_organizations(id) ON DELETE CASCADE,
  module_id  TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (org_id, module_id)
);

-- 4. AI kullanım kayıtları
CREATE TABLE IF NOT EXISTS org_ai_usage (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id         TEXT        NOT NULL REFERENCES research_organizations(id),
  user_id        TEXT        NOT NULL REFERENCES users(id),
  module         TEXT,
  model          TEXT        NOT NULL,
  input_tokens   INT         NOT NULL DEFAULT 0,
  output_tokens  INT         NOT NULL DEFAULT 0,
  cost_usd       FLOAT       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Davet token'ları
CREATE TABLE IF NOT EXISTS org_invitations (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id      TEXT        NOT NULL REFERENCES research_organizations(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  role        TEXT        NOT NULL DEFAULT 'researcher',
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Model fiyatlandırması
CREATE TABLE IF NOT EXISTS model_pricing (
  id                   TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  model                TEXT        NOT NULL UNIQUE,
  display_name         TEXT        NOT NULL,
  input_price_per_1k   FLOAT       NOT NULL,
  output_price_per_1k  FLOAT       NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Varsayılan model fiyatları
INSERT INTO model_pricing (model, display_name, input_price_per_1k, output_price_per_1k) VALUES
  ('claude-opus-4-6',           'Claude Opus 4.6',   0.015,   0.075),
  ('claude-sonnet-4-6',         'Claude Sonnet 4.6', 0.003,   0.015),
  ('claude-haiku-4-5-20251001', 'Claude Haiku 4.5',  0.00025, 0.00125),
  ('gpt-4o',                    'GPT-4o',            0.005,   0.015),
  ('gpt-4o-mini',               'GPT-4o Mini',       0.00015, 0.0006)
ON CONFLICT (model) DO NOTHING;

-- 8. İndeksler (sorgu performansı)
CREATE INDEX IF NOT EXISTS idx_org_ai_usage_org_id     ON org_ai_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_org_ai_usage_user_id    ON org_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_org_ai_usage_created_at ON org_ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id     ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token   ON org_invitations(token);
