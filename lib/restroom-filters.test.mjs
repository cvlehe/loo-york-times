import assert from "node:assert/strict";
import test from "node:test";

import { accessibilityCategory, hasChangingStation, isOpenAt } from "./restroom-filters.ts";

const listing = (hours_text, overrides = {}) => ({
  hours_text,
  source_status: "Operational",
  source_availability: "Year Round",
  ...overrides,
});

test("currently open follows New York time and excludes the closing minute", () => {
  const hours = listing("8am-4pm, Open later seasonally");
  assert.equal(isOpenAt(hours, new Date("2026-10-29T11:59:00Z")), false);
  assert.equal(isOpenAt(hours, new Date("2026-10-29T12:00:00Z")), true);
  assert.equal(isOpenAt(hours, new Date("2026-10-29T20:00:00Z")), false);
  assert.equal(isOpenAt(hours, new Date("2026-01-08T13:00:00Z")), true);
  assert.equal(isOpenAt(listing("6am-1am"), new Date("2026-10-30T04:30:00Z")), true);
});

test("weekly schedules use the current weekday and can cross midnight", () => {
  const weekly = listing("Wednesday: Closed\nThursday: 8 pm - 1 am\nFriday: Closed");
  assert.equal(isOpenAt(weekly, new Date("2026-10-30T03:00:00Z")), true);
  assert.equal(isOpenAt(weekly, new Date("2026-10-30T05:00:00Z")), false);
  assert.equal(isOpenAt(weekly, new Date("2026-10-30T22:00:00Z")), false);
});

test("uncertain schedules and non-operational or seasonal listings are not marked open", () => {
  const now = new Date("2026-10-29T15:00:00Z");
  assert.equal(isOpenAt(listing("Park Hours"), now), false);
  assert.equal(isOpenAt(listing("Bathrooms are open from 7 a.m.-7 p.m., with a closure for cleaning"), now), false);
  assert.equal(isOpenAt(listing("10pm-7pm"), now), false);
  assert.equal(isOpenAt(listing("24 Hours", { source_status: "Closed" }), now), false);
  assert.equal(isOpenAt(listing("24 Hours", { source_availability: "Seasonal" }), now), false);
  assert.equal(isOpenAt(listing("24 Hours"), now), true);
});

test("accessibility and changing station filters use explicit listing details", () => {
  assert.equal(accessibilityCategory("Fully Accessible"), "fully");
  assert.equal(accessibilityCategory("Limited Accessibility"), "partially");
  assert.equal(accessibilityCategory("Not Accessible"), "not");
  assert.equal(accessibilityCategory(null), null);
  assert.equal(hasChangingStation("Yes, in women's restroom only"), true);
  assert.equal(hasChangingStation("Changing station available"), true);
  assert.equal(hasChangingStation("No"), false);
  assert.equal(hasChangingStation("N/A, restrooms closed"), false);
});
