create schema if not exists patifaria_private;
revoke all on schema patifaria_private from public, anon, authenticated;
create table patifaria_private.rooms(code text primary key, state jsonb not null, updated_at timestamptz not null default now());
alter table patifaria_private.rooms enable row level security;
create or replace function public.patifaria_storage(backend_key text, operation text, room_code text, new_state jsonb default null, expected_revision integer default -1)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb; affected integer;
begin
if encode(extensions.digest(backend_key,'sha256'),'hex') is distinct from 'BACKEND_KEY_SHA256' then raise exception 'Access denied'; end if;
if room_code !~ '^[A-Z2-9]{5}$' then raise exception 'Invalid code'; end if;
if operation='get' then
select state into result from patifaria_private.rooms where code=room_code and updated_at>now()-interval '48 hours';
return result;
elsif operation='create' then
delete from patifaria_private.rooms where updated_at<now()-interval '48 hours';
insert into patifaria_private.rooms(code,state) values(room_code,new_state) on conflict do nothing;
get diagnostics affected=row_count; return to_jsonb(affected=1);
elsif operation='save' then
update patifaria_private.rooms set state=new_state,updated_at=now() where code=room_code and (state->>'revision')::integer=expected_revision;
get diagnostics affected=row_count;return to_jsonb(affected=1);
else raise exception 'Invalid operation';end if;
end;$fn$;
revoke all on function public.patifaria_storage(text,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.patifaria_storage(text,text,text,jsonb,integer) to anon;
