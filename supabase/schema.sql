-- Am I Underpaid? — Supabase schema
--
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Security design:
--   * Row Level Security is ENABLED with NO public policies.
--   * The app writes ONLY from the server using the service_role key, which
--     bypasses RLS. The browser never touches this table.
--   * If the public anon key ever leaked, these rows remain unreadable and
--     unwritable, because there is no policy granting anon/authenticated access.
--   * No resume text, file, name, or email is ever stored here.

create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  job_title       text,
  soc_label       text,
  salary          integer,
  experience      integer,
  city            text,
  industry        text,
  company_size    text,
  verdict         text,
  gap             integer,
  market_median   integer,
  seniority_level text,
  provider        text
);

-- Lock the table down.
alter table public.analyses enable row level security;

-- Deliberately NO policies for anon / authenticated roles.
-- Only the service_role (server-side) can read/write, and it bypasses RLS.

-- Helpful index for analytics queries.
create index if not exists analyses_created_at_idx on public.analyses (created_at desc);
