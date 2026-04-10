create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.user_google_tokens (
  user_id text primary key references public.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_google_tokens_expires_at
  on public.user_google_tokens (expires_at);

create table if not exists public.user_materials (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  type text not null,
  size_bytes bigint,
  status text not null default 'processing',
  source text not null default 'upload',
  drive_file_id text,
  drive_web_view_link text,
  branch text not null default 'Genel',
  chunk_count int not null default 0,
  page_count int,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_materials_user_created_at
  on public.user_materials (user_id, created_at desc);

create index if not exists idx_user_materials_user_status
  on public.user_materials (user_id, status);

create table if not exists public.user_document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  material_id text not null references public.user_materials(id) on delete cascade,
  title text not null,
  branch text not null default 'Genel',
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_doc_chunks_user_material
  on public.user_document_chunks (user_id, material_id);

create index if not exists idx_user_doc_chunks_user_branch
  on public.user_document_chunks (user_id, branch);

create index if not exists idx_user_doc_chunks_created_at
  on public.user_document_chunks (created_at desc);

drop function if exists public.insert_user_document_chunk(text, text, text, text, text, vector, jsonb);

create or replace function public.insert_user_document_chunk(
  p_user_id text,
  p_material_id text,
  p_title text,
  p_branch text,
  p_content text,
  p_embedding vector(768),
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id text;
begin
  insert into public.user_document_chunks (
    user_id,
    material_id,
    title,
    branch,
    content,
    embedding,
    metadata
  )
  values (
    p_user_id,
    p_material_id,
    coalesce(nullif(trim(p_title), ''), 'İsimsiz Materyal'),
    coalesce(nullif(trim(p_branch), ''), 'Genel'),
    coalesce(p_content, ''),
    p_embedding,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id::text into inserted_id;

  return inserted_id;
end;
$$;
