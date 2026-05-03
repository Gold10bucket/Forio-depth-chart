-- Prospect ordering per pitch-position slot.
-- Stores the user-defined display order for prospect rows in each position panel.
-- Run in Supabase SQL Editor after 03-prospects-schema.sql.

create table if not exists public.prospect_orders (
  pos_id      text primary key,            -- GK, RB, RCB, ... (pitch position key)
  ordered_ids text[] not null default '{}'  -- prospect UUIDs in display order
);

alter table public.prospect_orders enable row level security;
drop policy if exists "anon read prospect_orders"  on public.prospect_orders;
drop policy if exists "anon write prospect_orders" on public.prospect_orders;
create policy "anon read prospect_orders"  on public.prospect_orders for select using (true);
create policy "anon write prospect_orders" on public.prospect_orders for all    using (true) with check (true);

alter publication supabase_realtime add table public.prospect_orders;
