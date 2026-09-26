-- Personal game data is separate from published schema-3 course content.
create table public.game_review_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('game','run','position','card','session')),
  id text not null,
  value jsonb not null check (value->>'schema' = '1' and value->>'id' = id),
  revision bigint not null default 1,
  mutation_id uuid not null,
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);
alter table public.game_review_records enable row level security;
create policy game_review_owner_read on public.game_review_records for select to authenticated using (auth.uid() = user_id);
-- Writes use the revision-aware RPC; callers cannot bypass conflict checks.
revoke all on public.game_review_records from anon, authenticated;
grant select on public.game_review_records to authenticated;

create function public.write_game_review_record(p_owner uuid, p_kind text, p_id text, p_value jsonb, p_revision bigint, p_mutation uuid, p_deleted boolean default false)
returns public.game_review_records language plpgsql security definer set search_path = public as $$
declare existing public.game_review_records; parent_kind text; parent_id text; result public.game_review_records;
begin
  if auth.uid() is null or auth.uid() is distinct from p_owner then raise exception 'Account changed: pending writes remain in their original account partition'; end if;
  if p_value->>'schema' is distinct from '1' or p_value->>'id' is distinct from p_id then raise exception 'Invalid record'; end if;
  -- Serializes insert races as well as updates for this owner/key.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_kind || ':' || p_id, 0));
  select * into existing from public.game_review_records where user_id = auth.uid() and kind = p_kind and id = p_id for update;
  if found then
    if existing.mutation_id = p_mutation or existing.deleted then return existing; end if;
    if p_deleted then
      update public.game_review_records set deleted=true, revision=revision+1, mutation_id=p_mutation where user_id=auth.uid() and kind=p_kind and id=p_id returning * into result;
      return result;
    end if;
    if existing.revision <> p_revision then return existing; end if;
    if p_kind in ('game','run','card') or (p_kind='position' and (existing.value ? 'evidence' or existing.value ? 'assessment')) or (p_kind='session' and existing.value ? 'submittedAt') then return existing; end if;
  end if;
  parent_kind := case p_kind when 'run' then 'game' when 'position' then 'run' when 'card' then 'game' when 'session' then 'card' else null end;
  parent_id := case p_kind when 'run' then p_value->>'gameId' when 'position' then p_value->>'runId' when 'card' then p_value->>'gameId' when 'session' then p_value->>'cardId' else null end;
  if parent_kind is not null and not exists(select 1 from public.game_review_records where user_id=auth.uid() and kind=parent_kind and id=parent_id) then raise exception 'Missing owned parent record'; end if;
  insert into public.game_review_records(user_id,kind,id,value,revision,mutation_id,deleted) values(auth.uid(),p_kind,p_id,p_value,1,p_mutation,p_deleted)
    on conflict(user_id,kind,id) do update set value=excluded.value, revision=game_review_records.revision+1, mutation_id=excluded.mutation_id
    returning * into result;
  return result;
end $$;
revoke all on function public.write_game_review_record(uuid,text,text,jsonb,bigint,uuid,boolean) from public;
grant execute on function public.write_game_review_record(uuid,text,text,jsonb,bigint,uuid,boolean) to authenticated;
