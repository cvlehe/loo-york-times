# Public restrooms CSV import assessment

This document completes Task 02 of the implementation plan for
`Public_Restrooms_20260928.csv`.

## Source snapshot

- File: `Public_Restrooms_20260928.csv`
- SHA-256: `6cb372aa93b755d8c6d3d7c51b48d035eadc757c2f4220b37f3732330d23108f`
- Encoding: UTF-8 without a byte-order mark
- CSV format: comma-delimited, double-quoted fields, CRLF record endings
- Parsed records: 1,066, excluding the header
- Columns: 14
- Physical lines: 2,275 because quoted fields contain line breaks
- Malformed records: 0

The importer must use a real CSV parser. It must not split records on line breaks.

## Field mapping

The target names below define the staging/import contract. Task 04 may place these
fields into one or more persistent tables, but it should preserve the raw source
values for audit and reprocessing.

| CSV column | Proposed target | Required | Transform and validation |
| --- | --- | --- | --- |
| `Facility Name` | `name` | Yes | Trim surrounding whitespace. Reject an empty value. Do not treat the name as a unique key. |
| `Location Type` | `source_location_type` | Yes | Preserve the raw value and map to a controlled source enum: `park`, `library`, `privately_owned_public_space`, `public_plaza`, or `transit`. This field is evidence, not proof, of project eligibility. |
| `Operator` | `source_operator` | Yes | Preserve the raw value. Apply aliases only in a separate normalized value; for example, `NYC DOT/JCDeceaux` appears to be a spelling variant of `NYC DOT/JCDecaux`, and `Boston Properties` / `Boston Properties Inc.` may be the same operator. Do not merge without review. |
| `Status` | `source_status` | Yes | Map `Operational`, `Not Operational`, `Closed for Construction`, and `Closed` to a controlled enum. Keep publication eligibility separate from operating status. |
| `Open` | `availability_type` | No | Map `Year Round`, `Seasonal`, and `Future` to a controlled enum. Store blank as null, not as `Year Round`. |
| `Hours of Operation` | `hours_text` | No | Preserve human-readable text. Normalize CRLF/CR to LF and tabs to readable spacing or line breaks. Do not attempt to infer structured daily hours during this import. Blank becomes null and must display as unknown. |
| `Accessibility` | `source_accessibility` | No | Preserve the source value and map its four labels to a controlled enum. Detailed accessibility modeling is outside the approved demonstration scope. Blank remains unknown. |
| `Restroom Type` | `restroom_type` | No | Preserve the raw value and normalize the `Single -Stall...` spelling variant to `Single-Stall...` in a separate canonical value. Blank remains unknown. |
| `Changing Stations` | `changing_station_notes` | No | Strip the unintended enclosing quote characters present in four source labels (144 records), then preserve the resulting text. A simple boolean would lose men-only, women-only, and single-stall-only qualifications. Blank remains unknown. |
| `Additional Notes` | `additional_notes` | No | Preserve text after normalizing embedded line endings. Do not parse fees, keys, entrances, or outages into invented facts. |
| `Website` | `website_url` | No | Trim and require an absolute `http` or `https` URL when present. Blank becomes null. |
| `Latitude` | `latitude` | Yes | Parse as a finite decimal in `[-90, 90]`; also require it to be within the agreed NYC service boundary. |
| `Longitude` | `longitude` | Yes | Parse as a finite decimal in `[-180, 180]`; also require it to be within the agreed NYC service boundary. |
| `Location` | `source_location_wkt` | Yes for validation | Parse `POINT (longitude latitude)` and require it to agree with the numeric coordinate columns. The numeric columns should be the application coordinates. |

## Information not supplied

| Needed information | Finding | Resolution path |
| --- | --- | --- |
| Stable source record ID | No ID column is present. | Prefer a new export that includes the source system's immutable record ID. Until then, identify an import batch by the file SHA-256 and identify rows within that exact snapshot by a canonical row fingerprint plus duplicate occurrence. This makes rerunning the same file safe, but it must not be presented as durable identity across changed exports. |
| Street address or entrance instructions | No address column is present. | Reverse-geocode coordinates into separately labeled derived fields, record the provider and lookup date, and send uncertain results for editorial confirmation. Keep null if no reliable address is returned. Never replace the source coordinates with geocoder coordinates. |
| Neighborhood | No neighborhood, borough, or community-district column is present. | Derive a neighborhood from an agreed boundary dataset or geocoding provider, record its provenance, and permit editorial correction. Until enrichment is complete, search can cover names but not neighborhoods. |
| Ownership or city-building evidence | `Operator` and `Location Type` are the only relevant columns; neither proves ownership. | Reagin must approve a repeatable operator/location-type decision table. Store the decision, reviewer, date, and evidence. Rows without a decision stay unpublished. |
| Reliable structured opening hours | Hours are free text in 145 distinct nonblank forms. | Import as display text for the demonstration. Treat structured weekly hours as a later editorial cleanup, not as an inferred import field. |

No coordinates are missing in this snapshot. If a future row lacks valid
coordinates, quarantine it with a reason and obtain corrected coordinates from the
source owner or an editor before publication.

## Data profile and findings

### Coverage

| Field | Missing | Nonblank |
| --- | ---: | ---: |
| Facility name | 0 | 1,066 |
| Location type | 0 | 1,066 |
| Operator | 0 | 1,066 |
| Status | 0 | 1,066 |
| Open | 73 | 993 |
| Hours of operation | 93 | 973 |
| Accessibility | 175 | 891 |
| Restroom type | 144 | 922 |
| Changing stations | 86 | 980 |
| Additional notes | 995 | 71 |
| Website | 838 | 228 |
| Latitude | 0 | 1,066 |
| Longitude | 0 | 1,066 |
| Location WKT | 0 | 1,066 |

Ten operational records have no hours. The product must show their hours as
unknown rather than assuming they are closed or always open.

### Coordinates

- All 1,066 latitude and longitude values parse as finite numbers.
- Latitude range: `40.50228` to `40.903731`.
- Longitude range: `-74.2517` to `-73.7096`.
- All coordinates fall inside the broad validation box `40.49..40.93` latitude
  and `-74.27..-73.68` longitude. This box is only a corruption check, not proof
  that a point is within New York City.
- All 1,066 WKT points parse, use longitude-first order, and exactly match the
  numeric coordinate columns.

Before production import, replace the broad box with an agreed NYC boundary or
borough polygon check. Boundary failures should be quarantined rather than silently
corrected.

### Duplicate signals

The CSV contains two exact duplicate pairs, using 1-based data-record numbers
that exclude the header:

- Records 540 and 797: `Ancient Playground`.
- Records 705 and 1001: `Heckscher Playground`.

One same-name/same-coordinate pair conflicts:

- Records 83 and 422: `Tompkins Square Park` at `40.72683, -73.9814`.
  Record 83 is operational with year-round hours; record 422 is not operational
  with blank availability and hours.

One coordinate is shared by different names:

- Record 2, `Carl Schurz Main Lawn`, and record 1,060, `Catbird Playground`,
  both use `40.77358, -73.945`.

There are 25 case-insensitive duplicate-name groups containing 51 records. Many
have different coordinates and may represent distinct facilities or zones. Name
alone must never drive deduplication.

Import handling:

1. Skip the later copy of each exact duplicate and log it as a duplicate of the
   accepted record.
2. Quarantine the Tompkins Square Park conflict until an editor selects the current
   record or confirms that both represent separate facilities.
3. Flag the shared Carl Schurz/Catbird coordinate and all remaining duplicate-name
   groups for review, but do not merge them automatically.
4. Record every accepted, skipped, and quarantined row so totals reconcile to
   1,066.

### Eligibility review

The operator/location-type combinations are:

- 728 `NYC Parks` park records.
- 71 `NYC Parks Concessionaire` park records.
- 216 library records: 91 NYPL, 63 QPL, and 62 BPL.
- 7 public-plaza records labeled `NYC DOT/JCDecaux` or the `JCDeceaux` variant.
- 25 other park records operated by authorities, conservancies, partnerships,
  private developers, or park organizations.
- 14 privately owned public-space records.
- 5 transit records.

Do not infer eligibility from a public-restroom dataset, an operator name, or the
word `Public`. Reagin should approve the following policy before rows publish:

| Review bucket | Proposed action |
| --- | --- |
| `NYC Parks` | Confirm once whether this operator is sufficient evidence of city operation, then apply the approved rule consistently. |
| Parks concessionaires and park organizations | Require evidence that the restroom is inside a city-owned park/building or is city-operated. |
| NYPL, QPL, and BPL | Confirm city ownership for the specific building or approve a documented source that establishes eligibility. |
| DOT/JCDecaux public plazas | Confirm whether the facility is city-operated or on/in city-owned property. |
| Privately owned public spaces | Hold unpublished unless specific evidence shows the restroom itself meets the approved city-operation/city-ownership rule. |
| Transit | Hold unpublished until the operator and property satisfy the approved rule. |
| All other operators | Review individually and attach the evidence used for the decision. |

Eligibility and operating status are separate decisions. The source contains 975
operational, 73 not-operational, 17 closed-for-construction, and 1 closed record.
The recommended import behavior is to retain accepted non-operational records for
audit/editorial maintenance but publish only records that are both ownership-
eligible and operational. Reagin should confirm this publication rule.

### Normalization cautions

- `Hours of Operation` contains embedded line breaks in 201 records and tabs in 56.
- `Additional Notes` contains embedded line breaks in 2 records.
- `Restroom Type` has 3 records using `Single -Stall...` instead of
  `Single-Stall...`.
- Four `Changing Stations` labels (144 records) include literal enclosing quote
  characters after CSV parsing; normalize those characters without collapsing the
  label to a boolean.
- Operator spellings include `NYC DOT/JCDecaux` and `NYC DOT/JCDeceaux`, plus
  `Boston Properties` and `Boston Properties Inc.` Preserve raw values even if a
  canonical alias is approved.
- All 228 nonblank website values begin with `http://` or `https://`.
- `Open` and `Status` must remain distinct. For example, 132 operational records
  are seasonal, while closed-for-construction records use both `Future` and
  `Year Round`.

## Import-validation checklist

### File and parser

- [ ] Verify the input SHA-256 and record it on the import batch.
- [ ] Decode as UTF-8 and fail on invalid bytes rather than replacing them silently.
- [ ] Parse with an RFC 4180-capable CSV parser that preserves quoted multiline
      fields.
- [ ] Require the exact 14-column header set. Reject duplicate, missing, or unknown
      headers until a mapping change is reviewed.
- [ ] Confirm the parser yields 1,066 data records for this snapshot and no extra
      cells.
- [ ] Preserve each raw source row or its canonical representation for audit.

### Row validation

- [ ] Require nonblank facility name, location type, operator, status, latitude,
      longitude, and WKT location.
- [ ] Parse coordinates as finite decimals and validate numeric ranges.
- [ ] Validate each point against the agreed NYC boundary.
- [ ] Parse WKT as `POINT (longitude latitude)` and require agreement with the
      numeric columns.
- [ ] Validate controlled source labels; quarantine new labels instead of guessing
      a mapping.
- [ ] Normalize only documented spelling/format variants while retaining raw values.
- [ ] Normalize embedded control characters for display without breaking CSV rows.
- [ ] Validate nonblank websites as absolute HTTP(S) URLs.
- [ ] Store missing optional values as null. Do not convert unknown hours,
      accessibility, facilities, or changing-station information into false values.

### Eligibility and publication

- [ ] Obtain Reagin's approval for the operator/location-type eligibility table.
- [ ] Store eligibility as an explicit decision with evidence, reviewer, and date;
      do not calculate it transiently from display fields.
- [ ] Keep undecided or ineligible rows unpublished.
- [ ] Confirm whether only operational records may publish; keep operating status
      separate from ownership eligibility.
- [ ] Quarantine future rows with missing/invalid coordinates until corrected by a
      trusted source or editor.
- [ ] Add derived address and neighborhood provenance and editorial-review states.

### Duplicates and reruns

- [ ] Skip and log the two exact duplicate pairs.
- [ ] Resolve the Tompkins Square Park status conflict before publication.
- [ ] Review the Carl Schurz/Catbird shared coordinate and the other duplicate-name
      groups without automatically merging them.
- [ ] Use the immutable upstream source ID if one can be obtained.
- [ ] Until then, use the file hash plus canonical row fingerprint/occurrence for
      same-snapshot idempotency and document that cross-export identity is not
      guaranteed.
- [ ] Upsert or skip deterministically so rerunning the same snapshot creates no
      additional listings.

### Reconciliation

- [ ] Produce counts for accepted, skipped-as-duplicate, quarantined, ineligible,
      unpublished-by-status, and published records.
- [ ] Require mutually exclusive row outcomes whose total equals 1,066.
- [ ] Save row-level reasons for every skipped or quarantined record.
- [ ] Spot-check records with multiline hours, missing optional values, each source
      enum, each eligibility bucket, and every duplicate category.
- [ ] After import, compare database coordinates and displayed text with the source
      for representative records.

## Decisions required before Task 05

1. Reagin must approve the eligibility evidence and decision table.
2. Reagin must confirm whether non-operational records are retained unpublished or
   excluded entirely.
3. The team must choose the address/neighborhood derivation source and editorial
   correction workflow.
4. If possible, obtain a replacement export containing an immutable upstream record
   ID; otherwise accept the documented limitation of snapshot-scoped identity.
