import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";

export const EXPECTED_HEADERS = [
  "Facility Name",
  "Location Type",
  "Operator",
  "Status",
  "Open",
  "Hours of Operation",
  "Accessibility",
  "Restroom Type",
  "Changing Stations",
  "Additional Notes",
  "Website",
  "Latitude",
  "Longitude",
  "Location",
];

const LOCATION_TYPES = new Map([
  ["Park", "park"],
  ["Library", "library"],
  ["Privately Owned Public Space", "privately_owned_public_space"],
  ["Public Plaza", "public_plaza"],
  ["Transit", "transit"],
]);

const OPERATING_STATUSES = new Map([
  ["Operational", "operational"],
  ["Not Operational", "not_operational"],
  ["Closed for Construction", "closed_for_construction"],
  ["Closed", "closed"],
]);

const AVAILABILITY_TYPES = new Map([
  ["Year Round", "year_round"],
  ["Seasonal", "seasonal"],
  ["Future", "future"],
]);

const ACCESSIBILITY_TYPES = new Map([
  ["Fully Accessible", "fully_accessible"],
  ["Partially Accessible", "partially_accessible"],
  ["Not Accessible", "not_accessible"],
]);

const NYC_VALIDATION_BOX = {
  minLatitude: 40.49,
  maxLatitude: 40.93,
  minLongitude: -74.27,
  maxLongitude: -73.68,
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableUuid(value) {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nullableText(value) {
  const normalized = value.replace(/\r\n?/g, "\n").replace(/\t/g, " ").trim();
  return normalized === "" ? null : normalized;
}

function normalizeChangingStations(value) {
  const normalized = nullableText(value);
  if (normalized?.startsWith('"') && normalized.endsWith('"')) {
    return normalized.slice(1, -1).trim();
  }
  return normalized;
}

function canonicalRawData(record) {
  return Object.fromEntries(EXPECTED_HEADERS.map((header) => [header, record[header]]));
}

function parseFiniteNumber(value, label) {
  if (value.trim() === "") throw new Error(`${label} is blank`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a finite number`);
  return parsed;
}

function requiredText(value, label) {
  const normalized = nullableText(value);
  if (normalized === null) throw new Error(`${label} is blank`);
  return normalized;
}

function mappedValue(map, sourceValue, label, { allowBlank = false } = {}) {
  const normalized = nullableText(sourceValue);
  if (normalized === null && allowBlank) return null;
  const mapped = map.get(normalized);
  if (!mapped) throw new Error(`${label} has an unsupported value: ${normalized ?? "blank"}`);
  return mapped;
}

function parseWebsite(value) {
  const normalized = nullableText(value);
  if (normalized === null) return null;
  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Website must use HTTP or HTTPS");
  }
  return url.href;
}

function validateWkt(value, latitude, longitude) {
  const match = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(value.trim());
  if (!match) throw new Error("Location is not valid POINT WKT");
  const wktLongitude = Number(match[1]);
  const wktLatitude = Number(match[2]);
  if (Math.abs(wktLatitude - latitude) > 1e-9 || Math.abs(wktLongitude - longitude) > 1e-9) {
    throw new Error("Location WKT does not match Latitude and Longitude");
  }
}

export function parseSourceCsv(csvBuffer) {
  const sourceText = new TextDecoder("utf-8", { fatal: true }).decode(csvBuffer);
  const rows = parse(sourceText, {
    bom: false,
    columns: (headers) => {
      if (headers.length !== EXPECTED_HEADERS.length || headers.some((header, index) => header !== EXPECTED_HEADERS[index])) {
        throw new Error(`Unexpected CSV headers. Expected: ${EXPECTED_HEADERS.join(", ")}`);
      }
      return headers;
    },
    relax_column_count: false,
    skip_empty_lines: false,
  });
  return { rows, sourceFileSha256: sha256(csvBuffer) };
}

export function normalizeSourceRecord(record) {
  const name = requiredText(record["Facility Name"], "Facility Name");
  const sourceLocationType = requiredText(record["Location Type"], "Location Type");
  const sourceOperator = requiredText(record.Operator, "Operator");
  const sourceStatus = requiredText(record.Status, "Status");
  const latitude = parseFiniteNumber(record.Latitude, "Latitude");
  const longitude = parseFiniteNumber(record.Longitude, "Longitude");

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Coordinates fall outside global ranges");
  }
  if (
    latitude < NYC_VALIDATION_BOX.minLatitude ||
    latitude > NYC_VALIDATION_BOX.maxLatitude ||
    longitude < NYC_VALIDATION_BOX.minLongitude ||
    longitude > NYC_VALIDATION_BOX.maxLongitude
  ) {
    throw new Error("Coordinates fall outside the agreed broad NYC validation box");
  }
  validateWkt(requiredText(record.Location, "Location"), latitude, longitude);

  const sourceAccessibility = nullableText(record.Accessibility);
  const accessibility = sourceAccessibility === "Limited Accessibility"
    ? null
    : mappedValue(ACCESSIBILITY_TYPES, record.Accessibility, "Accessibility", { allowBlank: true });
  const sourceRestroomType = nullableText(record["Restroom Type"]);
  const restroomType = sourceRestroomType?.replace(/^Single -Stall/, "Single-Stall") ?? null;

  return {
    name,
    source_location_type: sourceLocationType,
    location_type: mappedValue(LOCATION_TYPES, sourceLocationType, "Location Type"),
    source_operator: sourceOperator,
    operator_name: sourceOperator,
    source_status: sourceStatus,
    operating_status: mappedValue(OPERATING_STATUSES, sourceStatus, "Status"),
    source_availability: nullableText(record.Open),
    availability: mappedValue(AVAILABILITY_TYPES, record.Open, "Open", { allowBlank: true }),
    hours_text: nullableText(record["Hours of Operation"]),
    source_accessibility: sourceAccessibility,
    accessibility,
    source_restroom_type: sourceRestroomType,
    restroom_type: restroomType,
    changing_station_notes: normalizeChangingStations(record["Changing Stations"]),
    additional_notes: nullableText(record["Additional Notes"]),
    website_url: parseWebsite(record.Website),
    latitude,
    longitude,
    eligibility: "pending",
    publication_status: "draft",
  };
}

export function planImport(csvBuffer, sourceName = "NYC Public Restrooms") {
  const { rows, sourceFileSha256 } = parseSourceCsv(csvBuffer);
  const plannedRows = rows.map((rawRecord, index) => {
    const sourceRowNumber = index + 1;
    const rawData = canonicalRawData(rawRecord);
    const rowFingerprint = sha256(JSON.stringify(rawData));
    return {
      id: stableUuid(`${sourceName}|${sourceFileSha256}|row|${sourceRowNumber}`),
      sourceRowNumber,
      rawData,
      rowFingerprint,
      duplicateOccurrence: 1,
    };
  });

  const fingerprintOccurrences = new Map();
  for (const row of plannedRows) {
    const matchingRows = fingerprintOccurrences.get(row.rowFingerprint) ?? [];
    row.duplicateOccurrence = matchingRows.length + 1;
    row.duplicateOf = matchingRows[0] ?? null;
    matchingRows.push(row);
    fingerprintOccurrences.set(row.rowFingerprint, matchingRows);
  }

  for (const row of plannedRows) {
    try {
      row.normalizedData = normalizeSourceRecord(row.rawData);
      row.identityKey = `${row.normalizedData.name.toLocaleLowerCase("en-US")}|${row.normalizedData.latitude}|${row.normalizedData.longitude}`;
    } catch (error) {
      row.validationError = error instanceof Error ? error.message : String(error);
    }
  }

  const identityGroups = new Map();
  for (const row of plannedRows.filter((candidate) => !candidate.validationError && !candidate.duplicateOf)) {
    const group = identityGroups.get(row.identityKey) ?? [];
    group.push(row);
    identityGroups.set(row.identityKey, group);
  }
  const conflictingIdentityKeys = new Set(
    [...identityGroups.entries()]
      .filter(([, group]) => new Set(group.map((row) => row.rowFingerprint)).size > 1)
      .map(([key]) => key),
  );

  for (const row of plannedRows) {
    if (row.validationError) {
      row.outcome = "quarantined";
      row.outcomeReason = row.validationError;
    } else if (row.duplicateOf) {
      row.outcome = "skipped_duplicate";
      row.outcomeReason = `Exact duplicate of source row ${row.duplicateOf.sourceRowNumber}`;
    } else if (conflictingIdentityKeys.has(row.identityKey)) {
      row.outcome = "quarantined";
      row.outcomeReason = "Same normalized name and coordinates have conflicting source values";
    } else {
      row.outcome = "accepted";
      row.restroomId = stableUuid(`${sourceName}|${sourceFileSha256}|restroom|${row.rowFingerprint}|${row.duplicateOccurrence}`);
    }
  }

  const summary = {
    sourceName,
    sourceFileSha256,
    expectedRowCount: plannedRows.length,
    acceptedRowCount: plannedRows.filter((row) => row.outcome === "accepted").length,
    skippedRowCount: plannedRows.filter((row) => row.outcome === "skipped_duplicate").length,
    quarantinedRowCount: plannedRows.filter((row) => row.outcome === "quarantined").length,
  };

  if (summary.acceptedRowCount + summary.skippedRowCount + summary.quarantinedRowCount !== summary.expectedRowCount) {
    throw new Error("Import plan does not reconcile");
  }

  return { rows: plannedRows, summary };
}

export function toRestroomInsert(row) {
  return { id: row.restroomId, ...row.normalizedData };
}

export function toImportRowInsert(row, importBatchId) {
  return {
    id: row.id,
    import_batch_id: importBatchId,
    source_row_number: row.sourceRowNumber,
    source_record_id: null,
    row_fingerprint: row.rowFingerprint,
    duplicate_occurrence: row.duplicateOccurrence,
    raw_data: row.rawData,
    normalized_data: row.normalizedData ?? null,
    outcome: row.outcome,
    outcome_reason: row.outcomeReason ?? null,
    restroom_id: row.restroomId ?? null,
    duplicate_of_import_row_id: row.duplicateOf?.id ?? null,
    processed_at: new Date().toISOString(),
  };
}
