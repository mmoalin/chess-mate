-- Additive schema for versioned repertoire content and local-first guided learning.
create table if not exists public.content_releases (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  title text not null,
  schema_version integer not null default 1,
  status text not null check (status in ('draft', 'published', 'archived')),
  based_on_release_id uuid references public.content_releases(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists content_releases_one_draft
  on public.content_releases ((status)) where status = 'draft';
create unique index if not exists content_releases_one_published
  on public.content_releases ((status)) where status = 'published';

create table if not exists public.content_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.opening_families (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  name text not null,
  side text not null check (side in ('white', 'black')),
  context text not null check (context in ('white', 'black-vs-e4', 'black-vs-d4', 'black-other')),
  root_position_key text not null,
  eco text,
  summary text not null,
  tags text[] not null default '{}',
  recommended_depths text[] not null default '{foundation,standard,deep}',
  line_keys text[] not null default '{}',
  primary key (release_id, stable_key)
);

create table if not exists public.repertoire_positions (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  fen text not null,
  side_to_move text not null check (side_to_move in ('white', 'black')),
  opening_family_keys text[] not null default '{}',
  legacy_position_ids text[] not null default '{}',
  primary key (release_id, stable_key)
);

alter table public.opening_families drop constraint if exists opening_families_root_position_fkey;
alter table public.opening_families add constraint opening_families_root_position_fkey
  foreign key (release_id, root_position_key) references public.repertoire_positions(release_id, stable_key)
  deferrable initially deferred;

create table if not exists public.repertoire_edges (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  from_position_key text not null,
  to_position_key text not null,
  san text not null,
  uci text not null check (uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  sort_order integer not null default 0,
  classification text not null check (classification in ('main', 'alternative', 'transposition', 'deviation')),
  opening_family_keys text[] not null default '{}',
  legacy_line_ids text[] not null default '{}',
  primary key (release_id, stable_key),
  foreign key (release_id, from_position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred,
  foreign key (release_id, to_position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.learning_units (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  opening_family_key text not null,
  line_key text not null,
  title text not null,
  start_position_key text not null,
  end_position_key text not null,
  sort_order integer not null default 0,
  depth text not null check (depth in ('foundation', 'standard', 'deep')),
  primary key (release_id, stable_key),
  foreign key (release_id, opening_family_key) references public.opening_families(release_id, stable_key) deferrable initially deferred,
  foreign key (release_id, start_position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred,
  foreign key (release_id, end_position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.learning_unit_steps (
  release_id uuid not null,
  learning_unit_key text not null,
  edge_key text not null,
  step_order integer not null check (step_order >= 0),
  primary key (release_id, learning_unit_key, step_order),
  unique (release_id, learning_unit_key, edge_key),
  foreign key (release_id, learning_unit_key) references public.learning_units(release_id, stable_key) on delete cascade deferrable initially deferred,
  foreign key (release_id, edge_key) references public.repertoire_edges(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.position_guidance (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  position_key text not null,
  edge_key text,
  kind text not null check (kind in ('idea', 'cue', 'fallback', 'mistake')),
  title text not null,
  body text not null,
  primary key (release_id, stable_key),
  foreign key (release_id, position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred,
  foreign key (release_id, edge_key) references public.repertoire_edges(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.deviation_policies (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  position_key text not null,
  move_uci text,
  category text not null check (category in ('harmless', 'direct-threat', 'central-challenge', 'tactical-opportunity', 'new-branch')),
  guidance text not null,
  primary key (release_id, stable_key),
  foreign key (release_id, position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.tactical_motifs (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  title text not null,
  pattern text not null,
  trigger_text text not null,
  execution text not null,
  prerequisites text not null,
  limitation text not null,
  difficulty text not null check (difficulty in ('foundation', 'standard', 'deep')),
  primary key (release_id, stable_key)
);

create table if not exists public.tactical_motif_positions (
  release_id uuid not null,
  motif_key text not null,
  position_key text not null,
  primary key (release_id, motif_key, position_key),
  foreign key (release_id, motif_key) references public.tactical_motifs(release_id, stable_key) on delete cascade deferrable initially deferred,
  foreign key (release_id, position_key) references public.repertoire_positions(release_id, stable_key) deferrable initially deferred
);

create table if not exists public.learner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating_source text check (rating_source in ('chess.com', 'lichess', 'otb', 'unsure')),
  rating_value integer check (rating_value between 100 and 3500),
  depth text not null default 'foundation' check (depth in ('foundation', 'standard', 'deep')),
  goal text not null default 'basic-plans' check (goal in ('basic-plans', 'tactical-danger', 'sharp-gambits', 'deep-repertoire')),
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.repertoire_selections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opening_family_key text not null,
  preferred_edges jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, opening_family_key)
);

create table if not exists public.learning_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  position_key text not null,
  dimension text not null check (dimension in ('recall', 'understanding', 'tactics')),
  response text not null,
  correct boolean not null,
  hint_used boolean not null default false,
  revealed boolean not null default false,
  created_at timestamptz not null
);

create table if not exists public.guided_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  position_key text not null,
  recall jsonb not null,
  understanding jsonb not null,
  tactics jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table if not exists public.imported_games (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pgn text not null,
  matched_opening_family_key text,
  matched_ply_count integer not null default 0,
  divergence_ply integer,
  diverging_side text check (diverging_side in ('learner', 'opponent')),
  last_known_position_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.repertoire_backlog (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  position_key text not null,
  reason text not null check (reason in ('opponent-deviation', 'forgotten-move', 'missed-tactic')),
  title text not null,
  status text not null default 'new' check (status in ('new', 'scheduled', 'resolved')),
  created_at timestamptz not null default now(),
  unique (user_id, position_key, reason)
);

create or replace function public.is_content_editor()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.content_editors where user_id = auth.uid()) $$;

create or replace function public.clone_published_content_release(new_title text default 'Working draft')
returns uuid language plpgsql security definer set search_path = public as $$
declare source_id uuid; draft_id uuid; next_version integer;
begin
  if not public.is_content_editor() then raise exception 'content editor access required'; end if;
  if exists (select 1 from content_releases where status = 'draft') then raise exception 'a draft already exists'; end if;
  select id into source_id from content_releases where status = 'published';
  select coalesce(max(version), 0) + 1 into next_version from content_releases;
  insert into content_releases(version, title, schema_version, status, based_on_release_id, created_by)
    values (next_version, new_title, 1, 'draft', source_id, auth.uid()) returning id into draft_id;
  if source_id is not null then
    insert into repertoire_positions select draft_id, stable_key, fen, side_to_move, opening_family_keys, legacy_position_ids from repertoire_positions where release_id = source_id;
    insert into opening_families select draft_id, stable_key, name, side, context, root_position_key, eco, summary, tags, recommended_depths, line_keys from opening_families where release_id = source_id;
    insert into repertoire_edges select draft_id, stable_key, from_position_key, to_position_key, san, uci, sort_order, classification, opening_family_keys, legacy_line_ids from repertoire_edges where release_id = source_id;
    insert into learning_units select draft_id, stable_key, opening_family_key, line_key, title, start_position_key, end_position_key, sort_order, depth from learning_units where release_id = source_id;
    insert into learning_unit_steps select draft_id, learning_unit_key, edge_key, step_order from learning_unit_steps where release_id = source_id;
    insert into position_guidance select draft_id, stable_key, position_key, edge_key, kind, title, body from position_guidance where release_id = source_id;
    insert into deviation_policies select draft_id, stable_key, position_key, move_uci, category, guidance from deviation_policies where release_id = source_id;
    insert into tactical_motifs select draft_id, stable_key, title, pattern, trigger_text, execution, prerequisites, limitation, difficulty from tactical_motifs where release_id = source_id;
    insert into tactical_motif_positions select draft_id, motif_key, position_key from tactical_motif_positions where release_id = source_id;
  end if;
  return draft_id;
end $$;

create or replace function public.publish_content_release(target_release_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.is_content_editor() then raise exception 'content editor access required'; end if;
  if not exists (select 1 from content_releases where id = target_release_id and status = 'draft') then raise exception 'target must be the current draft'; end if;
  if not exists (select 1 from opening_families where release_id = target_release_id) then raise exception 'release requires at least one opening family'; end if;
  if exists (
    select 1 from opening_families f where f.release_id = target_release_id and
      (btrim(f.summary) = ''
       or not exists (select 1 from learning_units u where u.release_id = f.release_id and u.opening_family_key = f.stable_key)
       or not exists (select 1 from repertoire_edges e where e.release_id = f.release_id and f.stable_key = any(e.opening_family_keys) and e.classification = 'main'))
  ) then raise exception 'every opening requires a summary, main path, and learning unit'; end if;
  if exists (
    select 1 from tactical_motifs m where m.release_id = target_release_id and
      (btrim(m.trigger_text) = '' or btrim(m.execution) = '' or btrim(m.limitation) = '')
  ) then raise exception 'every motif requires trigger, execution, and limitation'; end if;
  update content_releases set status = 'archived' where status = 'published';
  update content_releases set status = 'published', published_at = now() where id = target_release_id;
  return target_release_id;
end $$;

alter table public.content_releases enable row level security;
alter table public.content_editors enable row level security;
alter table public.opening_families enable row level security;
alter table public.repertoire_positions enable row level security;
alter table public.repertoire_edges enable row level security;
alter table public.learning_units enable row level security;
alter table public.learning_unit_steps enable row level security;
alter table public.position_guidance enable row level security;
alter table public.deviation_policies enable row level security;
alter table public.tactical_motifs enable row level security;
alter table public.tactical_motif_positions enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.repertoire_selections enable row level security;
alter table public.learning_attempts enable row level security;
alter table public.guided_mastery enable row level security;
alter table public.imported_games enable row level security;
alter table public.repertoire_backlog enable row level security;

create policy "Published releases are readable" on public.content_releases for select using (status = 'published' or public.is_content_editor());
create policy "Editors manage releases" on public.content_releases for all using (public.is_content_editor()) with check (public.is_content_editor());
create policy "Editors see own role" on public.content_editors for select using (user_id = auth.uid());

create policy "Published openings are readable" on public.opening_families for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft openings" on public.opening_families for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published positions are readable" on public.repertoire_positions for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft positions" on public.repertoire_positions for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published edges are readable" on public.repertoire_edges for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft edges" on public.repertoire_edges for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published units are readable" on public.learning_units for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft units" on public.learning_units for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published unit steps are readable" on public.learning_unit_steps for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft unit steps" on public.learning_unit_steps for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published guidance is readable" on public.position_guidance for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft guidance" on public.position_guidance for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published deviations are readable" on public.deviation_policies for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft deviations" on public.deviation_policies for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published motifs are readable" on public.tactical_motifs for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft motifs" on public.tactical_motifs for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));
create policy "Published motif links are readable" on public.tactical_motif_positions for select using (exists (select 1 from content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft motif links" on public.tactical_motif_positions for all using (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft')) with check (public.is_content_editor() and exists (select 1 from content_releases r where r.id = release_id and r.status = 'draft'));

create policy "Users manage own guided profile" on public.learner_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own repertoire selections" on public.repertoire_selections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own learning attempts" on public.learning_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own guided mastery" on public.guided_mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own imported games" on public.imported_games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own repertoire backlog" on public.repertoire_backlog for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant execute on function public.is_content_editor() to anon, authenticated;
grant execute on function public.clone_published_content_release(text) to authenticated;
grant execute on function public.publish_content_release(uuid) to authenticated;
