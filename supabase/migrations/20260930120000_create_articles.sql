-- Task 15: persistent public article links with administrator-only creation.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  url text not null check (char_length(url) <= 2048 and url ~* '^https?://'),
  image_url text check (
    image_url is null
    or (char_length(image_url) <= 2048 and image_url ~* '^https?://')
  ),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default statement_timestamp()
);

comment on table public.articles is
  'Public journalism links entered by administrators; article bodies remain outside this application.';

create index articles_created_at_idx on public.articles (created_at desc);

alter table public.articles enable row level security;

create policy articles_public_select
on public.articles for select
to anon, authenticated
using (true);

create policy articles_admin_all
on public.articles for all
to authenticated
using (public.is_admin())
with check (public.is_admin() and created_by = auth.uid());

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant all on table public.articles to service_role;
