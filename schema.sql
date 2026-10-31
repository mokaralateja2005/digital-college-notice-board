-- Run this SQL in the Supabase SQL Editor to create the notices table.
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 100),
  category text not null check (category in ('Academic', 'Events', 'Deadlines', 'Facilities', 'General')),
  published_on date not null,
  deadline date,
  pinned boolean not null default false,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.notices enable row level security;

-- The browser must never access this table directly. The Node backend uses
-- the Supabase service-role key, which bypasses RLS and must remain secret.
revoke all on table public.notices from anon, authenticated;
grant all on table public.notices to service_role;
