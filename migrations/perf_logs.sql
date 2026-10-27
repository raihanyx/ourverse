-- [perf] TEMPORARY launch-time instrumentation (see lib/perf.js).
-- One row per app open, written by /api/vitals. Read it from the SQL editor,
-- which bypasses RLS, so there is deliberately no select policy.
-- Remove when done:  drop table public.perf_logs;

create table if not exists public.perf_logs (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  standalone boolean not null default false,
  data       jsonb not null
);

alter table public.perf_logs enable row level security;

create policy "perf_logs insert own"
  on public.perf_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());
