create table if not exists public.concept_drills (
  release_id uuid not null references public.content_releases(id) on delete cascade,
  stable_key text not null,
  opening_family_key text not null,
  title text not null,
  principle text not null,
  summary text not null,
  themes text[] not null default '{}',
  depth text not null check (depth in ('foundation', 'standard', 'deep')),
  sort_order integer not null check (sort_order >= 0),
  plan_prompt text not null,
  plan_choices jsonb not null,
  scenarios jsonb not null,
  primary key (release_id, stable_key),
  unique (release_id, opening_family_key, sort_order),
  foreign key (release_id, opening_family_key) references public.opening_families(release_id, stable_key) deferrable initially deferred
);

update public.content_releases set schema_version = greatest(schema_version, 2);

alter table public.concept_drills enable row level security;

create policy "Published concept drills are readable" on public.concept_drills
  for select using (exists (
    select 1 from public.content_releases r
    where r.id = release_id and (r.status = 'published' or public.is_content_editor())
  ));

create policy "Editors manage draft concept drills" on public.concept_drills
  for all using (public.is_content_editor() and exists (
    select 1 from public.content_releases r where r.id = release_id and r.status = 'draft'
  )) with check (public.is_content_editor() and exists (
    select 1 from public.content_releases r where r.id = release_id and r.status = 'draft'
  ));
