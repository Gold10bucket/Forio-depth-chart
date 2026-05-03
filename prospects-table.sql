-- ============================================================
-- PROSPECTS TABLE — shortlist of players being scouted
-- Run this FIRST, before prospects-bulk-insert.sql
-- ============================================================

create table if not exists public.prospects (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,
  name          text not null,
  birth_date    date,
  birth_year    int,
  nationality   text,
  height_cm     int,
  foot          text,
  current_club  text,
  agent         text,
  minutes       int,
  profile_url   text,
  status        text default 'monitoring',
  scout_notes   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists prospects_category_idx   on public.prospects (category);
create index if not exists prospects_status_idx     on public.prospects (status);
create index if not exists prospects_birth_year_idx on public.prospects (birth_year);

create or replace function public.touch_prospects_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists prospects_touch_updated_at on public.prospects;
create trigger prospects_touch_updated_at
  before update on public.prospects
  for each row execute function public.touch_prospects_updated_at();

-- enable realtime (so the depth chart UI updates live)
alter publication supabase_realtime add table public.prospects;

-- RLS — same model as your players table (anon read+write for now)
alter table public.prospects enable row level security;

drop policy if exists "prospects anon read"  on public.prospects;
drop policy if exists "prospects anon write" on public.prospects;

create policy "prospects anon read"
  on public.prospects for select
  to anon, authenticated
  using (true);

create policy "prospects anon write"
  on public.prospects for all
  to anon, authenticated
  using (true) with check (true);
