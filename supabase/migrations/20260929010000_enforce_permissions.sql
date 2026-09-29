-- Task 05: row-level permissions for public data, contributors, and admins.

create function public.is_admin(candidate_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = candidate_user_id
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Profiles are private companion records. A contributor can see their own
-- profile; admins can inspect all profiles when supporting editorial flows.
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_admin_all
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Contributors can discover their own role for navigation. Only an admin may
-- manage role assignments through the application-facing database role.
create policy user_roles_select_own
on public.user_roles for select
to authenticated
using (user_id = auth.uid());

create policy user_roles_admin_all
on public.user_roles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Visitors can read only published listings. Drafts, archived records, import
-- lineage, and editorial changes remain administrator-only.
create policy restrooms_public_select_published
on public.restrooms for select
to anon, authenticated
using (publication_status = 'published');

create policy restrooms_admin_all
on public.restrooms for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Reviews are public only when their listing is public. Contributors may add
-- or edit their own review, but only admins may remove reviews.
create policy reviews_public_select_for_published_restrooms
on public.reviews for select
to anon, authenticated
using (
  exists (
    select 1
    from public.restrooms
    where restrooms.id = reviews.restroom_id
      and restrooms.publication_status = 'published'
  )
);

create policy reviews_insert_own_for_published_restrooms
on public.reviews for insert
to authenticated
with check (
  contributor_id = auth.uid()
  and exists (
    select 1
    from public.restrooms
    where restrooms.id = reviews.restroom_id
      and restrooms.publication_status = 'published'
  )
);

create policy reviews_update_own_for_published_restrooms
on public.reviews for update
to authenticated
using (contributor_id = auth.uid())
with check (
  contributor_id = auth.uid()
  and exists (
    select 1
    from public.restrooms
    where restrooms.id = reviews.restroom_id
      and restrooms.publication_status = 'published'
  )
);

create policy reviews_admin_select
on public.reviews for select
to authenticated
using (public.is_admin());

create policy reviews_admin_delete
on public.reviews for delete
to authenticated
using (public.is_admin());

-- A contributor can create and read only their own pending submissions.
-- Approval, rejection, and all cross-user access are administrator-only.
create policy submissions_select_own
on public.submissions for select
to authenticated
using (contributor_id = auth.uid());

create policy submissions_insert_own_pending
on public.submissions for insert
to authenticated
with check (
  contributor_id = auth.uid()
  and status = 'pending'
  and rejection_reason is null
  and duplicate_restroom_id is null
  and published_restroom_id is null
  and reviewed_by is null
  and reviewed_at is null
);

create policy submissions_admin_all
on public.submissions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Import audit records are never exposed publicly or to ordinary contributors.
create policy import_batches_admin_all
on public.import_batches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy import_rows_admin_all
on public.import_rows for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select on public.restrooms to anon, authenticated;
grant insert, update, delete on public.restrooms to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.import_batches to authenticated;
grant select, insert, update, delete on public.import_rows to authenticated;

-- Objects created through the SQL editor do not necessarily inherit the
-- platform's usual service-role grants. The server-only importer needs these
-- privileges; service_role still remains unavailable to browser clients.
grant all on table public.profiles to service_role;
grant all on table public.user_roles to service_role;
grant all on table public.restrooms to service_role;
grant all on table public.import_batches to service_role;
grant all on table public.import_rows to service_role;
grant all on table public.reviews to service_role;
grant all on table public.submissions to service_role;
