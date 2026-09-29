import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { planImport } from "./public-restrooms-import.mjs";

const source = await readFile(new URL("../../Public_Restrooms_20260928.csv", import.meta.url));

test("the supplied snapshot reconciles accepted, duplicate, and quarantined rows", () => {
  const plan = planImport(source);
  assert.deepEqual(plan.summary, {
    sourceName: "NYC Public Restrooms",
    sourceFileSha256: "6cb372aa93b755d8c6d3d7c51b48d035eadc757c2f4220b37f3732330d23108f",
    expectedRowCount: 1066,
    acceptedRowCount: 1062,
    skippedRowCount: 2,
    quarantinedRowCount: 2,
  });
  assert.deepEqual(
    plan.rows.filter((row) => row.outcome === "skipped_duplicate").map((row) => row.sourceRowNumber),
    [797, 1001],
  );
  assert.deepEqual(
    plan.rows.filter((row) => row.outcome === "quarantined").map((row) => row.sourceRowNumber),
    [83, 422],
  );
});

test("the import plan and generated IDs are stable across reruns", () => {
  const first = planImport(source);
  const second = planImport(source);
  assert.deepEqual(
    first.rows.map(({ id, restroomId, rowFingerprint, outcome }) => ({ id, restroomId, rowFingerprint, outcome })),
    second.rows.map(({ id, restroomId, rowFingerprint, outcome }) => ({ id, restroomId, rowFingerprint, outcome })),
  );
});

test("documented source normalizations preserve raw evidence", () => {
  const plan = planImport(source);
  const quotedChangingStation = plan.rows.find((row) => row.rawData["Changing Stations"].startsWith('"'));
  const restroomTypeVariant = plan.rows.find((row) => row.rawData["Restroom Type"].startsWith("Single -Stall"));
  const limitedAccessibility = plan.rows.find((row) => row.rawData.Accessibility === "Limited Accessibility");

  assert.ok(quotedChangingStation);
  assert.equal(quotedChangingStation.normalizedData.changing_station_notes.startsWith('"'), false);
  assert.ok(restroomTypeVariant);
  assert.equal(restroomTypeVariant.normalizedData.restroom_type.startsWith("Single-Stall"), true);
  assert.ok(limitedAccessibility);
  assert.equal(limitedAccessibility.normalizedData.source_accessibility, "Limited Accessibility");
  assert.equal(limitedAccessibility.normalizedData.accessibility, null);
});
