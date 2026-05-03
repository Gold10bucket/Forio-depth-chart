-- Real Forio Depth Chart — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query → paste → Run).

-- 1) PLAYERS table -------------------------------------------------------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  number      int  not null,
  name        text not null,
  birth_year  int,
  position    text not null check (position in
              ('GK','RB','RCB','LCB','LB','RCM','CM','LCM','RW','ST','LW')),
  depth_index int  not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists players_position_depth_idx
  on public.players (position, depth_index);

-- Auto-bump updated_at on every change
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists players_touch on public.players;
create trigger players_touch before update on public.players
for each row execute procedure public.touch_updated_at();

-- 2) META table (single row, formation + house-keeping) ------------------
create table if not exists public.meta (
  id         int  primary key default 1,
  formation  text not null default '4-3-3',
  updated_at timestamptz not null default now(),
  constraint meta_singleton check (id = 1)
);

insert into public.meta (id, formation) values (1, '4-3-3')
on conflict (id) do nothing;

-- 3) Row-Level Security: open read/write for the anon role --------------
-- Option A: single shared roster, public link, no logins.
-- Anyone with the URL can read & write. Acceptable for a small private group.
alter table public.players enable row level security;
alter table public.meta    enable row level security;

drop policy if exists "anon read players"  on public.players;
drop policy if exists "anon write players" on public.players;
drop policy if exists "anon read meta"     on public.meta;
drop policy if exists "anon write meta"    on public.meta;

create policy "anon read players"  on public.players for select using (true);
create policy "anon write players" on public.players for all    using (true) with check (true);
create policy "anon read meta"     on public.meta    for select using (true);
create policy "anon write meta"    on public.meta    for all    using (true) with check (true);

-- 4) Realtime: publish changes so the browser can subscribe -------------
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.meta;
