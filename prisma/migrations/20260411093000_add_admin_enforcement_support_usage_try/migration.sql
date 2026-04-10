ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "account_approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

UPDATE "users"
SET "account_approved_at" = COALESCE("account_approved_at", "created_at")
WHERE "account_approved_at" IS NULL;

ALTER TABLE "support_tickets"
  ADD COLUMN IF NOT EXISTS "assigned_admin_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "first_response_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_response_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "close_reason" TEXT;

CREATE TABLE IF NOT EXISTS "support_ticket_notes" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "author_user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_ticket_audits" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT,
  "details" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "module_activities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "module_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_tickets_assigned_admin_user_id_status_updated_at_idx" ON "support_tickets"("assigned_admin_user_id", "status", "updated_at");
CREATE INDEX IF NOT EXISTS "support_ticket_notes_ticket_id_created_at_idx" ON "support_ticket_notes"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_ticket_notes_author_user_id_created_at_idx" ON "support_ticket_notes"("author_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_ticket_audits_ticket_id_created_at_idx" ON "support_ticket_audits"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_ticket_audits_actor_user_id_created_at_idx" ON "support_ticket_audits"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_ticket_audits_action_created_at_idx" ON "support_ticket_audits"("action", "created_at");
CREATE INDEX IF NOT EXISTS "module_activities_user_id_created_at_idx" ON "module_activities"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "module_activities_module_created_at_idx" ON "module_activities"("module", "created_at");
CREATE INDEX IF NOT EXISTS "module_activities_action_created_at_idx" ON "module_activities"("action", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_tickets_assigned_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "support_tickets"
      ADD CONSTRAINT "support_tickets_assigned_admin_user_id_fkey"
      FOREIGN KEY ("assigned_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_ticket_notes_ticket_id_fkey'
  ) THEN
    ALTER TABLE "support_ticket_notes"
      ADD CONSTRAINT "support_ticket_notes_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_ticket_notes_author_user_id_fkey'
  ) THEN
    ALTER TABLE "support_ticket_notes"
      ADD CONSTRAINT "support_ticket_notes_author_user_id_fkey"
      FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_ticket_audits_ticket_id_fkey'
  ) THEN
    ALTER TABLE "support_ticket_audits"
      ADD CONSTRAINT "support_ticket_audits_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_ticket_audits_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "support_ticket_audits"
      ADD CONSTRAINT "support_ticket_audits_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'module_activities_user_id_fkey'
  ) THEN
    ALTER TABLE "module_activities"
      ADD CONSTRAINT "module_activities_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
