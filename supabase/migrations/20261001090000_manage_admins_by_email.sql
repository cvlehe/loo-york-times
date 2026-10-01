-- Task 18: let administrators manage administrator assignments by email without
-- exposing auth.users to the application client.

create or replace function public.list_admins()
returns table (
  user_id uuid,
  email text,
  granted_at timestamptz,
  granted_by uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  return query
  select roles.user_id, users.email::text, roles.granted_at, roles.granted_by
  from public.user_roles as roles
  join auth.users as users on users.id = roles.user_id
  where roles.role = 'admin'
  order by lower(users.email), roles.granted_at;
end;
$$;

create or replace function public.grant_admin_by_email(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  normalized_email text := lower(btrim(p_email));
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  select users.id into target_user_id
  from auth.users as users
  where lower(users.email) = normalized_email;

  if target_user_id is null then
    raise exception 'No account exists for that email address.' using errcode = 'P0002';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You already have administrator access.' using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user_id, 'admin', auth.uid())
  on conflict (user_id, role) do nothing;

  if found then
    return 'added';
  end if;

  return 'already_admin';
end;
$$;

create or replace function public.revoke_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  -- Serialize revocations so two requests cannot remove the final two admins.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('public.user_roles:admin', 0));

  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  select users.id into target_user_id
  from auth.users as users
  where lower(users.email) = lower(btrim(p_email));

  if target_user_id is null or not exists (
    select 1 from public.user_roles where user_id = target_user_id and role = 'admin'
  ) then
    raise exception 'That account is not an administrator.' using errcode = 'P0002';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot remove your own administrator access.' using errcode = '22023';
  end if;

  if (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'At least one administrator must remain.' using errcode = '23514';
  end if;

  delete from public.user_roles
  where user_id = target_user_id and role = 'admin';
end;
$$;

-- Role reads remain available for a signed-in user to discover their own access.
-- All role mutations now go through the guarded functions above.
drop policy user_roles_admin_all on public.user_roles;
revoke insert, update, delete on public.user_roles from authenticated;

revoke all on function public.list_admins() from public;
revoke all on function public.grant_admin_by_email(text) from public;
revoke all on function public.revoke_admin_by_email(text) from public;
grant execute on function public.list_admins() to authenticated;
grant execute on function public.grant_admin_by_email(text) to authenticated;
grant execute on function public.revoke_admin_by_email(text) to authenticated;
