create extension if not exists vector;

drop function if exists public.insert_document_chunk(text, text, text, vector(768), jsonb);
drop function if exists public.match_documents(vector(768), double precision, integer);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  branch text not null default 'Genel',
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_chunks_title_branch
  on public.document_chunks (title, branch);

create index if not exists idx_document_chunks_created_at
  on public.document_chunks (created_at desc);

create index if not exists idx_document_chunks_metadata_gin
  on public.document_chunks using gin (metadata);

create or replace function public.insert_document_chunk(
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
  insert into public.document_chunks (title, branch, content, embedding, metadata)
  values (
    coalesce(nullif(trim(p_title), ''), 'İsimsiz Kaynak'),
    coalesce(nullif(trim(p_branch), ''), 'Genel'),
    coalesce(p_content, ''),
    p_embedding,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.match_documents(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 4
)
returns table (
  id text,
  title text,
  branch text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
security definer
set search_path = public
as $$
  select
    dc.id,
    dc.title,
    dc.branch,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
