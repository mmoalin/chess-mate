create table if not exists public.connected_lessons (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  opening_family_key text not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  primary key (release_id, stable_key),
  foreign key (release_id, opening_family_key) references public.opening_families(release_id, stable_key) deferrable initially deferred,
  check (content->>'key' = stable_key and content->>'openingFamilyKey' = opening_family_key)
);

alter table public.connected_lessons enable row level security;
create policy "Published connected lessons are readable" on public.connected_lessons
  for select using (exists (select 1 from public.content_releases r where r.id = release_id and (r.status = 'published' or public.is_content_editor())));
create policy "Editors manage draft connected lessons" on public.connected_lessons
  for all using (public.is_content_editor() and exists (select 1 from public.content_releases r where r.id = release_id and r.status = 'draft'))
  with check (public.is_content_editor() and exists (select 1 from public.content_releases r where r.id = release_id and r.status = 'draft'));

create table if not exists public.lesson_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  lesson_key text not null,
  session jsonb not null check (jsonb_typeof(session) = 'object'),
  updated_at timestamptz not null,
  primary key (user_id, id),
  check (session->>'learnerId' = user_id::text and session->>'id' = id::text and session->>'lessonKey' = lesson_key)
);
alter table public.lesson_sessions enable row level security;
create policy "Users manage own lesson sessions" on public.lesson_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Clone every content collection, including the concept drills omitted by the
-- original v1 function. Retain the source schema until a v3 draft is saved.
create or replace function public.clone_published_content_release(new_title text default 'Working draft')
returns uuid language plpgsql security definer set search_path = public as $$
declare source_id uuid; draft_id uuid; next_version integer; source_schema integer;
begin
  if not public.is_content_editor() then raise exception 'content editor access required'; end if;
  if exists (select 1 from content_releases where status = 'draft') then raise exception 'a draft already exists'; end if;
  select id, schema_version into source_id, source_schema from content_releases where status = 'published';
  select coalesce(max(version), 0) + 1 into next_version from content_releases;
  insert into content_releases(version, title, schema_version, status, based_on_release_id, created_by)
    values (next_version, new_title, coalesce(source_schema, 3), 'draft', source_id, auth.uid()) returning id into draft_id;
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
    insert into concept_drills select draft_id, stable_key, opening_family_key, title, principle, summary, themes, depth, sort_order, plan_prompt, plan_choices, scenarios from concept_drills where release_id = source_id;
    insert into connected_lessons select draft_id, stable_key, opening_family_key, content from connected_lessons where release_id = source_id;
  end if;
  return draft_id;
end $$;
