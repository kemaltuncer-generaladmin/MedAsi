import { prisma } from "@/lib/prisma";

type GuardKey = "materials" | "addons" | "support";

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
        ADD COLUMN IF NOT EXISTS managed_drive_archive_file_id text`,
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
        resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id text NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        author_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        body text NOT NULL,
        is_admin boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS support_tickets_user_id_created_at_idx
        ON public.support_tickets(user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_tickets_status_priority_idx
        ON public.support_tickets(status, priority)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_id_created_at_idx
        ON public.support_ticket_messages(ticket_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS support_ticket_messages_author_user_id_created_at_idx
        ON public.support_ticket_messages(author_user_id, created_at)`,
    ]);
  });
}
