# Permissions and public-restroom import

This document records the Task 05 implementation and the first import of
`Public_Restrooms_20260928.csv`.

## Live database state

The row-level security migration was applied to Supabase project
`wwdjjxtgdrpgerhyyrzo` on September 28, 2026. The live catalog contains policies
for all seven application tables:

- published restroom listings and their reviews are publicly readable;
- contributors may create and edit only their own review for a published listing;
- contributors may create a pending submission and read only their own submissions;
- only administrators may change listings, remove reviews, make submission
  decisions, manage roles, or inspect import records;
- profiles are visible to their owner and administrators; and
- import tables remain private to administrators and the server-only service role.

An anonymous API probe confirmed that the current draft listings are not public,
an anonymous listing insert is denied with PostgreSQL error `42501`, and anonymous
submission reads are denied. A temporary-account verification also confirmed
owner-only submission reads, denied ordinary-user submission updates, denied edits
to another contributor's review, administrator listing updates, and administrator
review removal. The verification removes its users and records in a `finally`
cleanup block.

## Imported snapshot

Import batch `35322cee-e8fb-42bf-a5a2-420eafa08ee9` completed with these mutually
exclusive outcomes:

| Outcome | Rows |
| --- | ---: |
| Accepted as draft listings | 1,062 |
| Skipped exact duplicates | 2 |
| Quarantined conflicts | 2 |
| Total source rows | 1,066 |

The skipped rows are source rows 797 and 1,001, duplicates of rows 540 and 705.
The quarantined rows are 83 and 422, conflicting records for Tompkins Square Park
at the same coordinates. Every source row is preserved in `import_rows` with its
raw values, normalized values when valid, outcome, and reason.

All 1,062 listings were intentionally imported with `eligibility = 'pending'` and
`publication_status = 'draft'`. The import does not infer city ownership from the
dataset. Consequently, the public listing count remains zero until an administrator
records eligibility evidence and publishes approved records.

The source contains one `Limited Accessibility` value that has no exact Task 04
enum. Its raw label is preserved and its normalized accessibility remains unknown.

## Safe reruns

The importer identifies the immutable snapshot by source name and SHA-256. Row and
listing UUIDs are deterministic within that snapshot. Re-running the completed
snapshot exits without creating rows. A verified second run reported the existing
batch and the same 1,062 / 2 / 2 reconciliation.

Run a local validation without database access:

```bash
npm run import:restrooms -- --dry-run Public_Restrooms_20260928.csv
```

Run the live import only from a trusted server environment with the service-role
key set in the gitignored `.env.local` file:

```bash
npm run import:restrooms -- Public_Restrooms_20260928.csv
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code or prefix it with
`NEXT_PUBLIC_`.

Re-run the temporary-account permission verification with:

```bash
npm run verify:permissions
```

## Editorial work still required

Before publishing imported listings, Reagin must approve the repeatable
operator/location-type eligibility decision table and confirm the treatment of
non-operational records. The team must also choose an address and neighborhood
enrichment source. The current import preserves all source records while leaving
those decisions open.
