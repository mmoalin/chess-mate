alter table public.learner_profiles
  add column if not exists daily_duration_minutes integer not null default 10
  check (daily_duration_minutes in (5, 10, 20));

alter table public.repertoire_backlog
  add column if not exists opening_family_key text;

create table if not exists public.daily_sessions (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'completed')),
  session jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (session->>'learnerId' = user_id::text and session->>'id' = id::text)
);

alter table public.daily_sessions enable row level security;
drop policy if exists "Learners manage own daily sessions" on public.daily_sessions;
create policy "Learners manage own daily sessions" on public.daily_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
