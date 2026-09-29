-- Keep the application-owned user record synchronized with Supabase Auth.

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, created_at, updated_at)
  values (new.id, new.created_at, new.created_at)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Authentication work may have created users before this migration existed.
insert into public.profiles (id, created_at, updated_at)
select id, created_at, created_at
from auth.users
on conflict (id) do nothing;
