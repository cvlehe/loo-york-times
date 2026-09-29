# Persistent data model

This document records Task 04 of the implementation plan. The executable schema
is in `supabase/migrations/`. The first migration defines the model; the second
creates and backfills application profiles for Supabase Auth users.

Both migrations were applied to Supabase project `wwdjjxtgdrpgerhyyrzo` on
September 28, 2026 through the SQL editor. The live catalog check confirmed all
seven tables have RLS enabled, and a rolled-back behavioral check confirmed that
ratings outside 1-5 and a second review for the same contributor/restroom pair
are rejected. This repository has not initialized the Supabase CLI migration
history; when the CLI is introduced, mark these two baseline versions as applied
before running `db push` against the existing project.

## Model boundaries

- `auth.users` owns authentication identities. `profiles` is the
  application-owned companion record and deliberately does not copy email.
- `user_roles` stores explicit administrator assignments. Ordinary contributors
  have no role row.
- `restrooms` stores editorial listings. Source operating status, ownership
  eligibility, and publication status are separate decisions.
- `import_batches` identifies an immutable source-file snapshot by its SHA-256.
  `import_rows` preserves every raw row, its snapshot-scoped fingerprint and
  duplicate occurrence, normalized data, outcome, and any resulting listing.
- `reviews` stores one current 1-5-star review per contributor and restroom.
  Editing the row changes the review without increasing the count.
- `submissions` stores a contributor proposal independently of any listing. An
  approved submission links to exactly one resulting listing; a rejected
  duplicate may link to an existing listing.

## Database-enforced invariants

- A review rating is between 1 and 5, and
  `(contributor_id, restroom_id)` is unique.
- Optional source and derived restroom fields are nullable. Unknown hours,
  accessibility, address, neighborhood, or normalized labels remain `null`.
- Latitude and longitude are both present or both absent and stay within global
  coordinate ranges. The narrower NYC boundary check belongs in the importer.
- A published listing must be eligible, have coordinates, and have a publication
  timestamp.
- A completed import batch reconciles accepted, skipped, and quarantined rows to
  the expected row count.
- Import outcomes have consistent links: accepted rows have a restroom,
  duplicate rows identify the earlier row, and quarantined rows have a reason.
- A submission requires either an address or a coordinate pair plus an ownership
  explanation. Pending, approved, and rejected records each enforce the fields
  appropriate to that state.

## Task boundary

All application tables have row-level security enabled without policies. This is
intentional fail-closed behavior. Task 05 will add and test public, contributor,
owner, and administrator policies, then execute the reconciled CSV import.

The import still depends on the editorial decisions listed in
`docs/public-restrooms-import-assessment.md`: the eligibility decision table,
the treatment of non-operational records, the address/neighborhood enrichment
source, and whether an immutable upstream record ID can be obtained.
