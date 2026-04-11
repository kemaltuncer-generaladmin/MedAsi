import { prisma } from "@/lib/prisma";

type GuardKey = "materials" | "addons" | "support" | "usage" | "study-core" | "osce";

const guardState = globalThis as typeof globalThis & {
  __medasiSchemaGuardPromises__?: Partial<Record<GuardKey, Promise<void>>>;
};

function oncePerProcess(key: GuardKey, factory: () => Promise<void>): Promise<void> {
  const store = (guardState.__medasiSchemaGuardPromises__ ??= {});
  const existing = store[key];
  if (existing) return existing;

  const promise = factory().catch((error) => {
    delete store[key];
    throw error;
  });

  store[key] = promise;
  return promise;
}

async function runRawStatements(statements: string[]): Promise<void> {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function ensureMaterialsSchema(): Promise<void> {
  return oncePerProcess("materials", async () => {
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `CREATE EXTENSION IF NOT EXISTS vector`,
      `CREATE TABLE IF NOT EXISTS public.user_materials (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        type text NOT NULL,
        size_bytes bigint,
        status text NOT NULL DEFAULT 'processing',
        source text NOT NULL DEFAULT 'upload',
        drive_file_id text,
        drive_web_view_link text,
        branch text NOT NULL DEFAULT 'Genel',
        chunk_count int NOT NULL DEFAULT 0,
        page_count int,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `ALTER TABLE public.user_materials
        ADD COLUMN IF NOT EXISTS managed_drive_file_id text,
        ADD COLUMN IF NOT EXISTS managed_drive_processed_file_id text,
        ADD COLUMN IF NOT EXISTS managed_drive_archive_file_id text,
        ADD COLUMN IF NOT EXISTS processing_stage text NOT NULL DEFAULT 'queued',
        ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz,
        ADD COLUMN IF NOT EXISTS quality_score int,
        ADD COLUMN IF NOT EXISTS extraction_confidence int,
        ADD COLUMN IF NOT EXISTS slide_count int,
        ADD COLUMN IF NOT EXISTS ready_for_questions boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS ready_for_flashcards boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS summary_version int NOT NULL DEFAULT 1`,
      `CREATE INDEX IF NOT EXISTS idx_user_materials_user_created_at
        ON public.user_materials (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_user_materials_user_status
        ON public.user_materials (user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_user_materials_managed_drive_file
        ON public.user_materials (managed_drive_file_id)`,
      `CREATE TABLE IF NOT EXISTS public.user_document_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        title text NOT NULL,
        branch text NOT NULL DEFAULT 'Genel',
        content text NOT NULL,
        embedding vector(768),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_user_material
        ON public.user_document_chunks (user_id, material_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_user_branch
        ON public.user_document_chunks (user_id, branch)`,
      `CREATE INDEX IF NOT EXISTS idx_user_doc_chunks_created_at
        ON public.user_document_chunks (created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_drive_workspaces (
        user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
        user_folder_id text NOT NULL,
        inbox_folder_id text NOT NULL,
        processed_folder_id text NOT NULL,
        archive_folder_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_drive_workspaces_user_folder
        ON public.user_drive_workspaces (user_folder_id)`,
      `CREATE TABLE IF NOT EXISTS public.user_material_marks (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        slide_no int,
        color text NOT NULL DEFAULT 'yellow',
        note text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_material_marks_user_material
        ON public.user_material_marks (user_id, material_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_material_analysis (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        summary text,
        quality_score int,
        extraction_confidence int,
        slide_count int,
        chunk_coverage int,
        readability_score int,
        density_score int,
        exam_relevance_score int,
        clinical_relevance_score int,
        flashcard_readiness int,
        question_readiness int,
        strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
        issues jsonb NOT NULL DEFAULT '[]'::jsonb,
        recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(material_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_material_analysis_user_material
        ON public.user_material_analysis (user_id, material_id)`,
      `CREATE TABLE IF NOT EXISTS public.user_material_slide_insights (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        slide_no int NOT NULL,
        title text,
        extracted_text text NOT NULL DEFAULT '',
        text_density int NOT NULL DEFAULT 0,
        quality_score int NOT NULL DEFAULT 0,
        has_visual_gap boolean NOT NULL DEFAULT false,
        duplicate_risk boolean NOT NULL DEFAULT false,
        key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(material_id, slide_no)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_material_slide_insights_material
        ON public.user_material_slide_insights (material_id, slide_no)`,
      `CREATE TABLE IF NOT EXISTS public.user_material_processing_events (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        stage text NOT NULL,
        status text NOT NULL,
        message text,
        details jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_material_processing_events_material
        ON public.user_material_processing_events (material_id, created_at DESC)`,
      `DROP FUNCTION IF EXISTS public.insert_user_document_chunk(
        text,
        text,
        text,
        text,
        text,
        vector,
        jsonb
      )`,
    ]);
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.insert_user_document_chunk(
        p_user_id text,
        p_material_id text,
        p_title text,
        p_branch text,
        p_content text,
        p_embedding vector(768),
        p_metadata jsonb DEFAULT '{}'::jsonb
      )
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        inserted_id text;
      BEGIN
        INSERT INTO public.user_document_chunks (
          user_id,
          material_id,
          title,
          branch,
          content,
          embedding,
          metadata
        )
        VALUES (
          p_user_id,
          p_material_id,
          COALESCE(NULLIF(TRIM(p_title), ''), 'İsimsiz Materyal'),
          COALESCE(NULLIF(TRIM(p_branch), ''), 'Genel'),
          COALESCE(p_content, ''),
          p_embedding,
          COALESCE(p_metadata, '{}'::jsonb)
        )
        RETURNING id::text INTO inserted_id;

        RETURN inserted_id;
      END;
      $$;
    `);
  });
}

export async function ensureStudyCoreSchema(): Promise<void> {
  return oncePerProcess("study-core", async () => {
    await ensureMaterialsSchema();
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `CREATE TABLE IF NOT EXISTS public.user_wrong_questions (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        source_question_id text,
        subject text NOT NULL,
        difficulty text NOT NULL DEFAULT 'Orta',
        question_text text NOT NULL,
        options jsonb NOT NULL DEFAULT '[]'::jsonb,
        correct_answer int NOT NULL DEFAULT 0,
        user_answer int NOT NULL DEFAULT 0,
        explanation text,
        learned boolean NOT NULL DEFAULT false,
        added_at timestamptz NOT NULL DEFAULT now(),
        learned_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_user_added
        ON public.user_wrong_questions (user_id, added_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_user_wrong_questions_user_learned
        ON public.user_wrong_questions (user_id, learned)`,
      `CREATE TABLE IF NOT EXISTS public.user_flashcard_decks (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        subject text NOT NULL DEFAULT 'Genel',
        color text NOT NULL DEFAULT '#6366f1',
        source text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_flashcard_decks_user_updated
        ON public.user_flashcard_decks (user_id, updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_flashcard_cards (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        deck_id text NOT NULL REFERENCES public.user_flashcard_decks(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        front text NOT NULL,
        back text NOT NULL,
        rating text NOT NULL DEFAULT 'unknown',
        position int NOT NULL DEFAULT 0,
        next_review timestamptz,
        last_studied_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_flashcard_cards_user_review
        ON public.user_flashcard_cards (user_id, next_review, updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_flashcard_reviews (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        card_id text NOT NULL REFERENCES public.user_flashcard_cards(id) ON DELETE CASCADE,
        rating text NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_flashcard_reviews_user_time
        ON public.user_flashcard_reviews (user_id, reviewed_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_study_plans (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        week_key text NOT NULL,
        source_summary text NOT NULL DEFAULT '',
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, week_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_study_plans_user_week
        ON public.user_study_plans (user_id, week_key DESC)`,
      `CREATE TABLE IF NOT EXISTS public.user_study_recommendations (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        kind text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        href text,
        score int NOT NULL DEFAULT 0,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz,
        dismissed_at timestamptz
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_study_recommendations_user_active
        ON public.user_study_recommendations (user_id, dismissed_at, expires_at, score DESC)`,
    ]);
  });
}

export async function ensureAddonAccessSchema(): Promise<void> {
  return oncePerProcess("addons", async () => {
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `CREATE TABLE IF NOT EXISTS public.user_addon_access (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        module_key text NOT NULL,
        reason text,
        expires_at timestamptz,
        granted_by_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS user_addon_access_user_id_module_key_key
        ON public.user_addon_access(user_id, module_key)`,
      `CREATE INDEX IF NOT EXISTS user_addon_access_user_id_expires_at_idx
        ON public.user_addon_access(user_id, expires_at)`,
    ]);
  });
}

export async function ensureSupportSchema(): Promise<void> {
  return oncePerProcess("support", async () => {
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `CREATE TABLE IF NOT EXISTS public.support_tickets (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        subject text NOT NULL,
        category text,
        status text NOT NULL DEFAULT 'open',
        priority text NOT NULL DEFAULT 'normal',
        admin_notes text,
        assigned_admin_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
        first_response_at timestamptz,
        last_response_at timestamptz,
        resolved_at timestamptz,
        closed_at timestamptz,
        close_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `ALTER TABLE public.support_tickets
        ADD COLUMN IF NOT EXISTS assigned_admin_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
        ADD COLUMN IF NOT EXISTS last_response_at timestamptz,
        ADD COLUMN IF NOT EXISTS closed_at timestamptz,
        ADD COLUMN IF NOT EXISTS close_reason text`,
      `CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id text NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        author_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        body text NOT NULL,
        is_admin boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id text NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        author_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS public.support_ticket_audits (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id text NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        actor_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
        action text NOT NULL,
        from_status text,
        to_status text,
        details text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS support_tickets_user_id_created_at_idx
        ON public.support_tickets(user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_tickets_status_priority_idx
        ON public.support_tickets(status, priority)`,
      `CREATE INDEX IF NOT EXISTS support_tickets_assigned_admin_status_updated_idx
        ON public.support_tickets(assigned_admin_user_id, status, updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_created_at_idx
        ON public.support_ticket_messages(ticket_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_messages_author_user_id_created_at_idx
        ON public.support_ticket_messages(author_user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_notes_ticket_id_created_at_idx
        ON public.support_ticket_notes(ticket_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_audits_ticket_id_created_at_idx
        ON public.support_ticket_audits(ticket_id, created_at)`,
    ]);
  });
}

export async function ensureUsageTrackingSchema(): Promise<void> {
  return oncePerProcess("usage", async () => {
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS account_approved_at timestamptz,
        ADD COLUMN IF NOT EXISTS failed_login_attempts int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS locked_until timestamptz,
        ADD COLUMN IF NOT EXISTS last_login_at timestamptz`,
      `UPDATE public.users
        SET account_approved_at = COALESCE(account_approved_at, created_at)
        WHERE account_approved_at IS NULL`,
      `CREATE TABLE IF NOT EXISTS public.module_activities (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        module text NOT NULL,
        action text NOT NULL,
        path text NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS module_activities_user_created_at_idx
        ON public.module_activities(user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS module_activities_module_created_at_idx
        ON public.module_activities(module, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS module_activities_action_created_at_idx
        ON public.module_activities(action, created_at DESC)`,
    ]);
  });
}

export async function ensureOsceSchema(): Promise<void> {
  return oncePerProcess("osce", async () => {
    await ensureMaterialsSchema();
    await runRawStatements([
      `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
      `CREATE TABLE IF NOT EXISTS public.osce_scenarios (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        status text NOT NULL DEFAULT 'pending',
        specialty text NOT NULL,
        difficulty text NOT NULL,
        case_payload jsonb NOT NULL,
        anonymized_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by text REFERENCES public.users(id) ON DELETE SET NULL,
        approved_by text REFERENCES public.users(id) ON DELETE SET NULL,
        approved_at timestamptz,
        rejection_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_osce_scenarios_status_created
        ON public.osce_scenarios (status, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_osce_scenarios_specialty_difficulty
        ON public.osce_scenarios (specialty, difficulty)`,
      `CREATE TABLE IF NOT EXISTS public.osce_scenario_material_links (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        scenario_id text NOT NULL REFERENCES public.osce_scenarios(id) ON DELETE CASCADE,
        material_id text NOT NULL REFERENCES public.user_materials(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(scenario_id, material_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_osce_links_material
        ON public.osce_scenario_material_links (material_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.osce_sessions (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        scenario_id text REFERENCES public.osce_scenarios(id) ON DELETE SET NULL,
        case_id text,
        specialty text,
        difficulty text,
        quick_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
        deep_report text,
        scores jsonb NOT NULL DEFAULT '{}'::jsonb,
        durations jsonb NOT NULL DEFAULT '{}'::jsonb,
        model text,
        token_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        finalized_at timestamptz
      )`,
      `CREATE INDEX IF NOT EXISTS idx_osce_sessions_user_created
        ON public.osce_sessions (user_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.osce_skill_gaps (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id text NOT NULL REFERENCES public.osce_sessions(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        competency text NOT NULL,
        severity text NOT NULL DEFAULT 'medium',
        evidence text,
        recommendation text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_osce_skill_gaps_user_comp
        ON public.osce_skill_gaps (user_id, competency, created_at DESC)`,
    ]);
  });
}
