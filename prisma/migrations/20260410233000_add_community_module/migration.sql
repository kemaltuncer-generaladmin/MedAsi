create table if not exists public.universities (
  id text primary key default (gen_random_uuid())::text,
  name text not null,
  slug text not null unique,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.university_email_domains (
  id text primary key default (gen_random_uuid())::text,
  university_id text not null references public.universities(id) on delete cascade,
  domain text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id text primary key default (gen_random_uuid())::text,
  university_id text not null references public.universities(id) on delete cascade,
  name text not null,
  slug text not null,
  degree_type text not null default 'medicine',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (university_id, slug)
);

create table if not exists public.academic_terms (
  id text primary key default (gen_random_uuid())::text,
  program_id text not null references public.programs(id) on delete cascade,
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (program_id, code)
);

create table if not exists public.courses (
  id text primary key default (gen_random_uuid())::text,
  program_id text not null references public.programs(id) on delete cascade,
  term_id text references public.academic_terms(id) on delete set null,
  name text not null,
  slug text not null,
  course_type text not null default 'course',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (program_id, slug)
);

create table if not exists public.user_academic_profiles (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null unique references public.users(id) on delete cascade,
  university_id text references public.universities(id) on delete set null,
  program_id text references public.programs(id) on delete set null,
  term_id text references public.academic_terms(id) on delete set null,
  specialty text,
  student_no_hash text,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  visibility_level text not null default 'verified_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_spaces (
  id text primary key default (gen_random_uuid())::text,
  type text not null,
  title text not null,
  slug text not null unique,
  description text,
  access_type text not null default 'public',
  status text not null default 'active',
  university_id text references public.universities(id) on delete set null,
  program_id text references public.programs(id) on delete set null,
  term_id text references public.academic_terms(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  owner_user_id text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_threads (
  id text primary key default (gen_random_uuid())::text,
  space_id text not null references public.community_spaces(id) on delete cascade,
  author_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  content_type text not null,
  visibility_scope text not null default 'global',
  status text not null default 'active',
  tags jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  contains_spoiler boolean not null default false,
  best_answer_post_id text,
  attached_material_id text,
  post_count integer not null default 0,
  reaction_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id text primary key default (gen_random_uuid())::text,
  thread_id text not null references public.community_threads(id) on delete cascade,
  author_id text not null references public.users(id) on delete cascade,
  body text not null,
  quoted_post_id text references public.community_posts(id) on delete set null,
  status text not null default 'active',
  is_best_answer boolean not null default false,
  edit_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_resources (
  id text primary key default (gen_random_uuid())::text,
  space_id text references public.community_spaces(id) on delete set null,
  author_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null default 'file',
  visibility_scope text not null default 'global',
  status text not null default 'active',
  url text,
  file_path text,
  linked_material_id text,
  university_id text references public.universities(id) on delete set null,
  program_id text references public.programs(id) on delete set null,
  term_id text references public.academic_terms(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  quality_score integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_reactions (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

create table if not exists public.community_bookmarks (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.community_follows (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.community_group_chats (
  id text primary key default (gen_random_uuid())::text,
  space_id text references public.community_spaces(id) on delete set null,
  created_by_user_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  is_direct_message boolean not null default false,
  status text not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_chat_members (
  id text primary key default (gen_random_uuid())::text,
  chat_id text not null references public.community_group_chats(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_until timestamptz,
  unique (chat_id, user_id)
);

create table if not exists public.community_chat_messages (
  id text primary key default (gen_random_uuid())::text,
  chat_id text not null references public.community_group_chats(id) on delete cascade,
  author_user_id text not null references public.users(id) on delete cascade,
  body text not null,
  message_type text not null default 'text',
  attachment jsonb,
  reply_to_message_id text references public.community_chat_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_message_reads (
  id text primary key default (gen_random_uuid())::text,
  message_id text not null references public.community_chat_messages(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.community_report_reasons (
  id text primary key default (gen_random_uuid())::text,
  key text not null unique,
  label text not null,
  description text,
  severity text not null default 'medium',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id text primary key default (gen_random_uuid())::text,
  reporter_user_id text not null references public.users(id) on delete cascade,
  reason_id text references public.community_report_reasons(id) on delete set null,
  target_type text not null,
  target_id text not null,
  details text,
  status text not null default 'open',
  assigned_moderator_user_id text references public.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.community_moderation_actions (
  id text primary key default (gen_random_uuid())::text,
  actor_user_id text not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  target_user_id text,
  action_type text not null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.community_role_assignments (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  role text not null,
  university_id text references public.universities(id) on delete set null,
  program_id text references public.programs(id) on delete set null,
  term_id text references public.academic_terms(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  space_id text references public.community_spaces(id) on delete set null,
  granted_by_user_id text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.community_blocks (
  id text primary key default (gen_random_uuid())::text,
  blocker_user_id text not null references public.users(id) on delete cascade,
  blocked_user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_user_id, blocked_user_id)
);

create table if not exists public.community_mutes (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  target_type text not null,
  target_id text,
  muted_user_id text references public.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_bans (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  scope_type text not null default 'global',
  university_id text references public.universities(id) on delete set null,
  program_id text references public.programs(id) on delete set null,
  term_id text references public.academic_terms(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  imposed_by_user_id text not null references public.users(id) on delete cascade,
  reason text,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_notifications (
  id text primary key default (gen_random_uuid())::text,
  user_id text not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_universities_active on public.universities (is_active);
create index if not exists idx_programs_university_active on public.programs (university_id, is_active);
create index if not exists idx_terms_program_sort on public.academic_terms (program_id, sort_order);
create index if not exists idx_courses_program_term on public.courses (program_id, term_id);
create index if not exists idx_user_academic_profiles_scope on public.user_academic_profiles (university_id, program_id, term_id);
create index if not exists idx_user_academic_profiles_verification on public.user_academic_profiles (verification_status);
create index if not exists idx_community_spaces_scope on public.community_spaces (university_id, program_id, term_id, course_id);
create index if not exists idx_community_threads_space_activity on public.community_threads (space_id, last_activity_at desc);
create index if not exists idx_community_threads_author_created on public.community_threads (author_id, created_at desc);
create index if not exists idx_community_posts_thread_created on public.community_posts (thread_id, created_at asc);
create index if not exists idx_community_resources_space_created on public.community_resources (space_id, created_at desc);
create index if not exists idx_community_resources_course_score on public.community_resources (course_id, quality_score desc);
create index if not exists idx_community_group_chats_activity on public.community_group_chats (is_direct_message, last_message_at desc);
create index if not exists idx_community_chat_members_user on public.community_chat_members (user_id, status);
create index if not exists idx_community_chat_messages_chat_created on public.community_chat_messages (chat_id, created_at asc);
create index if not exists idx_community_reports_status on public.community_reports (status, created_at desc);
create index if not exists idx_community_role_assignments_user on public.community_role_assignments (user_id, role);
create index if not exists idx_community_notifications_user on public.community_notifications (user_id, is_read, created_at desc);

insert into public.community_spaces (type, title, slug, description, access_type, status)
values (
  'global',
  'Topluluk Merkezi',
  'global-hub',
  'Tum tip fakultesi ogrencilerinin ortak akisi, kaynak paylasimi ve duyuru merkezi.',
  'public',
  'active'
)
on conflict (slug) do nothing;

insert into public.community_report_reasons (key, label, description, severity, is_active)
values
  ('spam', 'Spam veya alakasiz icerik', 'Reklam, tekrar veya konu disi paylasim.', 'medium', true),
  ('abuse', 'Hakaret veya toksik davranis', 'Kisisel saldiri, taciz veya zorbalik.', 'high', true),
  ('privacy', 'Hasta verisi veya mahremiyet ihlali', 'Kimlik aciga cikarabilecek hasta verisi veya belge.', 'critical', true),
  ('copyright', 'Telif veya kaynak ihlali', 'Izinsiz PDF, slayt veya ucretli icerik paylasimi.', 'high', true)
on conflict (key) do nothing;

alter table public.user_academic_profiles enable row level security;
alter table public.community_spaces enable row level security;
alter table public.community_threads enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_resources enable row level security;
alter table public.community_group_chats enable row level security;
alter table public.community_chat_members enable row level security;
alter table public.community_chat_messages enable row level security;
alter table public.community_message_reads enable row level security;

drop policy if exists "user_academic_profiles_select_own" on public.user_academic_profiles;
create policy "user_academic_profiles_select_own"
on public.user_academic_profiles
for select
to authenticated
using (auth.uid()::text = user_id);

drop policy if exists "community_spaces_select_authenticated" on public.community_spaces;
create policy "community_spaces_select_authenticated"
on public.community_spaces
for select
to authenticated
using (status = 'active');

drop policy if exists "community_threads_select_authenticated" on public.community_threads;
create policy "community_threads_select_authenticated"
on public.community_threads
for select
to authenticated
using (status in ('active', 'archived'));

drop policy if exists "community_posts_select_authenticated" on public.community_posts;
create policy "community_posts_select_authenticated"
on public.community_posts
for select
to authenticated
using (status in ('active', 'hidden'));

drop policy if exists "community_resources_select_authenticated" on public.community_resources;
create policy "community_resources_select_authenticated"
on public.community_resources
for select
to authenticated
using (status in ('active', 'hidden'));

drop policy if exists "community_group_chats_select_members" on public.community_group_chats;
create policy "community_group_chats_select_members"
on public.community_group_chats
for select
to authenticated
using (
  exists (
    select 1
    from public.community_chat_members members
    where members.chat_id = id
      and members.user_id = auth.uid()::text
      and members.status = 'active'
  )
);

drop policy if exists "community_chat_members_select_members" on public.community_chat_members;
create policy "community_chat_members_select_members"
on public.community_chat_members
for select
to authenticated
using (
  user_id = auth.uid()::text
  or exists (
    select 1
    from public.community_chat_members members
    where members.chat_id = community_chat_members.chat_id
      and members.user_id = auth.uid()::text
      and members.status = 'active'
  )
);

drop policy if exists "community_chat_messages_select_members" on public.community_chat_messages;
create policy "community_chat_messages_select_members"
on public.community_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.community_chat_members members
    where members.chat_id = community_chat_messages.chat_id
      and members.user_id = auth.uid()::text
      and members.status = 'active'
  )
);

drop policy if exists "community_message_reads_select_members" on public.community_message_reads;
create policy "community_message_reads_select_members"
on public.community_message_reads
for select
to authenticated
using (user_id = auth.uid()::text);
