-- Task 13: approve a submission and publish its listing atomically.
--
-- The submission row is locked before its status is inspected. Concurrent or
-- repeated approval calls therefore return the already-linked listing instead
-- of creating a second restroom.

create function public.approve_submission(
  p_submission_id uuid,
  p_name text,
  p_address_text text,
  p_latitude numeric,
  p_longitude numeric,
  p_city_ownership_explanation text,
  p_hours_text text,
  p_restroom_type text,
  p_accessibility_notes text,
  p_changing_station_notes text,
  p_additional_notes text,
  p_website_url text
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  submission_record public.submissions%rowtype;
  published_id uuid;
  reviewer_id uuid := auth.uid();
  reviewed_at timestamptz := statement_timestamp();
begin
  if reviewer_id is null or not public.is_admin(reviewer_id) then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select *
  into submission_record
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if submission_record.status = 'approved' then
    return submission_record.published_restroom_id;
  end if;

  if submission_record.status <> 'pending' then
    raise exception 'Only pending submissions can be approved' using errcode = '22023';
  end if;

  if nullif(btrim(p_name), '') is null
    or nullif(btrim(p_city_ownership_explanation), '') is null
    or p_latitude is null
    or p_longitude is null then
    raise exception 'Approved submissions require a name, eligibility evidence, and coordinates'
      using errcode = '23514';
  end if;

  insert into public.restrooms (
    name,
    address_text,
    latitude,
    longitude,
    hours_text,
    source_accessibility,
    restroom_type,
    changing_station_notes,
    additional_notes,
    website_url,
    eligibility,
    eligibility_evidence,
    eligibility_reviewed_by,
    eligibility_reviewed_at,
    publication_status,
    published_at,
    created_by,
    updated_by
  ) values (
    btrim(p_name),
    nullif(btrim(p_address_text), ''),
    p_latitude,
    p_longitude,
    nullif(btrim(p_hours_text), ''),
    nullif(btrim(p_accessibility_notes), ''),
    nullif(btrim(p_restroom_type), ''),
    nullif(btrim(p_changing_station_notes), ''),
    nullif(btrim(p_additional_notes), ''),
    nullif(btrim(p_website_url), ''),
    'eligible',
    btrim(p_city_ownership_explanation),
    reviewer_id,
    reviewed_at,
    'published',
    reviewed_at,
    reviewer_id,
    reviewer_id
  )
  returning id into published_id;

  update public.submissions
  set
    name = btrim(p_name),
    address_text = nullif(btrim(p_address_text), ''),
    latitude = p_latitude,
    longitude = p_longitude,
    city_ownership_explanation = btrim(p_city_ownership_explanation),
    hours_text = nullif(btrim(p_hours_text), ''),
    restroom_type = nullif(btrim(p_restroom_type), ''),
    accessibility_notes = nullif(btrim(p_accessibility_notes), ''),
    changing_station_notes = nullif(btrim(p_changing_station_notes), ''),
    additional_notes = nullif(btrim(p_additional_notes), ''),
    website_url = nullif(btrim(p_website_url), ''),
    status = 'approved',
    rejection_reason = null,
    duplicate_restroom_id = null,
    published_restroom_id = published_id,
    reviewed_by = reviewer_id,
    reviewed_at = reviewed_at
  where id = p_submission_id;

  return published_id;
end;
$$;

revoke all on function public.approve_submission(
  uuid, text, text, numeric, numeric, text, text, text, text, text, text, text
) from public;

grant execute on function public.approve_submission(
  uuid, text, text, numeric, numeric, text, text, text, text, text, text, text
) to authenticated;

