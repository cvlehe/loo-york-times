import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isTrackedPath, sanitizeAnalyticsEvent, trackEvent } from "./analytics.ts";

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
function browser(path = "/", privacy = {}) {
  const calls = [];
  globalThis.window = { location: { pathname: path }, va: (...args) => calls.push(args) };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: privacy });
  return calls;
}
afterEach(() => {
  delete globalThis.window;
  Object.defineProperty(globalThis, "navigator", originalNavigator);
});

test("public views and custom events strip auth/query/fragment data", () => {
  browser();
  for (const type of ["pageview", "event"]) {
    assert.deepEqual(sanitizeAnalyticsEvent({ type, url: "https://loo.example/login?email=private@example.com&code=secret#token" }),
      { type, url: "https://loo.example/login" });
  }
  assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: "bad-url" }), null);
});
test("admin, callbacks, and unrecognized routes never emit", () => {
  for (const path of ["/admin", "/admin/articles/new", "/auth/callback", "/unknown"]) {
    const calls = browser(path);
    assert.equal(isTrackedPath(path), false);
    assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: `https://loo.example${path}?code=secret` }), null);
    trackEvent("form_result", { form: "review", status: "success" });
    assert.deepEqual(calls, []);
  }
});
test("DNT and GPC suppress both page views and custom events", () => {
  for (const privacy of [{ doNotTrack: "1" }, { globalPrivacyControl: true }]) {
    const calls = browser("/", privacy);
    trackEvent("location_result", { status: "located" });
    assert.deepEqual(calls, []);
    assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: "https://loo.example/" }), null);
  }
});
test("forwards useful aggregate properties without requiring identity", () => {
  const calls = browser();
  trackEvent("directory_searched", { has_query: true, result_count: 0 });
  assert.deepEqual(calls, [["event", { name: "directory_searched", data: { has_query: true, result_count: 0 }, options: undefined }]]);
});
test("unavailable analytics and server rendering cannot break product actions", () => {
  browser();
  window.va = () => { throw new Error("blocked"); };
  assert.doesNotThrow(() => trackEvent("directions_clicked", {}));
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent("directions_clicked", {}));
});
