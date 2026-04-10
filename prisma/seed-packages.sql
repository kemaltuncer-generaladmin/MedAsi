-- Medasi 4 temel paketi — Supabase SQL Editor'da çalıştır
-- Varsa günceller, yoksa ekler (upsert)

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Ücretsiz',  0,    0)    ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Giriş',    50,   99)   ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Pro',      9999, 249)  ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Kurumsal', 9999, 0)    ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;
