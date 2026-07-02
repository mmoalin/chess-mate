create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  line_id text not null,
  side text not null check (side in ('white', 'black')),
  status text not null check (status in ('new', 'in-progress', 'completed', 'learning', 'due', 'mastered', 'needs-review')),
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  next_move_index integer not null default 0,
  due_at timestamptz,
  last_reviewed_at timestamptz,
  streak integer not null default 0,
  mistake_count integer not null default 0,
  theme_weaknesses text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, line_id)
);

create table if not exists public.curriculum_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  task_id text not null,
  score integer not null default 0 check (score >= 0 and score <= 100),
  attempts integer not null default 0 check (attempts >= 0),
  status text not null default 'not-started' check (status in ('not-started', 'in-progress', 'passed', 'needs-review')),
  last_reviewed_at timestamptz not null default now(),
  primary key (user_id, module_id, task_id)
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  board_orientation text not null default 'white' check (board_orientation in ('white', 'black')),
  preferred_side text not null default 'white' check (preferred_side in ('white', 'black')),
  engine_depth integer not null default 8,
  engine_move_time_ms integer not null default 1000,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.training_progress enable row level security;
alter table public.curriculum_progress enable row level security;
alter table public.settings enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users manage own training progress"
  on public.training_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own curriculum progress"
  on public.curriculum_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
