-- Task 04: persistent application data model.
-- Authorization policies and CSV import execution belong to Task 05. RLS is
-- enabled here with no policies so these tables remain closed until then.

create type public.app_role as enum ('admin');
create type public.eligibility_status as enum ('pending', 'eligible', 'ineligible');
create type public.import_batch_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.import_row_outcome as enum ('pending', 'accepted', 'skipped_duplicate', 'quarantined');
create type public.listing_status as enum ('draft', 'published', 'archived');
create type public.restroom_accessibility as enum (
  'fully_accessible',
  'partially_accessible',
  'not_accessible'
);
create type public.restroom_availability as enum ('year_round', 'seasonal', 'future');
create type public.restroom_location_type as enum (
  'park',
  'library',
  'privately_owned_public_space',
  'public_plaza',
  'transit'
);
create type public.restroom_operating_status as enum (
  'operational',
  'not_operational',
  'closed_for_construction',
  'closed'
);
create type public.submission_status as enum ('pending', 'approved', 'rejected');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

comment on table public.profiles is
  'Application-owned companion records for Supabase Auth users; email remains in auth.users.';

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default statement_timestamp(),
  granted_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

create table public.restrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),

  -- Source values are preserved beside normalized values so imports remain
  -- auditable and new source labels can stay unknown until reviewed.
  source_location_type text,
  location_type public.restroom_location_type,
  source_operator text,
  operator_name text,
  source_status text,
  operating_status public.restroom_operating_status,
  source_availability text,
  availability public.restroom_availability,
  hours_text text,
  source_accessibility text,
  accessibility public.restroom_accessibility,
  source_restroom_type text,
  restroom_type text,
  changing_station_notes text,
  additional_notes text,
  website_url text check (website_url is null or website_url ~* '^https?://'),

  address_text text,
  entrance_notes text,
  neighborhood text,
  borough text,
  latitude numeric(8, 6),
  longitude numeric(9, 6),
  address_source text,
  neighborhood_source text,

  eligibility public.eligibility_status not null default 'pending',
  eligibility_evidence text,
  eligibility_reviewed_by uuid references auth.users (id) on delete set null,
  eligibility_reviewed_at timestamptz,

  publication_status public.listing_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),

  constraint restrooms_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint restrooms_latitude_range check (
    latitude is null or latitude between -90 and 90
  ),
  constraint restrooms_longitude_range check (
    longitude is null or longitude between -180 and 180
  ),
  constraint restrooms_eligibility_decision check (
    (eligibility = 'pending' and eligibility_reviewed_by is null and eligibility_reviewed_at is null)
    or
    (eligibility <> 'pending' and eligibility_reviewed_by is not null and eligibility_reviewed_at is not null and nullif(btrim(eligibility_evidence), '') is not null)
  ),
  constraint restrooms_published_requirements check (
    publication_status <> 'published'
    or (
      published_at is not null
      and eligibility = 'eligible'
      and latitude is not null
      and longitude is not null
    )
  )
);

comment on table public.restrooms is
  'Editorial restroom listings. Source, eligibility, operating, and publication states remain independent.';

create index restrooms_publication_status_idx on public.restrooms (publication_status);
create index restrooms_location_idx on public.restrooms (latitude, longitude);
create index restrooms_name_lower_idx on public.restrooms (lower(name));

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null check (btrim(source_name) <> ''),
  source_file_name text not null check (btrim(source_file_name) <> ''),
  source_file_sha256 text not null check (source_file_sha256 ~ '^[0-9a-f]{64}$'),
  status public.import_batch_status not null default 'pending',
  expected_row_count integer check (expected_row_count is null or expected_row_count >= 0),
  accepted_row_count integer not null default 0 check (accepted_row_count >= 0),
  skipped_row_count integer not null default 0 check (skipped_row_count >= 0),
  quarantined_row_count integer not null default 0 check (quarantined_row_count >= 0),
  failure_reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (source_name, source_file_sha256),
  constraint import_batches_completion check (
    status <> 'completed'
    or (
      expected_row_count is not null
      and accepted_row_count + skipped_row_count + quarantined_row_count = expected_row_count
      and finished_at is not null
    )
  ),
  constraint import_batches_failure check (
    status <> 'failed' or nullif(btrim(failure_reason), '') is not null
  )
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches (id) on delete restrict,
  source_row_number integer not null check (source_row_number > 0),
  source_record_id text,
  row_fingerprint text not null check (row_fingerprint ~ '^[0-9a-f]{64}$'),
  duplicate_occurrence integer not null default 1 check (duplicate_occurrence > 0),
  raw_data jsonb not null check (jsonb_typeof(raw_data) = 'object'),
  normalized_data jsonb check (normalized_data is null or jsonb_typeof(normalized_data) = 'object'),
  outcome public.import_row_outcome not null default 'pending',
  outcome_reason text,
  restroom_id uuid unique references public.restrooms (id) on delete restrict,
  duplicate_of_import_row_id uuid references public.import_rows (id) on delete restrict,
  processed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  unique (import_batch_id, source_row_number),
  unique (import_batch_id, row_fingerprint, duplicate_occurrence),
  constraint import_rows_outcome_shape check (
    (outcome = 'pending' and restroom_id is null and duplicate_of_import_row_id is null and processed_at is null)
    or
    (outcome = 'accepted' and restroom_id is not null and duplicate_of_import_row_id is null and processed_at is not null)
    or
    (outcome = 'skipped_duplicate' and restroom_id is null and duplicate_of_import_row_id is not null and nullif(btrim(outcome_reason), '') is not null and processed_at is not null)
    or
    (outcome = 'quarantined' and restroom_id is null and duplicate_of_import_row_id is null and nullif(btrim(outcome_reason), '') is not null and processed_at is not null)
  ),
  constraint import_rows_not_self_duplicate check (duplicate_of_import_row_id is distinct from id)
);

create index import_rows_batch_outcome_idx on public.import_rows (import_batch_id, outcome);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  restroom_id uuid not null references public.restrooms (id) on delete restrict,
  contributor_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or btrim(comment) <> ''),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (contributor_id, restroom_id)
);

comment on table public.reviews is
  'A contributor current rating and optional comment for one restroom listing.';

create index reviews_restroom_id_idx on public.reviews (restroom_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  address_text text,
  latitude numeric(8, 6),
  longitude numeric(9, 6),
  city_ownership_explanation text not null check (btrim(city_ownership_explanation) <> ''),
  hours_text text,
  restroom_type text,
  accessibility_notes text,
  changing_station_notes text,
  additional_notes text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  status public.submission_status not null default 'pending',
  rejection_reason text,
  duplicate_restroom_id uuid references public.restrooms (id) on delete restrict,
  published_restroom_id uuid unique references public.restrooms (id) on delete restrict,
  reviewed_by uuid references auth.users (id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint submissions_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint submissions_latitude_range check (
    latitude is null or latitude between -90 and 90
  ),
  constraint submissions_longitude_range check (
    longitude is null or longitude between -180 and 180
  ),
  constraint submissions_location_required check (
    nullif(btrim(address_text), '') is not null or latitude is not null
  ),
  constraint submissions_decision_shape check (
    (
      status = 'pending'
      and rejection_reason is null
      and duplicate_restroom_id is null
      and published_restroom_id is null
      and reviewed_by is null
      and reviewed_at is null
    )
    or
    (
      status = 'approved'
      and rejection_reason is null
      and duplicate_restroom_id is null
      and published_restroom_id is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
    or
    (
      status = 'rejected'
      and nullif(btrim(rejection_reason), '') is not null
      and published_restroom_id is null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

comment on table public.submissions is
  'Contributor proposals kept separate from listings created by editorial approval.';

create index submissions_contributor_created_idx on public.submissions (contributor_id, created_at desc);
create index submissions_status_created_idx on public.submissions (status, created_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger restrooms_set_updated_at
before update on public.restrooms
for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.restrooms enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.reviews enable row level security;
alter table public.submissions enable row level security;
