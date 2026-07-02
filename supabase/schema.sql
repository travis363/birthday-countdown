-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Creates a table to hold push subscriptions and lets the phone (anon key) insert
-- its own subscription, while nobody with the public key can read them back.

create table if not exists public.birthday_subs (
  id           uuid primary key default gen_random_uuid(),
  endpoint     text unique not null,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

alter table public.birthday_subs enable row level security;

-- Allow anonymous INSERT / UPSERT (the phone saving its subscription).
drop policy if exists "anon can add subscription" on public.birthday_subs;
create policy "anon can add subscription"
  on public.birthday_subs
  for insert
  to anon
  with check (true);

-- Needed so on-conflict upsert (merge-duplicates) works for anon.
drop policy if exists "anon can update own row" on public.birthday_subs;
create policy "anon can update own row"
  on public.birthday_subs
  for update
  to anon
  using (true)
  with check (true);

-- NOTE: no SELECT/DELETE policy for anon, so the public key can't read or wipe
-- the list. The GitHub Action uses the SERVICE key, which bypasses RLS.


-- ---------------------------------------------------------------------------
-- Read receipts: the app records when a phone has opened a given hour's note,
-- so the +5 minute follow-up alert is skipped if she already saw it.
create table if not exists public.birthday_reads (
  endpoint   text not null,
  hour       int  not null,
  created_at timestamptz not null default now(),
  primary key (endpoint, hour)
);

alter table public.birthday_reads enable row level security;

drop policy if exists "anon can mark read" on public.birthday_reads;
create policy "anon can mark read"
  on public.birthday_reads
  for insert
  to anon
  with check (true);

drop policy if exists "anon can update read" on public.birthday_reads;
create policy "anon can update read"
  on public.birthday_reads
  for update
  to anon
  using (true)
  with check (true);
