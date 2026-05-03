-- Prospects (shortlist) table — separate from players so they never appear on the pitch.
-- Run AFTER 01-schema.sql.

create table if not exists public.prospects (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,                       -- "Terzino sinistro", "Play", etc.
  name          text not null,
  birth_date    date,
  birth_year    int,
  nationality   text,
  height_cm     int,
  foot          text,                                -- destro | sinistro | ambidestro
  current_club  text,
  agent         text,
  minutes       int,
  profile_url   text,
  status        text default 'monitoring' check (status in
                ('monitoring','contacted','negotiating','rejected')),
  scout_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists prospects_category_idx on public.prospects (category);
create index if not exists prospects_status_idx   on public.prospects (status);

drop trigger if exists prospects_touch on public.prospects;
create trigger prospects_touch before update on public.prospects
for each row execute procedure public.touch_updated_at();

alter table public.prospects enable row level security;
drop policy if exists "anon read prospects"  on public.prospects;
drop policy if exists "anon write prospects" on public.prospects;
create policy "anon read prospects"  on public.prospects for select using (true);
create policy "anon write prospects" on public.prospects for all    using (true) with check (true);

alter publication supabase_realtime add table public.prospects;
