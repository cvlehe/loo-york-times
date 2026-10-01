-- Allow the editorial desk to publish full articles alongside external links.

alter table public.articles
  add column article_type text not null default 'external'
    check (article_type in ('external', 'internal')),
  add column body text,
  alter column url drop not null;

alter table public.articles
  add constraint articles_content_matches_type_check check (
    (article_type = 'external' and url is not null and body is null)
    or
    (article_type = 'internal' and url is null and body is not null and btrim(body) <> '' and char_length(body) <= 50000)
  );

comment on column public.articles.article_type is
  'Whether this is an external link or an article published on this site.';
comment on column public.articles.body is
  'Plain-text body for articles published on this site.';
