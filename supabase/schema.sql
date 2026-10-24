-- Studyland database schema (Supabase Postgres).
-- Every row belongs to one user; Row Level Security makes each user see only their own rows.
-- Apply with: node scripts/apply-schema.mjs  (idempotent, safe to re-run)

-- App records (files metadata, notes, quiz results, mistakes, tasks), stored as JSON per collection
create table if not exists public.user_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (collection in ('files', 'notes', 'quizResults', 'mistakes', 'tasks', 'semesters', 'events', 'focusSessions', 'analyses')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

-- Existing databases: update the allowed collections (keeps the constraint in sync with the list above)
alter table public.user_records drop constraint if exists user_records_collection_check;
alter table public.user_records add constraint user_records_collection_check
  check (collection in ('files', 'notes', 'quizResults', 'mistakes', 'tasks', 'semesters', 'events', 'focusSessions', 'analyses'));

-- Full extracted text of each file, loaded only when a file is opened
create table if not exists public.file_texts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_id text not null,
  text_content text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, file_id)
);

alter table public.user_records enable row level security;
alter table public.file_texts enable row level security;

-- New tables are not exposed to the Data API automatically: grant only what signed-in users need
revoke all on table public.user_records from anon;
revoke all on table public.file_texts from anon;
grant select, insert, update, delete on table public.user_records to authenticated;
grant select, insert, update, delete on table public.file_texts to authenticated;

drop policy if exists "own records: select" on public.user_records;
drop policy if exists "own records: insert" on public.user_records;
drop policy if exists "own records: update" on public.user_records;
drop policy if exists "own records: delete" on public.user_records;
create policy "own records: select" on public.user_records for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own records: insert" on public.user_records for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own records: update" on public.user_records for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own records: delete" on public.user_records for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own texts: select" on public.file_texts;
drop policy if exists "own texts: insert" on public.file_texts;
drop policy if exists "own texts: update" on public.file_texts;
drop policy if exists "own texts: delete" on public.file_texts;
create policy "own texts: select" on public.file_texts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own texts: insert" on public.file_texts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own texts: update" on public.file_texts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own texts: delete" on public.file_texts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Pictures found in uploaded files (diagrams, charts, code screenshots), used for picture questions.
-- Stored as small base64 JPEGs, loaded only when a quiz with pictures is made.
create table if not exists public.file_images (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_id text not null,
  idx integer not null,
  source text not null,          -- where it came from, e.g. "page:3", "slide:5", "image:2"
  data text not null,            -- base64 JPEG
  created_at timestamptz not null default now(),
  primary key (user_id, file_id, idx)
);

alter table public.file_images enable row level security;
revoke all on table public.file_images from anon;
grant select, insert, update, delete on table public.file_images to authenticated;

drop policy if exists "own images: select" on public.file_images;
drop policy if exists "own images: insert" on public.file_images;
drop policy if exists "own images: update" on public.file_images;
drop policy if exists "own images: delete" on public.file_images;
create policy "own images: select" on public.file_images for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own images: insert" on public.file_images for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own images: update" on public.file_images for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own images: delete" on public.file_images for delete to authenticated
  using ((select auth.uid()) = user_id);
