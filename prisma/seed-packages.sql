-- Medasi 4 temel paketi — Supabase SQL Editor'da çalıştır
-- Varsa günceller, yoksa ekler (upsert)

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Ücretsiz',  100,    0)    ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Giriş',    100,   149)   ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Pro',      100, 399)  ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;

INSERT INTO packages (id, name, daily_ai_limit, price)
VALUES
  (gen_random_uuid(), 'Kurumsal', 100, 1299)    ON CONFLICT (name) DO UPDATE SET daily_ai_limit = EXCLUDED.daily_ai_limit, price = EXCLUDED.price;
